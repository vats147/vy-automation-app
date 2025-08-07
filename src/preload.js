const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Workflow operations
    workflow: {
        create: (workflowData) => ipcRenderer.invoke('workflow:create', workflowData),
        update: (id, workflowData) => ipcRenderer.invoke('workflow:update', id, workflowData),
        delete: (id) => ipcRenderer.invoke('workflow:delete', id),
        getAll: () => ipcRenderer.invoke('workflow:getAll'),
        getById: (id) => ipcRenderer.invoke('workflow:getById', id),
        execute: (workflowId) => ipcRenderer.invoke('workflow:execute', workflowId),
        test: (workflowData) => ipcRenderer.invoke('workflow:test', workflowData)
    },
    
    // Recording operations
    recording: {
        start: () => ipcRenderer.invoke('recording:start'),
        stop: () => ipcRenderer.invoke('recording:stop'),
        getStatus: () => ipcRenderer.invoke('recording:getStatus'),
        
        // Event listeners for recording updates
        onRecordingUpdate: (callback) => {
            ipcRenderer.on('recording:update', (event, data) => callback(data));
        },
        onRecordingStarted: (callback) => {
            ipcRenderer.on('recording:started', (event, data) => callback(data));
        },
        onRecordingStopped: (callback) => {
            ipcRenderer.on('recording:stopped', (event, data) => callback(data));
        },
        onRecordingError: (callback) => {
            ipcRenderer.on('recording:error', (event, error) => callback(error));
        }
    },
    
    // Audio recording operations
    audio: {
        startRecording: (filename) => ipcRenderer.invoke('audio:startRecording', filename),
        stopRecording: () => ipcRenderer.invoke('audio:stopRecording'),
        getStatus: () => ipcRenderer.invoke('audio:getStatus'),
        
        // Event listeners for audio updates
        onAudioUpdate: (callback) => {
            ipcRenderer.on('audio:update', (event, data) => callback(data));
        },
        onAudioError: (callback) => {
            ipcRenderer.on('audio:error', (event, error) => callback(error));
        }
    },
    
    // Scheduling operations
    schedule: {
        create: (scheduleData) => ipcRenderer.invoke('schedule:create', scheduleData),
        update: (id, scheduleData) => ipcRenderer.invoke('schedule:update', id, scheduleData),
        delete: (id) => ipcRenderer.invoke('schedule:delete', id),
        getAll: () => ipcRenderer.invoke('schedule:getAll'),
        toggle: (id, isActive) => ipcRenderer.invoke('schedule:toggle', id, isActive),
        
        // Event listeners for schedule updates
        onScheduleTriggered: (callback) => {
            ipcRenderer.on('schedule:triggered', (event, data) => callback(data));
        },
        onScheduleCompleted: (callback) => {
            ipcRenderer.on('schedule:completed', (event, data) => callback(data));
        },
        onScheduleError: (callback) => {
            ipcRenderer.on('schedule:error', (event, error) => callback(error));
        }
    },
    
    // Execution history operations
    execution: {
        getHistory: (filters) => ipcRenderer.invoke('execution:getHistory', filters),
        getDetails: (executionId) => ipcRenderer.invoke('execution:getDetails', executionId),
        
        // Event listeners for execution updates
        onExecutionStarted: (callback) => {
            ipcRenderer.on('execution:started', (event, data) => callback(data));
        },
        onExecutionProgress: (callback) => {
            ipcRenderer.on('execution:progress', (event, data) => callback(data));
        },
        onExecutionCompleted: (callback) => {
            ipcRenderer.on('execution:completed', (event, data) => callback(data));
        },
        onExecutionError: (callback) => {
            ipcRenderer.on('execution:error', (event, error) => callback(error));
        }
    },
    
    // Natural Language Processing with Gemini AI
    nlpProcessCommand: (command, options) => ipcRenderer.invoke('nlp:processCommand', command, options),
    nlpGetCommandSuggestions: (partialInput) => ipcRenderer.invoke('nlp:getCommandSuggestions', partialInput),
    nlpGetCommandHelp: (command) => ipcRenderer.invoke('nlp:getCommandHelp', command),
    nlpGetCommandHistory: (limit) => ipcRenderer.invoke('nlp:getCommandHistory', limit),
    nlpGenerateWorkflowSuggestions: (description) => ipcRenderer.invoke('nlp:generateWorkflowSuggestions', description),
    nlpGetStatus: () => ipcRenderer.invoke('nlp:getStatus'),
    
    // System utilities
    system: {
        openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
        showItemInFolder: (filePath) => ipcRenderer.invoke('system:showItemInFolder', filePath)
    },
    
    // Menu actions
    menu: {
        onAction: (callback) => {
            ipcRenderer.on('menu-action', (event, action, ...args) => callback(action, ...args));
        }
    },
    
    // Notifications
    notifications: {
        onNotification: (callback) => {
            ipcRenderer.on('notification', (event, notification) => callback(notification));
        }
    },
    
    // Cleanup event listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

// Expose version information
contextBridge.exposeInMainWorld('appInfo', {
    version: process.env.npm_package_version || '1.0.0',
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome
});

// Expose environment information
contextBridge.exposeInMainWorld('environment', {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
});

// Console logging for development
if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('devConsole', {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        info: (...args) => console.info(...args)
    });
}

// Security: Remove Node.js globals from window object
delete window.require;
delete window.exports;
delete window.module;
