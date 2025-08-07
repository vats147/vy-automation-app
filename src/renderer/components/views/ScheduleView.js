import React from 'react';

function ScheduleView({ appStatus }) {
    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Schedule</h1>
                    <p className="view-description">
                        Schedule workflows to run automatically at specified times
                    </p>
                </div>
                
                <div className="view-actions">
                    <button className="btn btn-primary">
                        <span>⏰</span>
                        New Schedule
                    </button>
                </div>
            </div>

            <div className="view-content">
                <div className="empty-state">
                    <div className="empty-icon">⏰</div>
                    <h3>Schedule Management</h3>
                    <p>This feature is coming soon! You'll be able to schedule workflows to run automatically.</p>
                </div>
            </div>
        </div>
    );
}

export default ScheduleView;
