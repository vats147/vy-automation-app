import React from 'react';

function SettingsView({ appStatus }) {
    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Settings</h1>
                    <p className="view-description">
                        Configure application preferences and automation settings
                    </p>
                </div>
            </div>

            <div className="view-content">
                <div className="empty-state">
                    <div className="empty-icon">⚙️</div>
                    <h3>Application Settings</h3>
                    <p>This feature is coming soon! You'll be able to configure all application settings here.</p>
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
