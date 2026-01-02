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

// Google C++代码风格的默认配置
const defaultGoogleConfig = {
    IndentWidth: 2,
    TabWidth: 2,
    UseTab: 'Never',
    SpacesInParens: 'Never',
    SpacesInSquareBrackets: false,
    SpacesInAngles: 'Never',
    SpaceBeforeParens: 'ControlStatements',
    ColumnLimit: 80,
    BreakBeforeBraces: 'Attach'
};

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
        // 使用默认的Google配置
        currentConfig = defaultGoogleConfig;
        // 保存默认配置到文件
        await fs.writeFile(configPath, JSON.stringify(defaultGoogleConfig, null, 2), 'utf8');
        event.reply('default-config-loaded', { success: true });
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

// 读取配置文件
async function loadConfig() {
    try {
        // 检查配置文件是否存在
        await fs.access(configPath);
        // 读取配置文件
        const configData = await fs.readFile(configPath, 'utf8');
        currentConfig = JSON.parse(configData);
    } catch (error) {
        // 配置文件不存在或读取失败，使用默认配置
        currentConfig = defaultGoogleConfig;
        // 保存默认配置到文件
        await fs.writeFile(configPath, JSON.stringify(defaultGoogleConfig, null, 2), 'utf8');
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