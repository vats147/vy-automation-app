import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

function RecordView({ appStatus }) {
    const { actions } = useApp();
    const [recordingStatus, setRecordingStatus] = useState({
        isRecording: false,
        workflowId: null,
        stepCount: 0,
        duration: 0
    });
    const [workflowName, setWorkflowName] = useState('');
    const [workflowDescription, setWorkflowDescription] = useState('');

    useEffect(() => {
        updateRecordingStatus();
        const interval = setInterval(updateRecordingStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const updateRecordingStatus = async () => {
        try {
            if (window.electronAPI?.recording?.getStatus) {
                const status = await window.electronAPI.recording.getStatus();
                setRecordingStatus(status);
            }
        } catch (error) {
            console.error('Failed to get recording status:', error);
        }
    };

    const handleStartRecording = async () => {
        if (!workflowName.trim()) {
            actions.addNotification({
                type: 'warning',
                title: 'Workflow name required',
                message: 'Please enter a name for your workflow before recording'
            });
            return;
        }

        try {
            const result = await window.electronAPI.recording.start();
            actions.addNotification({
                type: 'success',
                title: 'Recording started',
                message: 'Start performing the actions you want to automate'
            });
        } catch (error) {
            console.error('Failed to start recording:', error);
            actions.addNotification({
                type: 'error',
                title: 'Recording failed',
                message: error.message
            });
        }
    };

    const handleStopRecording = async () => {
        try {
            const result = await window.electronAPI.recording.stop();
            
            // Save the workflow
            if (result.steps && result.steps.length > 0) {
                await window.electronAPI.workflow.create({
                    name: workflowName,
                    description: workflowDescription,
                    type: 'recorded',
                    status: 'active',
                    steps: result.steps,
                    screenshotPaths: result.screenshots || []
                });

                actions.addNotification({
                    type: 'success',
                    title: 'Workflow saved',
                    message: `Successfully recorded workflow with ${result.steps.length} steps`
                });

                // Reset form
                setWorkflowName('');
                setWorkflowDescription('');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            actions.addNotification({
                type: 'error',
                title: 'Failed to save workflow',
                message: error.message
            });
        }
    };

    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Record Workflow</h1>
                    <p className="view-description">
                        Record your screen interactions to create automated workflows
                    </p>
                </div>
            </div>

            <div className="view-content">
                <div className="record-panel">
                    <div className="record-setup">
                        <div className="form-group">
                            <label className="form-label">Workflow Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter workflow name..."
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                disabled={recordingStatus.isRecording}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Optional description of what this workflow does..."
                                value={workflowDescription}
                                onChange={(e) => setWorkflowDescription(e.target.value)}
                                disabled={recordingStatus.isRecording}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="record-controls">
                        {!recordingStatus.isRecording ? (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleStartRecording}
                                disabled={!workflowName.trim()}
                            >
                                <span>🔴</span>
                                Start Recording
                            </button>
                        ) : (
                            <button
                                className="btn btn-danger btn-lg"
                                onClick={handleStopRecording}
                            >
                                <span>⏹️</span>
                                Stop Recording
                            </button>
                        )}
                    </div>

                    {recordingStatus.isRecording && (
                        <div className="record-status">
                            <div className="status-header">
                                <div className="recording-indicator">
                                    <span className="status-indicator recording"></span>
                                    <span className="status-text">Recording in progress...</span>
                                </div>
                                
                                <div className="recording-timer">
                                    {formatDuration(recordingStatus.duration)}
                                </div>
                            </div>

                            <div className="recording-info">
                                <div className="info-item">
                                    <span className="info-label">Steps recorded:</span>
                                    <span className="info-value">{recordingStatus.stepCount}</span>
                                </div>
                                
                                <div className="info-item">
                                    <span className="info-label">Workflow:</span>
                                    <span className="info-value">{workflowName}</span>
                                </div>
                            </div>

                            <div className="recording-tips">
                                <h4>Recording Tips:</h4>
                                <ul>
                                    <li>Perform actions slowly and deliberately</li>
                                    <li>Wait for pages to load completely before continuing</li>
                                    <li>Use keyboard shortcuts Cmd+Shift+M to add manual markers</li>
                                    <li>Click Cmd+Shift+R to stop recording when finished</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {!recordingStatus.isRecording && (
                        <div className="record-instructions">
                            <h3>How to Record a Workflow</h3>
                            <div className="instructions-grid">
                                <div className="instruction-item">
                                    <div className="instruction-icon">1️⃣</div>
                                    <div className="instruction-content">
                                        <h4>Setup</h4>
                                        <p>Enter a descriptive name for your workflow and optionally add a description.</p>
                                    </div>
                                </div>
                                
                                <div className="instruction-item">
                                    <div className="instruction-icon">2️⃣</div>
                                    <div className="instruction-content">
                                        <h4>Record</h4>
                                        <p>Click "Start Recording" and perform the actions you want to automate.</p>
                                    </div>
                                </div>
                                
                                <div className="instruction-item">
                                    <div className="instruction-icon">3️⃣</div>
                                    <div className="instruction-content">
                                        <h4>Save</h4>
                                        <p>Click "Stop Recording" when finished. Your workflow will be saved automatically.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="keyboard-shortcuts">
                                <h4>Keyboard Shortcuts</h4>
                                <div className="shortcuts-list">
                                    <div className="shortcut-item">
                                        <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
                                        <span>Start/Stop Recording</span>
                                    </div>
                                    <div className="shortcut-item">
                                        <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>
                                        <span>Add Manual Marker</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RecordView;
