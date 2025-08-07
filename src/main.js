const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Import core services
const MongoDBManager = require('./database/mongodb-manager');
const WorkflowRecorder = require('./automation/workflow-recorder');
const WorkflowExecutor = require('./automation/workflow-executor');
const SchedulerService = require('./scheduling/scheduler-service');
const AudioRecorder = require('./audio/audio-recorder');
const MCPEnhancedNaturalLanguageProcessor = require('./services/mcp-enhanced-natural-language-processor');

// Global references
let mainWindow;
let tray;
let databaseManager;
let workflowRecorder;
let workflowExecutor;
let schedulerService;
let audioRecorder;
let naturalLanguageProcessor;

// Enable live reload for development
if (isDev) {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, '../node_modules/.bin/electron'),
            hardResetMethod: 'exit'
        });
    } catch (err) {
        console.log('Development reload not available');
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        show: false
    });

    // Load the app
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('🪟 Main window ready to show');
        mainWindow.show();
        
        // Focus on window (macOS)
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        
        console.log('✅ Main window displayed');
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        console.log('🪟 Main window closed');
        mainWindow = null;
    });

    // Debug: Log when window fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ Failed to load window content:', errorCode, errorDescription);
    });

    // Debug: Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ Window content loaded successfully');
    });

    // Handle window minimize to tray
    mainWindow.on('minimize', (event) => {
        if (process.platform !== 'darwin') {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Workflow',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-workflow');
                    }
                },
                {
                    label: 'Import Workflow',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Workflow Files', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-action', 'import-workflow', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Record',
            submenu: [
                {
                    label: 'Start Recording',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'start-recording');
                    }
                },
                {
                    label: 'Stop Recording',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'stop-recording');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Record Audio',
                    accelerator: 'CmdOrCtrl+Alt+R',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'toggle-audio-recording');
                    }
                }
            ]
        },
        {
            label: 'Schedule',
            submenu: [
                {
                    label: 'Schedule Workflow',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'schedule-workflow');
                    }
                },
                {
                    label: 'View Schedule',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'view-schedule');
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' },
                { type: 'separator' },
                {
                    label: 'Hide to Tray',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.hide();
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createTray() {
    const iconPath = path.join(__dirname, '../assets', process.platform === 'win32' ? 'tray-icon.ico' : 'tray-icon.png');
    
    try {
        tray = new Tray(iconPath);
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show App',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        if (process.platform === 'darwin') {
                            app.dock.show();
                        }
                    }
                }
            },
            {
                label: 'Start Recording',
                click: () => {
                    mainWindow.webContents.send('menu-action', 'start-recording');
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);
        
        tray.setToolTip('Vy Automation - Task Recording & Scheduling');
        tray.setContextMenu(contextMenu);
        
        // Double click to show window
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                if (process.platform === 'darwin') {
                    app.dock.show();
                }
            }
        });
    } catch (error) {
        console.log('Could not create tray icon:', error.message);
    }
}

// Initialize core services
async function initializeServices() {
    try {
        console.log('🔧 Initializing core services...');
        
        // Initialize database
        databaseManager = new MongoDBManager();
        await databaseManager.initialize();
        console.log('✅ Database initialized');
        
        // Initialize workflow services
        workflowRecorder = new WorkflowRecorder(mainWindow);
        workflowExecutor = new WorkflowExecutor(databaseManager);
        console.log('✅ Workflow services initialized');
        
        // Initialize scheduler
        schedulerService = new SchedulerService(databaseManager, workflowExecutor);
        await schedulerService.initialize();
        console.log('✅ Scheduler service initialized');
        
        // Initialize audio recorder
        audioRecorder = new AudioRecorder();
        console.log('✅ Audio recorder initialized');
        
        // Initialize Natural Language Processor with MCP Enhancement
        naturalLanguageProcessor = new MCPEnhancedNaturalLanguageProcessor();
        await naturalLanguageProcessor.initialize();
        console.log('✅ MCP-Enhanced Natural Language Processor initialized');
        
        console.log('🚀 All services ready!');
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
        dialog.showErrorBox('Initialization Error', `Failed to initialize services: ${error.message}`);
    }
}

// IPC Handlers
function setupIpcHandlers() {
    // Workflow management
    ipcMain.handle('workflow:create', async (event, workflowData) => {
        return await databaseManager.createWorkflow(workflowData);
    });
    
    ipcMain.handle('workflow:update', async (event, id, workflowData) => {
        return await databaseManager.updateWorkflow(id, workflowData);
    });
    
    ipcMain.handle('workflow:delete', async (event, id) => {
        return await databaseManager.deleteWorkflow(id);
    });
    
    ipcMain.handle('workflow:getAll', async () => {
        return await databaseManager.getAllWorkflows();
    });
    
    ipcMain.handle('workflow:getById', async (event, id) => {
        return await databaseManager.getWorkflowById(id);
    });
    
    // Recording controls
    ipcMain.handle('recording:start', async () => {
        return await workflowRecorder.startRecording();
    });
    
    ipcMain.handle('recording:stop', async () => {
        return await workflowRecorder.stopRecording();
    });
    
    ipcMain.handle('recording:getStatus', () => {
        return workflowRecorder.getStatus();
    });
    
    // Audio recording
    ipcMain.handle('audio:startRecording', async (event, filename) => {
        return await audioRecorder.startRecording(filename);
    });
    
    ipcMain.handle('audio:stopRecording', async () => {
        return await audioRecorder.stopRecording();
    });
    
    ipcMain.handle('audio:getStatus', () => {
        return audioRecorder.getStatus();
    });
    
    // Workflow execution
    ipcMain.handle('workflow:execute', async (event, workflowId) => {
        return await workflowExecutor.executeWorkflow(workflowId);
    });
    
    ipcMain.handle('workflow:test', async (event, workflowData) => {
        return await workflowExecutor.testWorkflow(workflowData);
    });
    
    // Scheduling
    ipcMain.handle('schedule:create', async (event, scheduleData) => {
        return await schedulerService.createSchedule(scheduleData);
    });
    
    ipcMain.handle('schedule:update', async (event, id, scheduleData) => {
        return await schedulerService.updateSchedule(id, scheduleData);
    });
    
    ipcMain.handle('schedule:delete', async (event, id) => {
        return await schedulerService.deleteSchedule(id);
    });
    
    ipcMain.handle('schedule:getAll', async () => {
        return await schedulerService.getAllSchedules();
    });
    
    ipcMain.handle('schedule:toggle', async (event, id, isActive) => {
        return await schedulerService.toggleSchedule(id, isActive);
    });
    
    // Execution history
    ipcMain.handle('execution:getHistory', async (event, filters) => {
        return await databaseManager.getExecutionHistory(filters);
    });
    
    ipcMain.handle('execution:getDetails', async (event, executionId) => {
        return await databaseManager.getExecutionDetails(executionId);
    });
    
    // System utilities
    ipcMain.handle('system:openExternal', async (event, url) => {
        await shell.openExternal(url);
    });
    
    ipcMain.handle('system:showItemInFolder', async (event, filePath) => {
        shell.showItemInFolder(filePath);
    });
    
    // Natural Language Processing with Gemini AI
    ipcMain.handle('nlp:processCommand', async (event, userCommand, options = {}) => {
        try {
            console.log(`🤖 Processing natural language command: "${userCommand}"`);
            if (!naturalLanguageProcessor) {
                throw new Error('Natural Language Processor not initialized');
            }
            const result = await naturalLanguageProcessor.processCommand(userCommand, options);
            return result;
        } catch (error) {
            console.error('❌ NLP command processing failed:', error);
            return {
                success: false,
                error: error.message,
                command: userCommand
            };
        }
    });
    
    ipcMain.handle('nlp:getCommandSuggestions', async (event, partialInput = '') => {
        try {
            if (!naturalLanguageProcessor) {
                return ['open terminal', 'take screenshot', 'open Chrome'];
            }
            return await naturalLanguageProcessor.getCommandSuggestions(partialInput);
        } catch (error) {
            console.error('❌ Failed to get command suggestions:', error);
            return ['open terminal', 'take screenshot', 'open Chrome'];
        }
    });
    
    ipcMain.handle('nlp:getCommandHelp', async (event, command) => {
        try {
            if (!naturalLanguageProcessor) {
                return 'Natural Language Processor not available';
            }
            return await naturalLanguageProcessor.getCommandHelp(command);
        } catch (error) {
            console.error('❌ Failed to get command help:', error);
            return 'Help not available';
        }
    });
    
    ipcMain.handle('nlp:getCommandHistory', async (event, limit = 10) => {
        try {
            if (!naturalLanguageProcessor) {
                return [];
            }
            return naturalLanguageProcessor.getCommandHistory(limit);
        } catch (error) {
            console.error('❌ Failed to get command history:', error);
            return [];
        }
    });
    
    ipcMain.handle('nlp:generateWorkflowSuggestions', async (event, description) => {
        try {
            if (!naturalLanguageProcessor) {
                return [];
            }
            return await naturalLanguageProcessor.generateWorkflowSuggestions(description);
        } catch (error) {
            console.error('❌ Failed to generate workflow suggestions:', error);
            return [];
        }
    });
    
    ipcMain.handle('nlp:getStatus', async () => {
        try {
            if (!naturalLanguageProcessor) {
                return { initialized: false, error: 'Service not initialized' };
            }
            return naturalLanguageProcessor.getStatus();
        } catch (error) {
            console.error('❌ Failed to get NLP status:', error);
            return { initialized: false, error: error.message };
        }
    });
}

// App event handlers
app.whenReady().then(async () => {
    createWindow();
    createMenu();
    createTray();
    setupIpcHandlers();
    
    // Initialize services after window is ready
    await initializeServices();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    // Cleanup services
    if (schedulerService) {
        await schedulerService.shutdown();
    }
    if (audioRecorder) {
        await audioRecorder.cleanup();
    }
    if (databaseManager) {
        await databaseManager.close();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Allow self-signed certificates in development
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

module.exports = { mainWindow, databaseManager, workflowRecorder, workflowExecutor, schedulerService, audioRecorder };
