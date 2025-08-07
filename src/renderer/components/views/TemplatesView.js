import React from 'react';

function TemplatesView({ appStatus }) {
    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Workflow Templates</h1>
                    <p className="view-description">
                        Browse and use pre-built workflow templates to get started quickly
                    </p>
                </div>
            </div>

            <div className="view-content">
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>Workflow Templates</h3>
                    <p>This feature is coming soon! You'll be able to browse and use pre-built workflow templates.</p>
                </div>
            </div>
        </div>
    );
}

export default TemplatesView;
