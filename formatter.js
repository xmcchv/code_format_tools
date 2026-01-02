const fs = require('fs').promises;
const path = require('path');
const { execSync, exec } = require('child_process');

/**
 * 递归搜索指定目录中的文件
 * @param {string} folderPath - 要搜索的文件夹路径
 * @param {Array<string>} fileTypes - 要搜索的文件类型数组，如 ['.h', '.cpp']
 * @returns {Promise<Array<string>>} - 找到的文件路径数组
 */
async function searchFiles(folderPath, fileTypes) {
    const files = [];

    async function search(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // 跳过隐藏目录，避免搜索系统目录和缓存目录
                    if (entry.name.startsWith('.')) {
                        continue;
                    }
                    await search(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (fileTypes.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`搜索目录失败: ${dir}`, error);
            // 忽略权限错误等，继续搜索其他目录
        }
    }

    await search(folderPath);
    return files;
}

/**
 * 检查clang-format是否可用
 * @returns {boolean} - clang-format是否可用
 */
function checkClangFormat() {
    try {
        execSync('clang-format --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 使用clang-format格式化单个文件，添加超时处理
 * @param {string} filePath - 要格式化的文件路径
 * @param {number} timeout - 超时时间（毫秒），默认30秒
 * @param {Object} config - clang-format配置
 * @returns {Promise<boolean>} - 格式化是否成功
 */
async function formatFile(filePath, timeout = 30000, config = null) {
    return new Promise((resolve) => {
        let cmd;
        if (config) {
            // 转换配置选项，确保使用正确的clang-format选项名称
            const formattedConfig = {
                IndentWidth: config.indentWidth || config.IndentWidth || 2,
                TabWidth: config.tabWidth || config.TabWidth || 2,
                UseTab: config.useTab || config.UseTab || 'Never',
                SpacesInParens: config.spacesInParentheses || config.SpacesInParentheses || config.spacesInParens || config.SpacesInParens || 'Never',
                SpacesInSquareBrackets: config.spacesInSquareBrackets || config.SpacesInSquareBrackets || false,
                SpacesInAngles: config.spacesInAngles || config.SpacesInAngles || 'Never',
                SpaceBeforeParens: config.spaceBeforeParens || config.SpaceBeforeParens || 'ControlStatements',
                ColumnLimit: config.columnLimit || config.ColumnLimit || 80,
                BreakBeforeBraces: config.breakBeforeBraces || config.BreakBeforeBraces || 'Attach'
            };
            // 使用转换后的配置，正确构造JSON格式的配置字符串
            const styleConfig = JSON.stringify(formattedConfig).replace(/"/g, '\\"');
            cmd = `clang-format --style="${styleConfig}" -i "${filePath}"`;
        } else {
            // 使用默认的Google风格
            cmd = `clang-format --style=Google -i "${filePath}"`;
        }
        
        const child = exec(cmd, (error) => {
            if (error) {
                console.error(`格式化文件失败: ${filePath}`, error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
        
        // 添加超时处理，避免单个文件格式化卡住
        const timeoutId = setTimeout(() => {
            console.error(`格式化文件超时: ${filePath}`);
            child.kill(); // 终止超时的进程
            resolve(false);
        }, timeout);
        
        // 进程结束时清除超时
        child.on('exit', () => {
            clearTimeout(timeoutId);
        });
    });
}

/**
 * 格式化多个文件，添加详细的错误处理
 * @param {Array<string>} files - 要格式化的文件路径数组
 * @param {Function} progressCallback - 进度回调函数，接收 (current, total, filePath, status) 参数
 * @param {Object} config - clang-format配置
 * @returns {Promise<Object>} - 格式化结果，包含成功和失败的文件数量
 */
async function formatFiles(files, progressCallback, config = null) {
    // 检查clang-format是否可用
    if (!checkClangFormat()) {
        throw new Error('clang-format not found');
    }

    let successCount = 0;
    let failCount = 0;
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        let success = false;
        
        try {
            // 检查文件是否存在
            await fs.access(filePath, fs.constants.F_OK);
            
            // 格式化文件，添加超时处理
            success = await formatFile(filePath, 30000, config);
            
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error(`处理文件失败: ${filePath}`, error);
            failCount++;
        } finally {
            // 无论成功失败，都调用进度回调
            progressCallback(i + 1, total, filePath, success ? 'success' : 'fail');
        }
        
        // 每处理10个文件，短暂休息50ms，避免系统资源占用过高
        if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    return {
        successCount,
        failCount
    };
}

module.exports = {
    searchFiles,
    formatFiles,
    checkClangFormat
};