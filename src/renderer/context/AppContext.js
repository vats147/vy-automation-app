import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
    workflows: [],
    schedules: [],
    executions: [],
    notifications: [],
    settings: {
        theme: 'light',
        autoSave: true,
        defaultStepDelay: 500,
        captureScreenshots: true,
        screenshotInterval: 2000
    },
    recording: {
        isRecording: false,
        currentWorkflow: null,
        stepCount: 0
    },
    execution: {
        isExecuting: false,
        currentExecution: null,
        progress: 0
    },
    audio: {
        isRecording: false,
        isAvailable: false
    }
};

// Action types
const ActionTypes = {
    // Workflows
    SET_WORKFLOWS: 'SET_WORKFLOWS',
    ADD_WORKFLOW: 'ADD_WORKFLOW',
    UPDATE_WORKFLOW: 'UPDATE_WORKFLOW',
    DELETE_WORKFLOW: 'DELETE_WORKFLOW',
    
    // Schedules
    SET_SCHEDULES: 'SET_SCHEDULES',
    ADD_SCHEDULE: 'ADD_SCHEDULE',
    UPDATE_SCHEDULE: 'UPDATE_SCHEDULE',
    DELETE_SCHEDULE: 'DELETE_SCHEDULE',
    
    // Executions
    SET_EXECUTIONS: 'SET_EXECUTIONS',
    ADD_EXECUTION: 'ADD_EXECUTION',
    UPDATE_EXECUTION: 'UPDATE_EXECUTION',
    
    // Recording
    SET_RECORDING_STATUS: 'SET_RECORDING_STATUS',
    UPDATE_RECORDING: 'UPDATE_RECORDING',
    
    // Execution
    SET_EXECUTION_STATUS: 'SET_EXECUTION_STATUS',
    UPDATE_EXECUTION_PROGRESS: 'UPDATE_EXECUTION_PROGRESS',
    
    // Audio
    SET_AUDIO_STATUS: 'SET_AUDIO_STATUS',
    
    // Notifications
    ADD_NOTIFICATION: 'ADD_NOTIFICATION',
    REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
    CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
    
    // Settings
    UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
        case ActionTypes.SET_WORKFLOWS:
            return { ...state, workflows: action.payload };
            
        case ActionTypes.ADD_WORKFLOW:
            return { 
                ...state, 
                workflows: [...state.workflows, action.payload] 
            };
            
        case ActionTypes.UPDATE_WORKFLOW:
            return {
                ...state,
                workflows: state.workflows.map(workflow =>
                    workflow.id === action.payload.id ? action.payload : workflow
                )
            };
            
        case ActionTypes.DELETE_WORKFLOW:
            return {
                ...state,
                workflows: state.workflows.filter(workflow => workflow.id !== action.payload)
            };
            
        case ActionTypes.SET_SCHEDULES:
            return { ...state, schedules: action.payload };
            
        case ActionTypes.ADD_SCHEDULE:
            return { 
                ...state, 
                schedules: [...state.schedules, action.payload] 
            };
            
        case ActionTypes.UPDATE_SCHEDULE:
            return {
                ...state,
                schedules: state.schedules.map(schedule =>
                    schedule.id === action.payload.id ? action.payload : schedule
                )
            };
            
        case ActionTypes.DELETE_SCHEDULE:
            return {
                ...state,
                schedules: state.schedules.filter(schedule => schedule.id !== action.payload)
            };
            
        case ActionTypes.SET_EXECUTIONS:
            return { ...state, executions: action.payload };
            
        case ActionTypes.ADD_EXECUTION:
            return { 
                ...state, 
                executions: [action.payload, ...state.executions] 
            };
            
        case ActionTypes.UPDATE_EXECUTION:
            return {
                ...state,
                executions: state.executions.map(execution =>
                    execution.id === action.payload.id ? action.payload : execution
                )
            };
            
        case ActionTypes.SET_RECORDING_STATUS:
            return {
                ...state,
                recording: { ...state.recording, ...action.payload }
            };
            
        case ActionTypes.UPDATE_RECORDING:
            return {
                ...state,
                recording: { ...state.recording, ...action.payload }
            };
            
        case ActionTypes.SET_EXECUTION_STATUS:
            return {
                ...state,
                execution: { ...state.execution, ...action.payload }
            };
            
        case ActionTypes.UPDATE_EXECUTION_PROGRESS:
            return {
                ...state,
                execution: { ...state.execution, progress: action.payload }
            };
            
        case ActionTypes.SET_AUDIO_STATUS:
            return {
                ...state,
                audio: { ...state.audio, ...action.payload }
            };
            
        case ActionTypes.ADD_NOTIFICATION:
            return {
                ...state,
                notifications: [...state.notifications, action.payload]
            };
            
        case ActionTypes.REMOVE_NOTIFICATION:
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload)
            };
            
        case ActionTypes.CLEAR_NOTIFICATIONS:
            return {
                ...state,
                notifications: []
            };
            
        case ActionTypes.UPDATE_SETTINGS:
            return {
                ...state,
                settings: { ...state.settings, ...action.payload }
            };
            
        default:
            return state;
    }
}

// Context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Load initial data
    useEffect(() => {
        loadInitialData();
        setupEventListeners();
        
        return () => {
            cleanupEventListeners();
        };
    }, []);

    const loadInitialData = async () => {
        try {
            if (window.electronAPI) {
                // Load workflows
                const workflows = await window.electronAPI.workflow.getAll();
                dispatch({ type: ActionTypes.SET_WORKFLOWS, payload: workflows });
                
                // Load schedules
                const schedules = await window.electronAPI.schedule.getAll();
                dispatch({ type: ActionTypes.SET_SCHEDULES, payload: schedules });
                
                // Load recent executions
                const executions = await window.electronAPI.execution.getHistory({ limit: 50 });
                dispatch({ type: ActionTypes.SET_EXECUTIONS, payload: executions });
                
                // Get recording status
                const recordingStatus = await window.electronAPI.recording.getStatus();
                dispatch({ type: ActionTypes.SET_RECORDING_STATUS, payload: recordingStatus });
                
                // Get audio status
                const audioStatus = await window.electronAPI.audio.getStatus();
                dispatch({ type: ActionTypes.SET_AUDIO_STATUS, payload: audioStatus });
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            addNotification({
                type: 'error',
                title: 'Failed to load data',
                message: error.message
            });
        }
    };

    const setupEventListeners = () => {
        if (!window.electronAPI) return;

        // Recording events
        if (window.electronAPI.recording) {
            window.electronAPI.recording.onRecordingStarted?.((data) => {
                dispatch({ type: ActionTypes.SET_RECORDING_STATUS, payload: { isRecording: true, ...data } });
                addNotification({
                    type: 'success',
                    title: 'Recording Started',
                    message: 'Workflow recording has begun'
                });
            });

            window.electronAPI.recording.onRecordingStopped?.((data) => {
                dispatch({ type: ActionTypes.SET_RECORDING_STATUS, payload: { isRecording: false } });
                addNotification({
                    type: 'success',
                    title: 'Recording Stopped',
                    message: `Recorded ${data.stepCount} steps`
                });
            });

            window.electronAPI.recording.onRecordingUpdate?.((data) => {
                dispatch({ type: ActionTypes.UPDATE_RECORDING, payload: data });
            });
        }

        // Execution events
        if (window.electronAPI.execution) {
            window.electronAPI.execution.onExecutionStarted?.((data) => {
                dispatch({ type: ActionTypes.SET_EXECUTION_STATUS, payload: { isExecuting: true, currentExecution: data } });
                addNotification({
                    type: 'info',
                    title: 'Execution Started',
                    message: `Running workflow: ${data.workflowName}`
                });
            });

            window.electronAPI.execution.onExecutionCompleted?.((data) => {
                dispatch({ type: ActionTypes.SET_EXECUTION_STATUS, payload: { isExecuting: false, currentExecution: null } });
                addNotification({
                    type: 'success',
                    title: 'Execution Completed',
                    message: `Workflow completed successfully`
                });
                // Refresh executions list
                refreshExecutions();
            });

            window.electronAPI.execution.onExecutionProgress?.((data) => {
                dispatch({ type: ActionTypes.UPDATE_EXECUTION_PROGRESS, payload: data.progress });
            });

            window.electronAPI.execution.onExecutionError?.((data) => {
                dispatch({ type: ActionTypes.SET_EXECUTION_STATUS, payload: { isExecuting: false, currentExecution: null } });
                addNotification({
                    type: 'error',
                    title: 'Execution Failed',
                    message: data.error
                });
            });
        }

        // Schedule events
        if (window.electronAPI.schedule) {
            window.electronAPI.schedule.onScheduleTriggered?.((data) => {
                addNotification({
                    type: 'info',
                    title: 'Schedule Triggered',
                    message: `Running scheduled workflow: ${data.scheduleName}`
                });
            });

            window.electronAPI.schedule.onScheduleCompleted?.((data) => {
                addNotification({
                    type: 'success',
                    title: 'Scheduled Execution Completed',
                    message: `${data.scheduleName} completed successfully`
                });
            });

            window.electronAPI.schedule.onScheduleError?.((data) => {
                addNotification({
                    type: 'error',
                    title: 'Scheduled Execution Failed',
                    message: data.error
                });
            });
        }

        // Audio events
        if (window.electronAPI.audio) {
            window.electronAPI.audio.onAudioUpdate?.((data) => {
                dispatch({ type: ActionTypes.SET_AUDIO_STATUS, payload: data });
            });
        }
    };

    const cleanupEventListeners = () => {
        if (window.electronAPI?.removeAllListeners) {
            window.electronAPI.removeAllListeners('recording:started');
            window.electronAPI.removeAllListeners('recording:stopped');
            window.electronAPI.removeAllListeners('recording:update');
            window.electronAPI.removeAllListeners('execution:started');
            window.electronAPI.removeAllListeners('execution:completed');
            window.electronAPI.removeAllListeners('execution:progress');
            window.electronAPI.removeAllListeners('execution:error');
            window.electronAPI.removeAllListeners('schedule:triggered');
            window.electronAPI.removeAllListeners('schedule:completed');
            window.electronAPI.removeAllListeners('schedule:error');
            window.electronAPI.removeAllListeners('audio:update');
        }
    };

    // Action creators
    const addNotification = (notification) => {
        const id = Date.now().toString();
        dispatch({
            type: ActionTypes.ADD_NOTIFICATION,
            payload: { ...notification, id, timestamp: Date.now() }
        });

        // Auto-remove notification after 5 seconds (except errors)
        if (notification.type !== 'error') {
            setTimeout(() => {
                dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
            }, 5000);
        }
    };

    const removeNotification = (id) => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
    };

    const refreshWorkflows = async () => {
        try {
            const workflows = await window.electronAPI.workflow.getAll();
            dispatch({ type: ActionTypes.SET_WORKFLOWS, payload: workflows });
        } catch (error) {
            console.error('Failed to refresh workflows:', error);
        }
    };

    const refreshSchedules = async () => {
        try {
            const schedules = await window.electronAPI.schedule.getAll();
            dispatch({ type: ActionTypes.SET_SCHEDULES, payload: schedules });
        } catch (error) {
            console.error('Failed to refresh schedules:', error);
        }
    };

    const refreshExecutions = async () => {
        try {
            const executions = await window.electronAPI.execution.getHistory({ limit: 50 });
            dispatch({ type: ActionTypes.SET_EXECUTIONS, payload: executions });
        } catch (error) {
            console.error('Failed to refresh executions:', error);
        }
    };

    const updateSettings = (newSettings) => {
        dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: newSettings });
        
        // Persist settings to local storage
        try {
            localStorage.setItem('vy-settings', JSON.stringify({ ...state.settings, ...newSettings }));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    // Context value
    const contextValue = {
        state,
        dispatch,
        actions: {
            addNotification,
            removeNotification,
            refreshWorkflows,
            refreshSchedules,
            refreshExecutions,
            updateSettings
        }
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

// Hook to use the context
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

export { ActionTypes };
