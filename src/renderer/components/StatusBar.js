import React from 'react';

function StatusBar({ appStatus, onRecordingToggle }) {
    const formatDuration = (ms) => {
        if (!ms) return '00:00';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getStatusMessage = () => {
        if (appStatus.isRecording) {
            return 'Recording workflow...';
        } else if (appStatus.isExecuting) {
            return 'Executing workflow...';
        } else if (appStatus.activeSchedules > 0) {
            return `${appStatus.activeSchedules} active schedule${appStatus.activeSchedules > 1 ? 's' : ''}`;
        } else {
            return 'Ready';
        }
    };

    return (
        <div className="status-bar">
            <div className="status-left">
                <div className="status-message">
                    <span className={`status-indicator ${
                        appStatus.isRecording ? 'recording' : 
                        appStatus.isExecuting ? 'executing' : 
                        appStatus.activeSchedules > 0 ? 'active' : 'inactive'
                    }`}></span>
                    <span className="status-text">{getStatusMessage()}</span>
                </div>
                
                {appStatus.isRecording && (
                    <div className="recording-info">
                        <span className="recording-duration">
                            {formatDuration(appStatus.recordingDuration)}
                        </span>
                        {appStatus.stepCount > 0 && (
                            <span className="step-count">
                                {appStatus.stepCount} step{appStatus.stepCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}
                
                {appStatus.isExecuting && appStatus.executionProgress && (
                    <div className="execution-info">
                        <div className="progress-bar">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${appStatus.executionProgress}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">
                            {Math.round(appStatus.executionProgress)}%
                        </span>
                    </div>
                )}
            </div>

            <div className="status-right">
                <div className="status-actions">
                    {appStatus.isRecording && (
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={onRecordingToggle}
                            title="Stop recording"
                        >
                            ⏹️ Stop
                        </button>
                    )}
                    
                    {!appStatus.isRecording && !appStatus.isExecuting && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={onRecordingToggle}
                            title="Start recording"
                        >
                            🔴 Record
                        </button>
                    )}
                </div>
                
                <div className="status-info">
                    {appStatus.lastActivity && (
                        <span className="last-activity">
                            Last activity: {new Date(appStatus.lastActivity).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StatusBar;
