const fs = require('fs').promises;

/**
 * 导出日志到文件
 * @param {string} filePath - 日志文件保存路径
 * @param {string} logContent - 日志内容
 * @returns {Promise<void>} - 导出完成的Promise
 */
async function exportLog(filePath, logContent) {
    try {
        await fs.writeFile(filePath, logContent, 'utf-8');
        console.log(`日志已导出到: ${filePath}`);
    } catch (error) {
        console.error('导出日志失败:', error);
        throw new Error(`导出日志失败: ${error.message}`);
    }
}

/**
 * 记录日志到控制台
 * @param {string} message - 日志消息
 * @param {string} type - 日志类型 (info, success, error, warning)
 */
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleString();
    const typeColors = {
        info: '\x1b[36m',    // 青色
        success: '\x1b[32m',  // 绿色
        error: '\x1b[31m',    // 红色
        warning: '\x1b[33m'   // 黄色
    };
    const resetColor = '\x1b[0m';
    
    console.log(`${timestamp} [${typeColors[type]}${type.toUpperCase()}${resetColor}] ${message}`);
}

module.exports = {
    exportLog,
    log
};