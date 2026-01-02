const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { searchFiles, formatFiles } = require('./formatter');
const { exportLog } = require('./log');

let configPath = '';
let currentConfig = null;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: 'C++代码风格格式化工具',
        resizable: true,
        maximizable: true,
        // 禁用GPU加速，避免Linux下的GPU相关问题
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            hardwareAcceleration: false
        },
        // 禁用Vulkan，避免相关警告和错误
        enabledFeatures: ['WebGL2'],
        disabledFeatures: ['Vulkan']
    });

    mainWindow.loadFile('index.html');

    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// 处理文件夹选择请求
ipcMain.on('select-folder', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择项目文件夹',
        buttonLabel: '选择'
    });
    event.reply('select-folder-result', result);
});

// 处理日志保存请求
ipcMain.on('save-log', async (event, { defaultPath }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出日志',
        defaultPath: defaultPath,
        filters: [
            { name: '文本文件', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });
    event.reply('save-log-result', result);
});

// 处理文件搜索请求
ipcMain.on('search-files', async (event, { folderPath, fileTypes }) => {
    try {
        // 搜索文件
        const files = await searchFiles(folderPath, fileTypes);
        
        // 向渲染进程发送找到的文件
        event.reply('files-searched', { files, folderPath });
    } catch (error) {
        event.reply('error', { message: error.message });
    }
});

// 处理渲染进程事件
ipcMain.on('start-format', async (event, { files }) => {
    try {
        // 向渲染进程发送找到的文件数量
        event.reply('file-found', { totalFiles: files.length });
        
        // 格式化文件，传递当前配置
        const result = await formatFiles(files, (current, total, filePath, status) => {
            // 发送进度更新
            event.reply('format-progress', { current, total });
            // 发送单个文件格式化结果
            event.reply('format-file', { filePath, status });
        }, currentConfig);
        
        // 发送格式化完成消息
        event.reply('format-complete', result);
    } catch (error) {
        if (error.message === 'clang-format not found') {
            event.reply('clang-format-not-found');
        } else {
            event.reply('error', { message: error.message });
        }
    }
});

// 处理日志导出
ipcMain.on('export-log', async (event, { filePath, log }) => {
    try {
        await exportLog(filePath, log);
        event.reply('log-exported', { filePath });
    } catch (error) {
        event.reply('error', { message: error.message });
    }
});

// 配置键名转换函数：将后端配置键名转换为前端UI期望的格式
function convertConfigKeys(config) {
    return {
        baseFormat: config.baseFormat || 'Google',
        indentWidth: config.IndentWidth || config.indentWidth || 2,
        tabWidth: config.TabWidth || config.tabWidth || 2,
        useTab: config.UseTab || config.useTab || 'Never',
        spacesInParentheses: config.SpacesInParens === 'Always' || config.spacesInParentheses || false,
        spacesInSquareBrackets: config.SpacesInSquareBrackets || config.spacesInSquareBrackets || false,
        spacesInAngles: config.SpacesInAngles === 'Always' || config.spacesInAngles || false,
        spaceBeforeParens: config.SpaceBeforeParens || config.spaceBeforeParens || 'ControlStatements',
        columnLimit: config.ColumnLimit || config.columnLimit || 80,
        breakBeforeBraces: config.BreakBeforeBraces || config.breakBeforeBraces || 'Attach'
    };
}

// 不同base格式的默认配置
const defaultConfigs = {
    // Google C++代码风格
    Google: {
        IndentWidth: 2,
        TabWidth: 2,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: 'Never',
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 80,
        BreakBeforeBraces: 'Attach'
    },
    // LLVM代码风格
    LLVM: {
        IndentWidth: 2,
        TabWidth: 2,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 80,
        BreakBeforeBraces: 'Attach'
    },
    // Mozilla代码风格
    Mozilla: {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 80,
        BreakBeforeBraces: 'Allman'
    },
    // WebKit代码风格
    WebKit: {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 100,
        BreakBeforeBraces: 'Attach'
    },
    // Stroustrup代码风格
    Stroustrup: {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 79,
        BreakBeforeBraces: 'Stroustrup'
    },
    // Allman代码风格
    Allman: {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'ControlStatements',
        ColumnLimit: 80,
        BreakBeforeBraces: 'Allman'
    },
    // GNU代码风格
    GNU: {
        IndentWidth: 2,
        TabWidth: 8,
        UseTab: 'Always',
        SpacesInParens: 'Never',
        SpacesInSquareBrackets: false,
        SpacesInAngles: false,
        SpaceBeforeParens: 'Always',
        ColumnLimit: 80,
        BreakBeforeBraces: 'GNU'
    }
};

// 默认使用Google配置
const defaultGoogleConfig = defaultConfigs.Google;

// 处理配置保存请求
ipcMain.on('save-config', async (event, config) => {
    try {
        // 保存配置到文件
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        currentConfig = config;
        event.reply('config-saved', { success: true });
    } catch (error) {
        event.reply('error', { message: `保存配置失败: ${error.message}` });
    }
});

// 处理加载默认配置请求
ipcMain.on('load-default-config', async (event) => {
    try {
        // 使用默认的Google配置，包含baseFormat属性
        const defaultConfig = {
            ...defaultConfigs.Google,
            baseFormat: 'Google'
        };
        // 转换配置键名为前端期望的格式
        currentConfig = convertConfigKeys(defaultConfig);
        // 保存默认配置到文件
        await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
        // 向渲染进程发送更新后的配置
        event.reply('config-loaded', { config: currentConfig });
    } catch (error) {
        event.reply('error', { message: `加载默认配置失败: ${error.message}` });
    }
});

// 处理获取配置请求
ipcMain.on('get-config', async (event) => {
    try {
        // 如果currentConfig为null，重新加载配置
        if (!currentConfig) {
            await loadConfig();
        }
        event.reply('config-loaded', { config: currentConfig });
    } catch (error) {
        event.reply('error', { message: `获取配置失败: ${error.message}` });
    }
});

// 处理加载base格式请求
ipcMain.on('load-base-format', async (event, { baseFormat }) => {
    try {
        // 获取对应base格式的默认配置
        const baseConfig = defaultConfigs[baseFormat] || defaultConfigs.Google;
        
        // 完全替换为base格式的默认值，不保留当前配置
        currentConfig = {
            ...baseConfig,
            baseFormat: baseFormat
        };
        
        // 转换配置键名为前端期望的格式
        const convertedConfig = convertConfigKeys(currentConfig);
        
        // 保存更新后的配置到文件（保存转换后的格式，确保前后端一致）
        await fs.writeFile(configPath, JSON.stringify(convertedConfig, null, 2), 'utf8');
        
        // 更新currentConfig为转换后的格式
        currentConfig = convertedConfig;
        
        // 向渲染进程发送更新后的配置
        event.reply('config-loaded', { config: convertedConfig });
    } catch (error) {
        event.reply('error', { message: `加载base格式失败: ${error.message}` });
    }
});

// 读取配置文件
async function loadConfig() {
    try {
        // 检查配置文件是否存在
        await fs.access(configPath);
        // 读取配置文件
        const configData = await fs.readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        // 转换配置键名为前端期望的格式
        currentConfig = convertConfigKeys(loadedConfig);
    } catch (error) {
        // 配置文件不存在或读取失败，使用默认配置
        const defaultConfig = {
            ...defaultGoogleConfig,
            baseFormat: 'Google'
        };
        // 转换配置键名为前端期望的格式
        currentConfig = convertConfigKeys(defaultConfig);
        // 保存转换后的默认配置到文件
        await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    }
}

// 确保配置目录存在
async function ensureConfigDir() {
    const configDir = path.dirname(configPath);
    try {
        await fs.access(configDir);
    } catch (error) {
        // 目录不存在，创建它
        await fs.mkdir(configDir, { recursive: true });
    }
}

// 在应用就绪时加载配置
app.on('ready', async () => {
    // 设置配置文件路径
    configPath = path.join(app.getPath('userData'), 'config.json');
    await ensureConfigDir();
    await loadConfig();
    createWindow();
});