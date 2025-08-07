import React, { useState, useEffect, useRef } from 'react';

const NaturalLanguagePanel = () => {
    const [command, setCommand] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [commandHistory, setCommandHistory] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [helpText, setHelpText] = useState('');
    const [nlpStatus, setNlpStatus] = useState({ initialized: false });
    
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        // Check NLP service status on mount
        checkNlpStatus();
        loadCommandHistory();
        
        // Load initial suggestions
        loadSuggestions('');
    }, []);

    useEffect(() => {
        // Load suggestions when command changes
        const timer = setTimeout(() => {
            if (command.length > 0) {
                loadSuggestions(command);
                loadHelpText(command);
            } else {
                loadSuggestions('');
                setHelpText('');
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [command]);

    const checkNlpStatus = async () => {
        try {
            const status = await window.electronAPI.nlpGetStatus();
            setNlpStatus(status);
        } catch (error) {
            console.error('Failed to check NLP status:', error);
        }
    };

    const loadCommandHistory = async () => {
        try {
            const history = await window.electronAPI.nlpGetCommandHistory(5);
            setCommandHistory(history);
        } catch (error) {
            console.error('Failed to load command history:', error);
        }
    };

    const loadSuggestions = async (input) => {
        try {
            const suggestions = await window.electronAPI.nlpGetCommandSuggestions(input);
            setSuggestions(suggestions);
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    };

    const loadHelpText = async (input) => {
        try {
            const help = await window.electronAPI.nlpGetCommandHelp(input);
            setHelpText(help);
        } catch (error) {
            console.error('Failed to load help text:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!command.trim()) return;
        
        setIsProcessing(true);
        setResults(null);
        setShowSuggestions(false);
        
        try {
            console.log('🚀 Executing command:', command);
            
            const result = await window.electronAPI.nlpProcessCommand(command, {
                stopOnError: false
            });
            
            setResults(result);
            
            if (result.success) {
                console.log('✅ Command executed successfully:', result);
                // Clear the input after successful execution
                setCommand('');
                // Reload command history
                loadCommandHistory();
            } else {
                console.error('❌ Command execution failed:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Failed to process command:', error);
            setResults({
                success: false,
                error: error.message,
                command: command
            });
        }
        
        setIsProcessing(false);
    };

    const handleSuggestionClick = (suggestion) => {
        setCommand(suggestion);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleHistoryClick = (historyItem) => {
        setCommand(historyItem.command);
        inputRef.current?.focus();
    };

    const handleInputFocus = () => {
        setShowSuggestions(true);
    };

    const handleInputBlur = () => {
        // Delay hiding suggestions to allow clicks
        setTimeout(() => setShowSuggestions(false), 200);
    };

    const handleDryRun = async () => {
        if (!command.trim()) return;
        
        setIsProcessing(true);
        
        try {
            const result = await window.electronAPI.nlpProcessCommand(command, {
                dryRun: true
            });
            setResults(result);
        } catch (error) {
            console.error('❌ Dry run failed:', error);
        }
        
        setIsProcessing(false);
    };

    const formatExecutionTime = (timestamp1, timestamp2) => {
        if (!timestamp1 || !timestamp2) return 'N/A';
        const diff = new Date(timestamp2) - new Date(timestamp1);
        return `${diff}ms`;
    };

    return (
        <div className="natural-language-panel">
            <div className="nlp-header">
                <h3>🤖 AI Command Center</h3>
                <div className="nlp-status">
                    <span className={`status-indicator ${nlpStatus.initialized ? 'active' : 'inactive'}`}>
                        {nlpStatus.initialized ? '🟢 AI Ready' : '🟡 Limited Mode'}
                    </span>
                    {nlpStatus.gemini_ai && <span className="ai-badge">Gemini AI</span>}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="command-form">
                <div className="input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Tell me what to do... (e.g., 'open terminal and run ls')"
                        className="command-input"
                        disabled={isProcessing}
                    />
                    
                    {showSuggestions && suggestions.length > 0 && (
                        <div ref={suggestionsRef} className="suggestions-dropdown">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    💡 {suggestion}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="button-group">
                    <button 
                        type="submit" 
                        disabled={isProcessing || !command.trim()}
                        className="execute-btn primary"
                    >
                        {isProcessing ? '⏳ Processing...' : '⚡ Execute'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleDryRun}
                        disabled={isProcessing || !command.trim()}
                        className="dry-run-btn secondary"
                    >
                        🔍 Preview
                    </button>
                </div>
            </form>

            {helpText && (
                <div className="help-text">
                    <span className="help-icon">💡</span>
                    {helpText}
                </div>
            )}

            {results && (
                <div className="results-panel">
                    <div className={`result-header ${results.success ? 'success' : 'error'}`}>
                        <h4>
                            {results.success ? '✅ Execution Complete' : '❌ Execution Failed'}
                        </h4>
                        <div className="result-meta">
                            Command: "{results.command}"
                        </div>
                    </div>

                    {results.error && (
                        <div className="error-message">
                            <strong>Error:</strong> {results.error}
                        </div>
                    )}

                    {results.plan && (
                        <div className="execution-plan">
                            <h5>📋 Execution Plan</h5>
                            <div className="plan-details">
                                <p><strong>Intent:</strong> {results.plan.intent}</p>
                                <p><strong>Description:</strong> {results.plan.description}</p>
                                <p><strong>Risk Level:</strong> 
                                    <span className={`risk-level ${results.plan.risk_level}`}>
                                        {results.plan.risk_level}
                                    </span>
                                </p>
                                {results.plan.estimated_duration && (
                                    <p><strong>Estimated Time:</strong> {results.plan.estimated_duration}ms</p>
                                )}
                            </div>
                        </div>
                    )}

                    {results.results && results.results.steps && (
                        <div className="execution-steps">
                            <h5>⚡ Execution Steps</h5>
                            {results.results.steps.map((step, index) => (
                                <div key={index} className={`step-item ${step.success ? 'success' : 'error'}`}>
                                    <div className="step-header">
                                        <span className="step-number">{step.step}</span>
                                        <span className="step-type">{step.type}</span>
                                        <span className={`step-status ${step.success ? 'success' : 'error'}`}>
                                            {step.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                    <div className="step-description">{step.description}</div>
                                    {step.error && (
                                        <div className="step-error">Error: {step.error}</div>
                                    )}
                                    {step.result && typeof step.result === 'object' && (
                                        <div className="step-result">
                                            <pre>{JSON.stringify(step.result, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {results.results.summary && (
                                <div className="execution-summary">
                                    <h6>📊 Execution Summary</h6>
                                    <div className="summary-stats">
                                        <span>Total Steps: {results.results.summary.total_steps}</span>
                                        <span>Success Rate: {results.results.summary.success_rate}%</span>
                                        <span>Duration: {results.results.summary.execution_time}ms</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {results.results && results.results.dryRun && (
                        <div className="dry-run-results">
                            <h5>🔍 Dry Run Preview</h5>
                            <p>The following steps would be executed:</p>
                            {results.results.steps.map((step, index) => (
                                <div key={index} className="preview-step">
                                    <span className="step-number">{index + 1}.</span>
                                    <span className="step-type">{step.type}:</span>
                                    <span className="step-desc">{step.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {commandHistory.length > 0 && (
                <div className="command-history">
                    <h5>📚 Recent Commands</h5>
                    <div className="history-list">
                        {commandHistory.map((item, index) => (
                            <div 
                                key={index} 
                                className="history-item"
                                onClick={() => handleHistoryClick(item)}
                            >
                                <span className="history-command">🔄 {item.command}</span>
                                <span className="history-time">
                                    {new Date(item.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!nlpStatus.initialized && (
                <div className="setup-notice">
                    <h5>⚙️ Setup Required</h5>
                    <p>For advanced AI features, set your GEMINI_API_KEY environment variable.</p>
                    <p>Basic automation commands are still available!</p>
                </div>
            )}
        </div>
    );
};

export default NaturalLanguagePanel;
