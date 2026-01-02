const { checkClangFormat } = require('./formatter');

console.log('测试checkClangFormat函数:');
const isAvailable = checkClangFormat();
console.log('clang-format是否可用:', isAvailable);
