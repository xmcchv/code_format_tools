const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const app = require('electron').app || require('electron').remote?.app;

// 获取项目根目录
const getAppPath = () => {
    if (app) {
        return app.getAppPath();
    }
    // 当前文件在src目录下，所以需要返回上一级目录作为项目根目录
    return path.join(__dirname, '..');
};

// 根据平台获取clang-format工具
const getClangFormatPath = () => {
    // 对于Windows平台，使用项目bin目录中的clang-format.exe
    // 对于Linux和macOS平台，使用系统环境中的clang-format
    if (process.platform === 'win32') {
        const appPath = getAppPath();
        const clangFormatPath = path.join(appPath, 'bin', 'clang-format.exe');
        console.log('Windows平台，使用项目bin目录中的clang-format.exe:', clangFormatPath);
        console.log('文件是否存在:', fsSync.existsSync(clangFormatPath));
        return clangFormatPath;
    } else {
        // Linux和macOS平台，使用系统环境中的clang-format
        console.log('Linux/macOS平台，使用系统环境中的clang-format');
        return 'clang-format';
    }
};

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
        const clangFormatPath = getClangFormatPath();
        
        // 根据平台使用不同的检查逻辑
        if (process.platform === 'win32') {
            // 对于Windows平台，先检查文件是否存在
            fsSync.accessSync(clangFormatPath);
            // 然后尝试运行版本命令，确保可执行
            execSync(`"${clangFormatPath}" --version`, { stdio: 'ignore' });
        } else {
            // 对于Linux和macOS平台，直接尝试运行版本命令
            // 不需要检查文件是否存在，因为系统会在PATH中查找
            execSync(`${clangFormatPath} --version`, { stdio: 'ignore' });
        }
        
        return true;
    } catch (error) {
        console.error('checkClangFormat错误:', error);
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
        const clangFormatPath = getClangFormatPath();
        let cmd;
        if (config) {
            // 转换配置选项，确保使用正确的clang-format选项名称和类型
            // 注意：不同版本的clang-format可能有不同的配置选项名称和类型要求
            // Windows平台的clang-format可能对类型要求宽松，而Linux/macOS平台的clang-format对类型要求严格
            
            // 获取各种配置值
            const indentWidth = config.indentWidth || config.IndentWidth || 2;
            const tabWidth = config.tabWidth || config.TabWidth || 2;
            const useTab = config.useTab || config.UseTab || 'Never';
            const spacesInSquareBracketsValue = config.spacesInSquareBrackets || config.SpacesInSquareBrackets || false;
            const spacesInAnglesValue = config.spacesInAngles || config.SpacesInAngles || 'Never';
            const spaceBeforeParensValue = config.spaceBeforeParens || config.SpaceBeforeParens || 'ControlStatements';
            const columnLimit = config.columnLimit || config.ColumnLimit || 80;
            const breakBeforeBracesValue = config.breakBeforeBraces || config.BreakBeforeBraces || 'Attach';
            const spacesInParensValue = config.spacesInParentheses || config.SpacesInParentheses || config.spacesInParens || config.SpacesInParens || 'Never';
            
            // 根据平台构建不同的配置
            let formattedConfig;
            if (process.platform === 'win32') {
                // Windows平台配置
                formattedConfig = {
                    IndentWidth: indentWidth,
                    TabWidth: tabWidth,
                    UseTab: useTab,
                    SpacesInParens: spacesInParensValue,
                    SpacesInSquareBrackets: spacesInSquareBracketsValue,
                    SpacesInAngles: spacesInAnglesValue,
                    SpaceBeforeParens: spaceBeforeParensValue,
                    ColumnLimit: columnLimit,
                    BreakBeforeBraces: breakBeforeBracesValue
                };
            } else {
                // Linux和macOS平台配置，确保类型正确
                formattedConfig = {
                    IndentWidth: indentWidth,
                    TabWidth: tabWidth,
                    UseTab: useTab,
                    // SpacesInParentheses是布尔值
                    SpacesInParentheses: spacesInParensValue === 'Always' || spacesInParensValue === true,
                    // SpacesInSquareBrackets是布尔值
                    SpacesInSquareBrackets: typeof spacesInSquareBracketsValue === 'boolean' ? spacesInSquareBracketsValue : spacesInSquareBracketsValue === 'true',
                    // SpacesInAngles在Linux/macOS平台可能是布尔值
                    SpacesInAngles: spacesInAnglesValue === 'Always' || spacesInAnglesValue === true,
                    // SpaceBeforeParens是字符串
                    SpaceBeforeParens: spaceBeforeParensValue,
                    ColumnLimit: columnLimit,
                    BreakBeforeBraces: breakBeforeBracesValue
                };
            }
            
            let styleConfig;
            if (config.baseFormat || config.BaseFormat) {
                // 使用base格式进行格式化
                const baseFormat = config.baseFormat || config.BaseFormat;
                styleConfig = JSON.stringify({
                    BasedOnStyle: baseFormat,
                    ...formattedConfig
                }).replace(/"/g, '\\"');
            } else {
                // 不使用base格式，直接使用自定义配置
                styleConfig = JSON.stringify(formattedConfig).replace(/"/g, '\\"');
            }
            
            // 根据平台使用不同的命令格式
            if (process.platform === 'win32') {
                // Windows平台，使用引号包围路径
                cmd = `"${clangFormatPath}" --style="${styleConfig}" -i "${filePath}"`;
            } else {
                // Linux和macOS平台，不需要引号包围路径
                cmd = `${clangFormatPath} --style="${styleConfig}" -i "${filePath}"`;
            }
        } else {
            // 使用默认的Google风格
            // 根据平台使用不同的命令格式
            if (process.platform === 'win32') {
                // Windows平台，使用引号包围路径
                cmd = `"${clangFormatPath}" --style=Google -i "${filePath}"`;
            } else {
                // Linux和macOS平台，不需要引号包围路径
                cmd = `${clangFormatPath} --style=Google -i "${filePath}"`;
            }
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
    checkClangFormat,
    formatFile
};