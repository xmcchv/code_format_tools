# C++代码风格格式化工具

一个基于Electron和clang-format的C++代码风格格式化工具，支持自定义Google代码风格。

## 功能特点

- 支持选择项目文件夹，自动搜索C++文件
- 支持自定义文件类型（.h, .hpp, .cc, .cpp）
- 支持文件树显示和文件选择
- 支持自定义clang-format配置
- 支持保存和加载配置
- 实时显示格式化进度
- 支持导出格式化日志

## 配置参数说明

在配置页面中，您可以自定义以下clang-format参数：

### 基础配置

| 参数名 | 含义 | Google风格默认值 |
|--------|------|------------------|
| `indentWidth` | 缩进宽度，即每个缩进级别使用的空格数 | 2 |
| `tabWidth` | 制表符宽度 | 2 |
| `useTab` | 是否使用制表符进行缩进 | Never |

### 空格配置

| 参数名 | 含义 | Google风格默认值 |
|--------|------|------------------|
| `spacesInParentheses` | 括号内是否添加空格 | false |
| `spacesInSquareBrackets` | 方括号内是否添加空格 | false |
| `spacesInAngles` | 尖括号内是否添加空格 | false |
| `spaceBeforeParens` | 括号前是否添加空格 | Never |

### 换行配置

| 参数名 | 含义 | Google风格默认值 |
|--------|------|------------------|
| `columnLimit` | 行长度限制，超过该长度的行将被自动换行 | 80 |
| `breakBeforeBraces` | 大括号前是否换行 | Attach |

## Google C++代码风格规范

Google C++代码风格是一种广泛使用的C++代码格式化规范，以下是其主要特点：

1. **缩进**：使用2个空格进行缩进，不使用制表符
2. **行长度**：每行不超过80个字符
3. **大括号**：使用Attach风格，即大括号与前面的语句在同一行
4. **空格**：
   - 括号内不添加空格
   - 方括号内不添加空格
   - 尖括号内不添加空格
   - 括号前不添加空格
5. **命名**：
   - 类名：驼峰式命名，首字母大写（如：ClassName）
   - 函数名：驼峰式命名，首字母小写（如：functionName）
   - 变量名：驼峰式命名，首字母小写（如：variableName）
   - 常量名：全大写，下划线分隔（如：CONSTANT_NAME）
6. **注释**：使用//进行单行注释，使用/* */进行多行注释

## 默认配置文件

工具启动时会自动加载默认配置文件，该文件位于用户数据目录下的`config.json`。默认配置使用Google C++代码风格：

```json
{
  "indentWidth": 2,
  "tabWidth": 2,
  "useTab": "Never",
  "spacesInParentheses": false,
  "spacesInSquareBrackets": false,
  "spacesInAngles": false,
  "spaceBeforeParens": "Never",
  "columnLimit": 80,
  "breakBeforeBraces": "Attach"
}
```

## 使用方法

1. 点击"浏览..."按钮选择项目文件夹
2. 选择要格式化的文件类型
3. 在文件树中选择要格式化的文件（可使用全选/取消全选按钮）
4. 点击"开始格式化"按钮开始格式化
5. 查看格式化进度和日志
6. （可选）在配置页面自定义clang-format配置

## 自定义配置

1. 点击"配置"标签页
2. 调整各个配置项
3. 点击"保存配置"按钮保存配置
4. 配置将自动应用到下一次格式化操作

## 导出日志

格式化完成后，可以点击"导出日志"按钮将格式化日志保存到本地文件。

## 依赖

- Node.js
- Electron
- clang-format

## clang-format配置

### 获取clang-format.exe

从LLVM官网下载适合您系统的clang-format可执行文件：

- [LLVM下载页面](https://llvm.org/releases/download.html)

选择最新版本的LLVM，下载Windows版本的安装包或压缩包。安装或解压后，找到`clang-format.exe`文件。

### 放入bin目录

将`clang-format.exe`文件复制到项目根目录下的`bin`目录中。

## 安装

```bash
npm install
```

## 运行

```bash
npm start
```

## 打包

```bash
# 打包Windows版本
npm run package-win

# 打包macOS版本
npm run package-mac

# 打包Linux版本
npm run package-linux
```

## 许可证

ISC
