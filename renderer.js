const { ipcRenderer, dialog } = require('electron');
const path = require('path');

// DOM元素
const folderPathInput = document.getElementById('folderPath');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const startBtn = document.getElementById('startBtn');
const exportLogBtn = document.getElementById('exportLogBtn');
const fileTypeCheckboxes = document.querySelectorAll('.file-type');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

const searchProgressBar = document.getElementById('searchProgressBar');
const searchStatus = document.getElementById('searchStatus');
const formatProgressBar = document.getElementById('formatProgressBar');
const formatStatus = document.getElementById('formatStatus');
const fileCount = document.getElementById('fileCount');
const selectedCount = document.getElementById('selectedCount');
const formattedCount = document.getElementById('formattedCount');
const logContainer = document.getElementById('logContainer');
const treeContainer = document.getElementById('treeContainer');

// 标签页元素
const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// 配置元素
const saveConfigBtn = document.getElementById('saveConfigBtn');
const loadDefaultBtn = document.getElementById('loadDefaultBtn');
const resetConfigBtn = document.getElementById('resetConfigBtn');
const indentWidthInput = document.getElementById('indentWidth');
const tabWidthInput = document.getElementById('tabWidth');
const useTabSelect = document.getElementById('useTab');
const spacesInParenthesesInput = document.getElementById('spacesInParentheses');
const spacesInSquareBracketsInput = document.getElementById('spacesInSquareBrackets');
const spacesInAnglesInput = document.getElementById('spacesInAngles');
const spaceBeforeParensSelect = document.getElementById('spaceBeforeParens');
const columnLimitInput = document.getElementById('columnLimit');
const breakBeforeBracesSelect = document.getElementById('breakBeforeBraces');

let log = ['欢迎使用C++代码风格格式化工具'];
let allFiles = []; // 所有找到的文件
let selectedFiles = new Set(); // 选中的文件
let fileTree = {}; // 文件树结构
let currentFolder = ''; // 当前选择的文件夹
let config = {}; // 配置信息

// Google代码风格的默认配置
const defaultGoogleConfig = {
    indentWidth: 2,
    tabWidth: 2,
    useTab: 'Never',
    spacesInParentheses: false,
    spacesInSquareBrackets: false,
    spacesInAngles: false,
    SpaceBeforeParens: 'Never',
    columnLimit: 80,
    breakBeforeBraces: 'Attach'
};

// 标签页切换功能
function initTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // 移除所有标签的激活状态
            tabs.forEach(t => t.classList.remove('active'));
            // 移除所有面板的激活状态
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // 添加当前标签和面板的激活状态
            tab.classList.add('active');
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// 初始化配置
function initConfig() {
    // 从主进程加载保存的配置
    ipcRenderer.send('get-config');
    
    // 添加配置事件监听器
    saveConfigBtn.addEventListener('click', saveConfig);
    loadDefaultBtn.addEventListener('click', loadDefaultConfig);
    resetConfigBtn.addEventListener('click', resetConfig);
}

// 保存配置
function saveConfig() {
    // 获取当前配置
    config = {
        indentWidth: parseInt(indentWidthInput.value),
        tabWidth: parseInt(tabWidthInput.value),
        useTab: useTabSelect.value,
        spacesInParentheses: spacesInParenthesesInput.checked,
        spacesInSquareBrackets: spacesInSquareBracketsInput.checked,
        spacesInAngles: spacesInAnglesInput.checked,
        SpaceBeforeParens: spaceBeforeParensSelect.value,
        columnLimit: parseInt(columnLimitInput.value),
        breakBeforeBraces: breakBeforeBracesSelect.value
    };
    
    // 向主进程发送保存配置请求
    ipcRenderer.send('save-config', config);
    
    addLog('配置已保存');
}

// 加载默认配置
function loadDefaultConfig() {
    // Google代码风格的默认配置
    const defaultConfig = {
        indentWidth: 2,
        tabWidth: 2,
        useTab: 'Never',
        spacesInParentheses: false,
        spacesInSquareBrackets: false,
        spacesInAngles: false,
        SpaceBeforeParens: 'Never',
        columnLimit: 80,
        breakBeforeBraces: 'Attach'
    };
    
    // 更新配置到UI
    updateConfigUI(defaultConfig);
    
    // 向主进程发送加载默认配置请求
    ipcRenderer.send('load-default-config');
    
    addLog('已加载默认配置（Google风格）');
}

// 重置配置
function resetConfig() {
    // 更新配置到UI
    updateConfigUI(config);
    
    addLog('配置已重置');
}

// 更新配置UI
function updateConfigUI(config) {
    indentWidthInput.value = config.indentWidth;
    tabWidthInput.value = config.tabWidth;
    useTabSelect.value = config.useTab;
    spacesInParenthesesInput.checked = config.spacesInParentheses;
    spacesInSquareBracketsInput.checked = config.spacesInSquareBrackets;
    spacesInAnglesInput.checked = config.spacesInAngles;
    spaceBeforeParensSelect.value = config.SpaceBeforeParens;
    columnLimitInput.value = config.columnLimit;
    breakBeforeBracesSelect.value = config.breakBeforeBraces;
}

// 文件夹选择
selectFolderBtn.addEventListener('click', () => {
    // 向主进程发送文件夹选择请求
    ipcRenderer.send('select-folder');
});

// 初始化标签页和配置
initTabs();
initConfig();

// 监听文件夹选择结果
ipcRenderer.on('select-folder-result', (event, result) => {
    if (!result.canceled && result.filePaths.length > 0) {
        folderPathInput.value = result.filePaths[0];
        currentFolder = result.filePaths[0];
        startBtn.disabled = false;
        // 搜索文件
        searchFiles();
    }
});

// 搜索文件
function searchFiles() {
    const folder = folderPathInput.value;
    if (!folder) {
        return;
    }

    // 获取选中的文件类型
    const selectedTypes = Array.from(fileTypeCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (selectedTypes.length === 0) {
        addLog('请至少选择一种文件类型');
        return;
    }

    // 重置状态
    resetProgress();
    addLog('开始搜索文件...');

    // 向主进程发送开始格式化命令，但只搜索文件
    ipcRenderer.send('search-files', {
        folderPath: folder,
        fileTypes: selectedTypes
    });
}

// 文件类型选择变化时，重新搜索文件
fileTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (currentFolder) {
            searchFiles();
        }
    });
});

// 全选按钮
selectAllBtn.addEventListener('click', () => {
    const allCheckboxes = treeContainer.querySelectorAll('.node-checkbox');
    
    // 全选所有节点
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.indeterminate = false;
        
        // 更新选中文件集合
        if (checkbox.classList.contains('file-checkbox')) {
            selectedFiles.add(checkbox.value);
        }
        
        // 更新节点的选中样式
        updateNodeSelectedStyle(checkbox.value, true);
    });
    
    updateSelectedCount();
});

// 取消全选按钮
deselectAllBtn.addEventListener('click', () => {
    const allCheckboxes = treeContainer.querySelectorAll('.node-checkbox');
    
    // 取消全选所有节点
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
        
        // 更新选中文件集合
        if (checkbox.classList.contains('file-checkbox')) {
            selectedFiles.delete(checkbox.value);
        }
        
        // 更新节点的选中样式
        updateNodeSelectedStyle(checkbox.value, false);
    });
    
    updateSelectedCount();
});

// 开始格式化
startBtn.addEventListener('click', () => {
    if (selectedFiles.size === 0) {
        addLog('请先选择要格式化的文件');
        return;
    }

    // 重置状态
    resetProgress();
    addLog(`开始格式化 ${selectedFiles.size} 个文件...`);

    // 向主进程发送开始格式化命令
    ipcRenderer.send('start-format', {
        files: Array.from(selectedFiles)
    });
});

// 导出日志
exportLogBtn.addEventListener('click', () => {
    if (log.length === 1) {
        addLog('没有可导出的日志');
        return;
    }

    // 向主进程发送日志保存请求
    ipcRenderer.send('save-log', {
        defaultPath: `format_log_${new Date().toISOString().slice(0, 10)}.txt`
    });
});

// 监听日志保存结果
ipcRenderer.on('save-log-result', (event, result) => {
    if (!result.canceled && result.filePath) {
        ipcRenderer.send('export-log', {
            filePath: result.filePath,
            log: log.join('\n')
        });
    }
});

// 重置进度
function resetProgress() {
    searchProgressBar.style.width = '0%';
    searchStatus.textContent = '搜索中...';
    formatProgressBar.style.width = '0%';
    formatStatus.textContent = '未开始';
    fileCount.textContent = '0';
    selectedCount.textContent = '0';
    formattedCount.textContent = '0';
}

// 添加日志
function addLog(message) {
    const timestamp = new Date().toLocaleString();
    const logMessage = `[${timestamp}] ${message}`;
    log.push(logMessage);

    const logItem = document.createElement('p');
    logItem.className = 'log-item';
    logItem.textContent = logMessage;
    logContainer.appendChild(logItem);

    // 滚动到底部
    logContainer.scrollTop = logContainer.scrollHeight;
}

// 构建文件树
function buildFileTree(files, rootPath) {
    const tree = {};
    
    files.forEach(file => {
        const relativePath = path.relative(rootPath, file);
        const parts = relativePath.split(path.sep);
        
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            
            if (!current[part]) {
                current[part] = {
                    name: part,
                    path: path.join(rootPath, ...parts.slice(0, i + 1)),
                    isFile: isFile,
                    children: isFile ? null : {}
                };
            }
            
            if (!isFile) {
                current = current[part].children;
            }
        }
    });
    
    return tree;
}

// 渲染文件树
function renderFileTree(tree, container, rootPath) {
    container.innerHTML = '';
    
    if (Object.keys(tree).length === 0) {
        container.innerHTML = '<p class="no-files">未找到匹配的文件</p>';
        return;
    }
    
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    
    renderTreeNodes(tree, ul, rootPath);
    container.appendChild(ul);
}

// 渲染树节点
function renderTreeNodes(nodes, parentElement, rootPath, parentCheckbox = null) {
    Object.values(nodes).forEach(node => {
        const li = document.createElement('li');
        li.dataset.path = node.path;
        li.className = 'tree-node';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'node-content';
        
        // 节点图标
        const iconSpan = document.createElement('span');
        iconSpan.className = `node-icon ${node.isFile ? 'file-icon' : 'folder-icon'}`;
        iconSpan.textContent = node.isFile ? '📄' : '📁';
        
        // 展开/折叠按钮（仅文件夹）
        let expandBtn = null;
        if (!node.isFile) {
            expandBtn = document.createElement('span');
            expandBtn.className = 'node-expand';
            expandBtn.textContent = '▼';
            expandBtn.style.cursor = 'pointer';
            expandBtn.style.fontSize = '10px';
            expandBtn.style.width = '12px';
            expandBtn.style.display = 'inline-block';
            expandBtn.style.textAlign = 'center';
            
            // 展开/折叠事件
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const childrenDiv = li.querySelector('.tree-children');
                childrenDiv.classList.toggle('expanded');
                expandBtn.textContent = childrenDiv.classList.contains('expanded') ? '▼' : '▶';
            });
        }
        
        // 复选框
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = `node-checkbox ${node.isFile ? 'file-checkbox' : 'folder-checkbox'}`;
        checkbox.value = node.path;
        
        // 初始化复选框状态
        let isSelected = false;
        if (node.isFile) {
            isSelected = selectedFiles.has(node.path);
            checkbox.checked = isSelected;
        } else {
            // 检查文件夹下的所有文件是否都被选中
            const filesInFolder = allFiles.filter(file => file.startsWith(node.path + path.sep));
            const allSelected = filesInFolder.every(file => selectedFiles.has(file));
            const anySelected = filesInFolder.some(file => selectedFiles.has(file));
            
            checkbox.checked = allSelected;
            checkbox.indeterminate = anySelected && !allSelected;
            
            // 文件夹如果所有子文件都选中或者部分选中，则显示为选中状态
            isSelected = anySelected;
        }
        
        // 初始化节点的选中样式
        if (isSelected) {
            li.classList.add('selected');
        } else {
            li.classList.remove('selected');
        }
        
        // 复选框事件
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const isChecked = checkbox.checked;
            
            if (node.isFile) {
                // 处理文件选中
                updateSelectedFile(node.path, isChecked);
                // 更新所有父节点状态
                updateAllParentCheckboxes(node.path);
            } else {
                // 处理文件夹选中，直接遍历所有相关文件
                updateFolderWithAllContents(node.path, isChecked);
            }
        });
        
        // 节点名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'node-name';
        nameSpan.textContent = node.name;
        
        // 组装内容
        contentDiv.appendChild(checkbox);
        if (expandBtn) {
            contentDiv.appendChild(expandBtn);
        } else {
            // 文件节点添加占位符
            const placeholder = document.createElement('span');
            placeholder.style.width = '12px';
            placeholder.style.display = 'inline-block';
            contentDiv.appendChild(placeholder);
        }
        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(nameSpan);
        
        li.appendChild(contentDiv);
        
        // 渲染子节点
        if (!node.isFile && Object.keys(node.children).length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children expanded';
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0';
            renderTreeNodes(node.children, ul, rootPath, checkbox);
            childrenDiv.appendChild(ul);
            li.appendChild(childrenDiv);
        }
        
        parentElement.appendChild(li);
    });
}

// 更新节点的选中样式
function updateNodeSelectedStyle(path, isSelected) {
    // 在Windows系统中，路径中的反斜杠需要转义为双反斜杠才能在querySelector中正确匹配
    const escapedPath = path.replace(/\\/g, '\\\\');
    const node = treeContainer.querySelector(`[data-path="${escapedPath}"]`);
    if (node) {
        if (isSelected) {
            node.classList.add('selected');
        } else {
            node.classList.remove('selected');
        }
    }
}

// 更新单个文件的选中状态
function updateSelectedFile(filePath, isSelected) {
    // 更新选中文件集合
    if (isSelected) {
        selectedFiles.add(filePath);
    } else {
        selectedFiles.delete(filePath);
    }
    
    // 更新文件复选框状态
    const escapedFilePath = filePath.replace(/\\/g, '\\\\');
    const fileCheckbox = treeContainer.querySelector(`.file-checkbox[value="${escapedFilePath}"]`);
    if (fileCheckbox) {
        fileCheckbox.checked = isSelected;
        fileCheckbox.indeterminate = false;
    }
    
    // 更新文件节点样式
    updateNodeSelectedStyle(filePath, isSelected);
    
    // 更新选中计数
    updateSelectedCount();
}

// 更新单个文件夹的选中状态
function updateSelectedFolder(folderPath, isSelected) {
    // 更新文件夹复选框状态
    const escapedFolderPath = folderPath.replace(/\\/g, '\\\\');
    const folderCheckbox = treeContainer.querySelector(`.folder-checkbox[value="${escapedFolderPath}"]`);
    if (folderCheckbox) {
        folderCheckbox.checked = isSelected;
        folderCheckbox.indeterminate = false;
    }
    
    // 更新文件夹节点样式
    updateNodeSelectedStyle(folderPath, isSelected);
}

// 更新文件夹及其所有子内容
function updateFolderWithAllContents(folderPath, isSelected) {
    // 重置选中文件集合（如果是全选/取消全选）
    if (folderPath === currentFolder) {
        if (!isSelected) {
            selectedFiles.clear();
        }
    }
    
    // 1. 更新当前文件夹状态
    updateSelectedFolder(folderPath, isSelected);
    
    // 2. 遍历当前文件夹下的所有文件
    const filesInFolder = allFiles.filter(file => file.startsWith(folderPath + path.sep));
    filesInFolder.forEach(filePath => {
        // 更新文件状态
        if (isSelected) {
            selectedFiles.add(filePath);
        } else {
            selectedFiles.delete(filePath);
        }
        
        // 更新文件复选框
        const escapedFilePath = filePath.replace(/\\/g, '\\\\');
        const fileCheckbox = treeContainer.querySelector(`.file-checkbox[value="${escapedFilePath}"]`);
        if (fileCheckbox) {
            fileCheckbox.checked = isSelected;
            fileCheckbox.indeterminate = false;
        }
        
        // 更新文件样式
        updateNodeSelectedStyle(filePath, isSelected);
    });
    
    // 3. 遍历当前文件夹下的所有直接子文件夹
    const escapedFolderPath = folderPath.replace(/\\/g, '\\\\');
    const folderNode = treeContainer.querySelector(`[data-path="${escapedFolderPath}"]`);
    if (folderNode) {
        const childrenDiv = folderNode.querySelector('.tree-children');
        if (childrenDiv) {
            const childFolders = childrenDiv.querySelectorAll('.folder-checkbox');
            childFolders.forEach(childFolder => {
                const childFolderPath = childFolder.value;
                // 更新子文件夹状态和样式
                updateSelectedFolder(childFolderPath, isSelected);
                // 递归更新子文件夹
                updateFolderWithAllContents(childFolderPath, isSelected);
            });
        }
    }
    
    // 4. 更新所有父文件夹状态
    updateAllParentCheckboxes(folderPath);
    
    // 5. 更新选中计数
    updateSelectedCount();
}

// 更新父节点复选框状态
function updateParentCheckbox(childElement, rootPath) {
    const parentLi = childElement.parentElement.closest('.tree-node');
    if (!parentLi) return;
    
    const parentCheckbox = parentLi.querySelector('.folder-checkbox');
    if (!parentCheckbox) return;
    
    const parentPath = parentCheckbox.value;
    const childrenDiv = parentLi.querySelector('.tree-children');
    if (!childrenDiv) return;
    
    // 获取所有子文件的复选框
    const childCheckboxes = childrenDiv.querySelectorAll('.node-checkbox');
    if (childCheckboxes.length === 0) return;
    
    // 检查子节点状态
    let allChecked = true;
    let anyChecked = false;
    
    childCheckboxes.forEach(checkbox => {
        if (!checkbox.checked && !checkbox.indeterminate) {
            allChecked = false;
        }
        if (checkbox.checked || checkbox.indeterminate) {
            anyChecked = true;
        }
    });
    
    // 更新父节点状态
    parentCheckbox.checked = allChecked;
    parentCheckbox.indeterminate = anyChecked && !allChecked;
    
    // 更新父节点的选中样式
    updateNodeSelectedStyle(parentPath, anyChecked);
    
    // 递归更新父节点
    updateParentCheckbox(parentLi, rootPath);
}

// 更新父文件夹的复选框状态和样式
function updateParentFolderStyle(folderPath) {
    // 获取当前文件夹的DOM节点
    const escapedFolderPath = folderPath.replace(/\\/g, '\\\\');
    const folderNode = treeContainer.querySelector(`[data-path="${escapedFolderPath}"]`);
    if (!folderNode) return;
    
    // 获取当前文件夹的复选框
    const folderCheckbox = folderNode.querySelector('.folder-checkbox');
    if (!folderCheckbox) return;
    
    // 1. 检查该文件夹下的所有文件是否都被选中
    const filesInFolder = allFiles.filter(file => file.startsWith(folderPath + path.sep));
    const allFilesChecked = filesInFolder.every(file => selectedFiles.has(file));
    const anyFilesChecked = filesInFolder.some(file => selectedFiles.has(file));
    
    // 2. 检查该文件夹下的所有子文件夹状态
    const childrenDiv = folderNode.querySelector('.tree-children');
    let allSubfoldersChecked = true;
    let anySubfoldersChecked = false;
    
    if (childrenDiv) {
        const subfolderCheckboxes = childrenDiv.querySelectorAll('.folder-checkbox');
        subfolderCheckboxes.forEach(checkbox => {
            if (!checkbox.checked && !checkbox.indeterminate) {
                allSubfoldersChecked = false;
            }
            if (checkbox.checked || checkbox.indeterminate) {
                anySubfoldersChecked = true;
            }
        });
    }
    
    // 3. 综合判断父文件夹的状态
    const allChecked = allFilesChecked && allSubfoldersChecked;
    const anyChecked = anyFilesChecked || anySubfoldersChecked;
    
    // 4. 更新父文件夹的复选框状态
    folderCheckbox.checked = allChecked;
    folderCheckbox.indeterminate = anyChecked && !allChecked;
    
    // 5. 更新父文件夹的选中样式
    updateNodeSelectedStyle(folderPath, anyChecked);
}

// 更新所有子节点的选中样式
function updateAllChildrenStyle(parentPath, isSelected) {
    // 获取所有子文件
    const childrenFiles = allFiles.filter(file => file.startsWith(parentPath + path.sep));
    childrenFiles.forEach(file => {
        updateNodeSelectedStyle(file, isSelected);
    });
    
    // 获取所有子文件夹
    const escapedParentPath = parentPath.replace(/\\/g, '\\\\');
    const parentNode = treeContainer.querySelector(`[data-path="${escapedParentPath}"]`);
    if (parentNode) {
        const childrenDiv = parentNode.querySelector('.tree-children');
        if (childrenDiv) {
            const childFolders = childrenDiv.querySelectorAll('.folder-checkbox');
            childFolders.forEach(childFolder => {
                const childFolderPath = childFolder.value;
                updateNodeSelectedStyle(childFolderPath, isSelected);
                // 递归更新子文件夹的子节点
                updateAllChildrenStyle(childFolderPath, isSelected);
            });
        }
    }
}

// 更新所有父文件夹的复选框状态和样式
function updateAllParentCheckboxes(filePath) {
    // 获取当前文件/文件夹的完整路径
    const fullPath = filePath;
    
    // 如果是根文件夹，不需要更新父节点
    if (fullPath === currentFolder) {
        return;
    }
    
    // 解析路径，获取所有父文件夹路径
    let currentParent = path.dirname(fullPath);
    
    // 遍历所有父文件夹，直到根文件夹
    while (currentParent && currentParent.startsWith(currentFolder) && currentParent !== currentFolder) {
        // 更新当前父文件夹的状态
        updateParentFolderStyle(currentParent);
        
        // 获取上一级父文件夹
        currentParent = path.dirname(currentParent);
    }
    
    // 最后更新根文件夹
    updateParentFolderStyle(currentFolder);
}

// 更新选中文件数量
function updateSelectedCount() {
    selectedCount.textContent = selectedFiles.size;
}

// 监听主进程事件
ipcRenderer.on('files-searched', (event, { files, folderPath }) => {
    allFiles = files;
    fileCount.textContent = files.length;
    searchStatus.textContent = `已找到 ${files.length} 个文件`;
    searchProgressBar.style.width = '100%';
    addLog(`找到 ${files.length} 个文件`);
    
    // 构建并渲染文件树
    fileTree = buildFileTree(files, folderPath);
    renderFileTree(fileTree, treeContainer, folderPath);
    
    // 重置选中文件
    selectedFiles.clear();
    updateSelectedCount();
});

ipcRenderer.on('file-found', (event, { totalFiles }) => {
    fileCount.textContent = totalFiles;
    searchStatus.textContent = `已找到 ${totalFiles} 个文件`;
    searchProgressBar.style.width = '100%';
    addLog(`找到 ${totalFiles} 个文件，开始格式化...`);
});

ipcRenderer.on('format-progress', (event, { current, total }) => {
    const progress = Math.round((current / total) * 100);
    formatProgressBar.style.width = `${progress}%`;
    formatStatus.textContent = `格式化中 (${current}/${total})`;
    formattedCount.textContent = current;
});

ipcRenderer.on('format-complete', (event, { successCount, failCount }) => {
    formatProgressBar.style.width = '100%';
    formatStatus.textContent = '格式化完成';
    addLog(`格式化完成！成功: ${successCount} 个文件，失败: ${failCount} 个文件`);
});

ipcRenderer.on('format-file', (event, { filePath, status }) => {
    if (status === 'success') {
        addLog(`✓ 成功格式化: ${filePath}`);
    } else {
        addLog(`✗ 格式化失败: ${filePath}`);
    }
});

ipcRenderer.on('log-exported', (event, { filePath }) => {
    addLog(`日志已导出到: ${filePath}`);
});

ipcRenderer.on('error', (event, { message }) => {
    addLog(`错误: ${message}`);
});

ipcRenderer.on('clang-format-not-found', () => {
    addLog('错误: 未找到clang-format工具，请先安装clang-format');
    addLog('安装提示:');
    addLog('  Windows: 可通过Visual Studio安装，或从https://github.com/llvm/llvm-project/releases下载');
    addLog('  macOS: brew install clang-format');
    addLog('  Linux: apt-get install clang-format (Ubuntu/Debian) 或 yum install clang-format (CentOS/RHEL)');
});

// 监听配置加载事件
ipcRenderer.on('config-loaded', (event, { config: loadedConfig }) => {
    config = loadedConfig;
    updateConfigUI(loadedConfig);
});

// 监听配置保存事件
ipcRenderer.on('config-saved', (event, { success }) => {
    if (success) {
        addLog('配置已保存');
    }
});

// 监听默认配置加载事件
ipcRenderer.on('default-config-loaded', (event, { success }) => {
    if (success) {
        // 加载默认配置到UI
        updateConfigUI(defaultGoogleConfig);
        addLog('已加载默认配置（Google风格）');
    }
});