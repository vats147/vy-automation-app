import React from 'react';
import { useApp } from '../context/AppContext';

function NotificationCenter() {
    const { state, actions } = useApp();
    const { notifications } = state;

    if (notifications.length === 0) {
        return null;
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    const getNotificationClass = (type) => {
        switch (type) {
            case 'success':
                return 'notification-success';
            case 'error':
                return 'notification-error';
            case 'warning':
                return 'notification-warning';
            case 'info':
            default:
                return 'notification-info';
        }
    };

    return (
        <div className="notification-center">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`notification ${getNotificationClass(notification.type)}`}
                >
                    <div className="notification-icon">
                        {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="notification-content">
                        <div className="notification-title">
                            {notification.title}
                        </div>
                        {notification.message && (
                            <div className="notification-message">
                                {notification.message}
                            </div>
                        )}
                    </div>
                    
                    <button
                        className="notification-close"
                        onClick={() => actions.removeNotification(notification.id)}
                        title="Close notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

export default NotificationCenter;
