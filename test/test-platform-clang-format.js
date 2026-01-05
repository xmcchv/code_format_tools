// 测试脚本，测试当前平台的clang-format工具
const fs = require('fs');
const path = require('path');

// 测试函数
async function runTests() {
    console.log(`=== 测试当前平台: ${process.platform} ===`);
    
    // 加载formatter模块
    const { checkClangFormat } = require('../src/formatter');
    
    // 测试checkClangFormat函数
    try {
        const isAvailable = checkClangFormat();
        console.log('checkClangFormat返回:', isAvailable);
    } catch (error) {
        console.error('checkClangFormat抛出错误:', error);
    }
    
    console.log('\n=== 测试完成 ===');
}

runTests();
