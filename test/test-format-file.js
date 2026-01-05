// 测试脚本，测试格式化文件功能
const { formatFile } = require('../src/formatter');

// 测试格式化文件
async function testFormatFile() {
    console.log('=== 测试格式化文件 ===');
    
    const testFilePath = path.join(__dirname, 'test.cpp');
    console.log('测试文件路径:', testFilePath);
    
    try {
        // 使用默认配置格式化文件
        const success = await formatFile(testFilePath, 30000, {
            indentWidth: 2,
            tabWidth: 2,
            useTab: 'Never',
            spacesInParentheses: 'Never',
            spacesInSquareBrackets: false,
            spacesInAngles: 'Never',
            spaceBeforeParens: 'Never',
            columnLimit: 80,
            breakBeforeBraces: 'Attach'
        });
        
        console.log('格式化结果:', success ? '成功' : '失败');
    } catch (error) {
        console.error('格式化文件抛出错误:', error);
    }
    
    console.log('\n=== 测试完成 ===');
}

const path = require('path');
testFormatFile();
