import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import StatusBar from './components/StatusBar';
import NotificationCenter from './components/NotificationCenter';
import { AppProvider } from './context/AppContext';
import './styles/App.css';
import './styles/components.css';
import './styles/natural-language-panel.css';

function App() {
    const [currentView, setCurrentView] = useState('ai-command');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [appStatus, setAppStatus] = useState({
        isRecording: false,
        isExecuting: false,
        activeSchedules: 0,
        lastActivity: null
    });

    useEffect(() => {
        // Listen for menu actions from main process
        if (window.electronAPI?.menu?.onAction) {
            window.electronAPI.menu.onAction((action, ...args) => {
                handleMenuAction(action, ...args);
            });
        }

        // Set up status monitoring
        const statusInterval = setInterval(updateAppStatus, 5000);

        return () => {
            clearInterval(statusInterval);
            // Clean up event listeners
            if (window.electronAPI?.removeAllListeners) {
                window.electronAPI.removeAllListeners('menu-action');
            }
        };
    }, []);

    const handleMenuAction = (action, ...args) => {
        console.log('Menu action received:', action, args);
        
        switch (action) {
            case 'new-workflow':
                setCurrentView('workflows');
                // Trigger new workflow creation
                break;
                
            case 'import-workflow':
                if (args[0]) {
                    // Handle workflow import
                    handleWorkflowImport(args[0]);
                }
                break;
                
            case 'start-recording':
                handleStartRecording();
                break;
                
            case 'stop-recording':
                handleStopRecording();
                break;
                
            case 'toggle-audio-recording':
                handleToggleAudioRecording();
                break;
                
            case 'schedule-workflow':
                setCurrentView('schedule');
                break;
                
            case 'view-schedule':
                setCurrentView('schedule');
                break;
                
            default:
                console.warn('Unknown menu action:', action);
        }
    };

    const handleWorkflowImport = async (filePath) => {
        try {
            // Implementation would read and import workflow file
            console.log('Importing workflow from:', filePath);
        } catch (error) {
            console.error('Failed to import workflow:', error);
        }
    };

    const handleStartRecording = async () => {
        try {
            if (window.electronAPI?.recording?.start) {
                const result = await window.electronAPI.recording.start();
                console.log('Recording started:', result);
                setAppStatus(prev => ({ ...prev, isRecording: true }));
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const handleStopRecording = async () => {
        try {
            if (window.electronAPI?.recording?.stop) {
                const result = await window.electronAPI.recording.stop();
                console.log('Recording stopped:', result);
                setAppStatus(prev => ({ ...prev, isRecording: false }));
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    const handleToggleAudioRecording = async () => {
        try {
            if (window.electronAPI?.audio) {
                const status = await window.electronAPI.audio.getStatus();
                
                if (status.isRecording) {
                    await window.electronAPI.audio.stopRecording();
                } else {
                    await window.electronAPI.audio.startRecording();
                }
            }
        } catch (error) {
            console.error('Failed to toggle audio recording:', error);
        }
    };

    const updateAppStatus = async () => {
        try {
            if (window.electronAPI) {
                const [recordingStatus, scheduleStatus] = await Promise.allSettled([
                    window.electronAPI.recording?.getStatus?.() || Promise.resolve({ isRecording: false }),
                    window.electronAPI.schedule?.getAll?.() || Promise.resolve([])
                ]);

                setAppStatus(prev => ({
                    ...prev,
                    isRecording: recordingStatus.status === 'fulfilled' ? recordingStatus.value.isRecording : false,
                    activeSchedules: scheduleStatus.status === 'fulfilled' ? 
                        scheduleStatus.value.filter(s => s.isActive).length : 0,
                    lastActivity: Date.now()
                }));
            }
        } catch (error) {
            console.error('Failed to update app status:', error);
        }
    };

    return (
        <AppProvider>
            <div className="app">
                <div className="app-layout">
                    <Sidebar
                        currentView={currentView}
                        onViewChange={setCurrentView}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        appStatus={appStatus}
                    />
                    
                    <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                        <MainContent
                            currentView={currentView}
                            onViewChange={setCurrentView}
                            appStatus={appStatus}
                        />
                        
                        <StatusBar
                            appStatus={appStatus}
                            onRecordingToggle={() => {
                                if (appStatus.isRecording) {
                                    handleStopRecording();
                                } else {
                                    handleStartRecording();
                                }
                            }}
                        />
                    </div>
                </div>
                
                <NotificationCenter />
            </div>
        </AppProvider>
    );
}

export default App;
