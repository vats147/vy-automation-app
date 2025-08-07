import React from 'react';

function Sidebar({ currentView, onViewChange, collapsed, onToggleCollapse, appStatus }) {
    const sidebarItems = [
        {
            id: 'ai-command',
            label: 'AI Commands',
            icon: '🤖',
            description: 'Natural language automation with Gemini AI',
            badge: 'NEW',
            badgeType: 'success'
        },
        {
            id: 'workflows',
            label: 'Workflows',
            icon: '📋',
            description: 'Create and manage workflows'
        },
        {
            id: 'record',
            label: 'Record',
            icon: '🔴',
            description: 'Record new workflows',
            badge: appStatus.isRecording ? 'REC' : null,
            badgeType: 'danger'
        },
        {
            id: 'schedule',
            label: 'Schedule',
            icon: '⏰',
            description: 'Schedule workflow execution',
            badge: appStatus.activeSchedules > 0 ? appStatus.activeSchedules : null,
            badgeType: 'primary'
        },
        {
            id: 'history',
            label: 'History',
            icon: '📊',
            description: 'View execution history'
        },
        {
            id: 'templates',
            label: 'Templates',
            icon: '📝',
            description: 'Browse workflow templates'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: '⚙️',
            description: 'Application settings'
        }
    ];

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <span className="brand-icon">🚀</span>
                    {!collapsed && <span className="brand-text">Vy Automation</span>}
                </div>
                
                <button
                    className="sidebar-toggle"
                    onClick={onToggleCollapse}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            <nav className="sidebar-nav">
                {sidebarItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id)}
                        title={collapsed ? item.label : item.description}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && (
                            <>
                                <span className="sidebar-item-label">{item.label}</span>
                                {item.badge && (
                                    <span className={`sidebar-item-badge badge badge-${item.badgeType}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                ))}
            </nav>

            {!collapsed && (
                <div className="sidebar-footer">
                    <div className="app-status">
                        <div className="status-item">
                            <span className={`status-indicator ${appStatus.isRecording ? 'recording' : 'inactive'}`}></span>
                            <span className="status-text">
                                {appStatus.isRecording ? 'Recording' : 'Ready'}
                            </span>
                        </div>
                        
                        {appStatus.isExecuting && (
                            <div className="status-item">
                                <span className="status-indicator executing"></span>
                                <span className="status-text">Executing</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sidebar;
