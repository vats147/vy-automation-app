import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

function WorkflowsView({ appStatus, onViewChange }) {
    const { state, actions } = useApp();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            setLoading(true);
            const workflowData = await window.electronAPI.workflow.getAll();
            setWorkflows(workflowData || []);
        } catch (error) {
            console.error('Failed to load workflows:', error);
            actions.addNotification({
                type: 'error',
                title: 'Failed to load workflows',
                message: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        onViewChange('record');
    };

    const handleExecuteWorkflow = async (workflowId) => {
        try {
            actions.addNotification({
                type: 'info',
                title: 'Starting execution',
                message: 'Workflow execution has started'
            });
            
            await window.electronAPI.workflow.execute(workflowId);
        } catch (error) {
            console.error('Failed to execute workflow:', error);
            actions.addNotification({
                type: 'error',
                title: 'Execution failed',
                message: error.message
            });
        }
    };

    const handleDeleteWorkflow = async (workflowId) => {
        if (!confirm('Are you sure you want to delete this workflow?')) {
            return;
        }

        try {
            await window.electronAPI.workflow.delete(workflowId);
            await loadWorkflows();
            
            actions.addNotification({
                type: 'success',
                title: 'Workflow deleted',
                message: 'The workflow has been successfully deleted'
            });
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            actions.addNotification({
                type: 'error',
                title: 'Delete failed',
                message: error.message
            });
        }
    };

    const filteredWorkflows = workflows.filter(workflow => {
        const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterStatus === 'all' || workflow.status === filterStatus;
        
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status) => {
        const badgeTypes = {
            active: 'success',
            draft: 'warning',
            paused: 'gray',
            archived: 'gray'
        };
        
        return (
            <span className={`badge badge-${badgeTypes[status] || 'gray'}`}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="view-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container">
            <div className="view-header">
                <div className="view-title">
                    <h1>Workflows</h1>
                    <p className="view-description">
                        Create, manage, and execute your automation workflows
                    </p>
                </div>
                
                <div className="view-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleCreateNew}
                        disabled={appStatus.isRecording || appStatus.isExecuting}
                    >
                        <span>🔴</span>
                        Create New Workflow
                    </button>
                </div>
            </div>

            <div className="view-filters">
                <div className="filter-group">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search workflows..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    <select
                        className="form-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                
                <div className="filter-stats">
                    <span className="stat-item">
                        Total: {workflows.length}
                    </span>
                    <span className="stat-item">
                        Active: {workflows.filter(w => w.status === 'active').length}
                    </span>
                </div>
            </div>

            <div className="view-content">
                {filteredWorkflows.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No workflows found</h3>
                        <p>
                            {searchTerm || filterStatus !== 'all' 
                                ? 'No workflows match your search criteria.' 
                                : 'Get started by creating your first workflow.'
                            }
                        </p>
                        {!searchTerm && filterStatus === 'all' && (
                            <button className="btn btn-primary" onClick={handleCreateNew}>
                                Create Your First Workflow
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="workflows-grid">
                        {filteredWorkflows.map((workflow) => (
                            <div key={workflow.id} className="workflow-card card">
                                <div className="card-header">
                                    <div className="workflow-title">
                                        <h3>{workflow.name}</h3>
                                        {getStatusBadge(workflow.status)}
                                    </div>
                                    
                                    <div className="workflow-actions">
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => handleExecuteWorkflow(workflow.id)}
                                            disabled={workflow.status !== 'active' || appStatus.isExecuting}
                                            title="Execute workflow"
                                        >
                                            ▶️
                                        </button>
                                        
                                        <button
                                            className="btn btn-sm btn-outline"
                                            title="Edit workflow"
                                        >
                                            ✏️
                                        </button>
                                        
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDeleteWorkflow(workflow.id)}
                                            title="Delete workflow"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="card-body">
                                    {workflow.description && (
                                        <p className="workflow-description">
                                            {workflow.description}
                                        </p>
                                    )}
                                    
                                    <div className="workflow-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">Steps:</span>
                                            <span className="meta-value">{workflow.steps?.length || 0}</span>
                                        </div>
                                        
                                        <div className="meta-item">
                                            <span className="meta-label">Type:</span>
                                            <span className="meta-value">{workflow.type}</span>
                                        </div>
                                        
                                        <div className="meta-item">
                                            <span className="meta-label">Created:</span>
                                            <span className="meta-value">{formatDate(workflow.created_at)}</span>
                                        </div>
                                        
                                        {workflow.category && (
                                            <div className="meta-item">
                                                <span className="meta-label">Category:</span>
                                                <span className="meta-value">{workflow.category}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {workflow.tags && workflow.tags.length > 0 && (
                                        <div className="workflow-tags">
                                            {workflow.tags.map((tag, index) => (
                                                <span key={index} className="tag">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default WorkflowsView;
