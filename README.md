# C++代码风格格式化工具

一个基于Electron和clang-format的C++代码风格格式化工具，支持自定义Google代码风格，提供直观的图形界面和强大的格式化功能。

## 功能特点

- 📁 **项目管理**：支持选择项目文件夹，自动搜索C++文件
- 📋 **文件类型支持**：支持自定义文件类型（.h, .hpp, .cc, .cpp）
- 🌳 **文件树显示**：直观的文件树结构，支持文件选择和全选/取消全选
- ⚙️ **自定义配置**：支持丰富的clang-format配置选项
- 💾 **配置管理**：支持保存和加载配置，使用默认Google风格
- 📊 **实时进度**：实时显示格式化进度和状态
- 📝 **日志导出**：支持导出格式化日志，便于查看和分析
- ⏱️ **超时处理**：单个文件格式化超时自动处理，避免程序卡死
- 🛡️ **错误处理**：完善的错误处理机制，确保程序稳定运行
- ⚡ **性能优化**：批量处理文件时自动控制资源占用

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
| `spacesInParentheses` | 括号内是否添加空格 | Never |
| `spacesInSquareBrackets` | 方括号内是否添加空格 | false |
| `spacesInAngles` | 尖括号内是否添加空格 | Never |
| `spaceBeforeParens` | 括号前是否添加空格 | ControlStatements |

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
   - 控制语句括号前添加空格，函数调用括号前不添加空格
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
  "IndentWidth": 2,
  "TabWidth": 2,
  "UseTab": "Never",
  "SpacesInParens": "Never",
  "SpacesInSquareBrackets": false,
  "SpacesInAngles": "Never",
  "SpaceBeforeParens": "ControlStatements",
  "ColumnLimit": 80,
  "BreakBeforeBraces": "Attach"
}
```

## 使用方法

1. 点击"浏览..."按钮选择项目文件夹
2. 选择要格式化的文件类型（.h, .hpp, .cc, .cpp）
3. 在文件树中选择要格式化的文件（可使用全选/取消全选按钮）
4. 点击"开始格式化"按钮开始格式化
5. 查看格式化进度和日志信息
6. （可选）在配置页面自定义clang-format配置
7. （可选）点击"导出日志"按钮保存格式化日志

## 自定义配置

1. 点击"配置"标签页
2. 调整各个配置项，实时预览效果
3. 点击"保存配置"按钮保存配置
4. 配置将自动应用到下一次格式化操作
5. 点击"加载默认配置"可恢复Google风格默认配置

## 导出日志

格式化完成后，可以点击"导出日志"按钮将格式化日志保存到本地文件。日志包含以下信息：
- 格式化的文件路径
- 每个文件的格式化状态（成功/失败）
- 格式化开始和结束时间
- 成功和失败的文件数量统计

## 项目架构

### 目录结构

```
code_format_tools/
├── bin/                  # 存放clang-format可执行文件
│   └── clang-format.exe  # Windows版本的clang-format
├── src/                  # 源代码目录
│   ├── main.js           # 主进程入口
│   ├── renderer.js       # 渲染进程入口
│   ├── formatter.js      # 格式化核心逻辑
│   ├── log.js            # 日志处理
│   ├── style.css         # 样式文件
│   └── fabric.min.css    # UI组件库样式
├── test/                 # 测试文件目录
│   └── test-clang-format.js  # clang-format测试
├── index.html            # 主界面HTML
├── package.json          # 项目配置
└── README.md             # 项目说明文档
```

### 核心模块

- **main.js**: Electron主进程，处理窗口管理、IPC通信、文件操作等
- **renderer.js**: 渲染进程，负责UI渲染和用户交互
- **formatter.js**: 格式化核心，包含文件搜索、clang-format调用、超时处理等
- **log.js**: 日志管理，处理日志生成和导出

## 依赖

- Node.js
- Electron ^39.2.7
- electron-packager ^17.1.2
- @fluentui/web-components ^2.6.1
- clang-format (已包含在bin目录中)

## 安装

1. 确保已安装Node.js
2. 克隆或下载项目
3. 安装依赖：

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

## 注意事项

1. 项目已包含`bin/clang-format.exe`，无需额外下载
2. 支持Windows、macOS和Linux平台
3. 首次运行时会自动创建配置文件
4. 配置文件位于用户数据目录下的`config.json`
5. 格式化大量文件时，建议分批处理以获得更好的性能

## 许可证

ISC
