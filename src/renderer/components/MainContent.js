import React from 'react';
import NaturalLanguagePanel from './NaturalLanguagePanel';
import WorkflowsView from './views/WorkflowsView';
import RecordView from './views/RecordView';
import ScheduleView from './views/ScheduleView';
import HistoryView from './views/HistoryView';
import TemplatesView from './views/TemplatesView';
import SettingsView from './views/SettingsView';

function MainContent({ currentView, onViewChange, appStatus }) {
    const renderView = () => {
        switch (currentView) {
            case 'ai-command':
                return <NaturalLanguagePanel />;
            case 'workflows':
                return <WorkflowsView appStatus={appStatus} onViewChange={onViewChange} />;
            case 'record':
                return <RecordView appStatus={appStatus} />;
            case 'schedule':
                return <ScheduleView appStatus={appStatus} />;
            case 'history':
                return <HistoryView appStatus={appStatus} />;
            case 'templates':
                return <TemplatesView appStatus={appStatus} />;
            case 'settings':
                return <SettingsView appStatus={appStatus} />;
            default:
                return <NaturalLanguagePanel />;
        }
    };

    return (
        <main className="main-content">
            <div className="content-container">
                {renderView()}
            </div>
        </main>
    );
}

export default MainContent;
