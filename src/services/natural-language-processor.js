const GeminiAIService = require('./gemini-ai-service');
const SystemAutomationService = require('../automation/system-automation');

class NaturalLanguageProcessor {
    constructor() {
        this.geminiAI = new GeminiAIService();
        this.systemAutomation = new SystemAutomationService();
        this.isInitialized = false;
        this.commandHistory = [];
        this.maxHistorySize = 50;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Natural Language Processor...');
            
            // Initialize Gemini AI
            const geminiInit = await this.geminiAI.initialize();
            
            // Initialize System Automation
            const systemInit = await this.systemAutomation.initialize();
            
            this.isInitialized = geminiInit || systemInit; // At least one should work
            
            if (this.isInitialized) {
                console.log('✅ Natural Language Processor ready');
            } else {
                console.log('⚠️ Natural Language Processor started with limited features');
            }
            
            return this.isInitialized;
        } catch (error) {
            console.error('❌ Failed to initialize Natural Language Processor:', error);
            return false;
        }
    }

    async processCommand(userInput, options = {}) {
        try {
            console.log(`🎯 Processing command: "${userInput}"`);
            
            // Add to history
            this.addToHistory(userInput);
            
            // Get automation plan from Gemini AI
            const automationPlan = await this.geminiAI.processNaturalLanguageCommand(userInput);
            
            console.log('📋 Automation plan generated:', automationPlan);
            
            // Execute the automation plan
            const results = await this.executeAutomationPlan(automationPlan, options);
            
            return {
                success: true,
                command: userInput,
                plan: automationPlan,
                results: results,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to process command:', error);
            return {
                success: false,
                command: userInput,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async executeAutomationPlan(plan, options = {}) {
        const results = [];
        const dryRun = options.dryRun || false;
        
        if (dryRun) {
            console.log('🔍 Dry run mode - showing what would be executed:');
            plan.steps.forEach((step, index) => {
                console.log(`${index + 1}. ${step.type}: ${step.description}`);
            });
            return { dryRun: true, steps: plan.steps };
        }

        console.log(`⚡ Executing ${plan.steps.length} automation steps...`);
        
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            console.log(`📍 Step ${i + 1}/${plan.steps.length}: ${step.description}`);
            
            try {
                const result = await this.executeStep(step);
                results.push({
                    step: i + 1,
                    type: step.type,
                    description: step.description,
                    success: true,
                    result: result,
                    timestamp: new Date().toISOString()
                });
                
                // Add small delay between steps for stability
                if (i < plan.steps.length - 1) {
                    await this.delay(500);
                }
                
            } catch (error) {
                console.error(`❌ Step ${i + 1} failed:`, error);
                results.push({
                    step: i + 1,
                    type: step.type,
                    description: step.description,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                // Continue with next step or stop based on error severity
                if (options.stopOnError !== false) {
                    console.log('🛑 Stopping execution due to error');
                    break;
                }
            }
        }
        
        console.log(`✅ Automation completed. ${results.filter(r => r.success).length}/${results.length} steps successful`);
        return { steps: results, summary: this.generateExecutionSummary(results) };
    }

    async executeStep(step) {
        switch (step.type) {
            case 'openApp':
                return await this.systemAutomation.openApplication(step.appName);
                
            case 'clickMouse':
                return await this.systemAutomation.clickMouse(
                    step.x || 100, 
                    step.y || 100, 
                    step.button || 'left'
                );
                
            case 'typeText':
                return await this.systemAutomation.typeText(step.text);
                
            case 'pressKey':
                return await this.systemAutomation.pressKey(step.key, step.modifiers);
                
            case 'delay':
                return await this.delay(step.duration || 1000);
                
            case 'runCommand':
                return await this.systemAutomation.runTerminalCommand(step.command);
                
            case 'takeScreenshot':
                return await this.systemAutomation.takeScreenshot(step.path);
                
            case 'moveMouse':
                return await this.systemAutomation.moveMouse(step.x || 100, step.y || 100);
                
            case 'dragMouse':
                return await this.systemAutomation.dragMouse(
                    step.fromX || 100, 
                    step.fromY || 100, 
                    step.toX || 200, 
                    step.toY || 200
                );
                
            default:
                console.warn(`⚠️ Unknown step type: ${step.type}`);
                return { warning: `Unknown step type: ${step.type}` };
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateExecutionSummary(results) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = total - successful;
        
        return {
            total_steps: total,
            successful_steps: successful,
            failed_steps: failed,
            success_rate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            execution_time: results.length > 0 ? 
                new Date(results[results.length - 1].timestamp) - new Date(results[0].timestamp) : 0
        };
    }

    // Command suggestions and help
    async getCommandSuggestions(partialInput = '') {
        const suggestions = [
            "open terminal and run ls",
            "take a screenshot",
            "open Chrome browser",
            "open Calculator app",
            "type hello world",
            "press command+space to open spotlight",
            "click at center of screen",
            "open VS Code",
            "run git status in terminal",
            "open System Preferences"
        ];

        if (!partialInput) {
            return suggestions.slice(0, 5);
        }

        const filtered = suggestions.filter(cmd => 
            cmd.toLowerCase().includes(partialInput.toLowerCase())
        );

        // If we have Gemini AI, get enhanced suggestions
        if (this.geminiAI.isInitialized && filtered.length < 3) {
            try {
                const enhanced = await this.geminiAI.enhanceCommand(partialInput);
                if (enhanced && enhanced !== partialInput) {
                    filtered.unshift(enhanced);
                }
            } catch (error) {
                console.error('Failed to get enhanced suggestions:', error);
            }
        }

        return filtered.slice(0, 5);
    }

    async getCommandHelp(command) {
        return await this.geminiAI.getCommandHelp(command);
    }

    // History management
    addToHistory(command) {
        this.commandHistory.unshift({
            command,
            timestamp: new Date().toISOString()
        });

        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
        }
    }

    getCommandHistory(limit = 10) {
        return this.commandHistory.slice(0, limit);
    }

    // Voice command processing (placeholder for future implementation)
    async processVoiceCommand(audioData) {
        // Future: Implement speech-to-text
        console.log('🎤 Voice command processing not yet implemented');
        return {
            success: false,
            error: 'Voice command processing not yet implemented'
        };
    }

    // Workflow suggestions
    async generateWorkflowSuggestions(description) {
        return await this.geminiAI.generateWorkflowSuggestions(description);
    }

    // Safety checks
    isCommandSafe(automationPlan) {
        const dangerousActions = ['delete', 'rm -rf', 'format', 'shutdown', 'reboot'];
        const commandText = JSON.stringify(automationPlan).toLowerCase();
        
        for (const dangerous of dangerousActions) {
            if (commandText.includes(dangerous)) {
                return {
                    safe: false,
                    reason: `Command contains potentially dangerous action: ${dangerous}`,
                    risk_level: 'high'
                };
            }
        }
        
        return {
            safe: true,
            risk_level: automationPlan.risk_level || 'low'
        };
    }

    // Status and health check
    getStatus() {
        return {
            initialized: this.isInitialized,
            gemini_ai: this.geminiAI.isInitialized,
            system_automation: this.systemAutomation ? true : false,
            command_history_count: this.commandHistory.length,
            last_command: this.commandHistory[0] || null
        };
    }
}

module.exports = NaturalLanguageProcessor;
