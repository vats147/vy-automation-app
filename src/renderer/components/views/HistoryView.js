import React from 'react';

function HistoryView({ appStatus }) {
    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Execution History</h1>
                    <p className="view-description">
                        View detailed logs and results of your workflow executions
                    </p>
                </div>
            </div>

            <div className="view-content">
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>Execution History</h3>
                    <p>This feature is coming soon! You'll be able to view detailed execution logs and analytics.</p>
                </div>
            </div>
        </div>
    );
}

export default HistoryView;
