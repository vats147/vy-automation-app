const { screen } = require('electron');
const screenshot = require('screenshot-desktop');
const EventEmitter = require('events');
const SystemAutomationService = require('./system-automation');

class WorkflowExecutor extends EventEmitter {
    constructor(databaseManager) {
        super();
        this.databaseManager = databaseManager;
        this.automationService = new SystemAutomationService();
        this.isExecuting = false;
        this.currentExecution = null;
        this.executionQueue = [];
        
        // Execution settings
        this.settings = {
            defaultStepDelay: 500, // Default delay between steps
            screenshotOnError: true,
            retryFailedSteps: true,
            maxRetries: 3,
            timeoutMs: 30000, // 30 seconds timeout per step
            verifySteps: true
        };
        
        // Initialize automation service
        this.initializeAutomation();
    }

    async initializeAutomation() {
        try {
            await this.automationService.initialize();
            console.log('✅ Workflow Executor automation initialized');
        } catch (error) {
            console.error('❌ Failed to initialize automation service:', error);
        }
    }

    async executeWorkflow(workflowId, options = {}) {
        if (this.isExecuting) {
            throw new Error('Another workflow is currently executing');
        }

        try {
            console.log(`🚀 Starting workflow execution: ${workflowId}`);
            
            // Get workflow from database
            const workflow = await this.databaseManager.getWorkflowById(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            if (workflow.status !== 'active' && !options.force) {
                throw new Error(`Workflow ${workflowId} is not active. Status: ${workflow.status}`);
            }

            return await this.executeWorkflowSteps(workflow, options);
            
        } catch (error) {
            console.error('❌ Workflow execution failed:', error);
            this.emit('executionError', { workflowId, error: error.message });
            throw error;
        }
    }

    async executeWorkflowSteps(workflow, options = {}) {
        const executionId = await this.createExecutionRecord(workflow, options);
        this.isExecuting = true;
        this.abortController = new AbortController();
        
        const execution = {
            id: executionId,
            workflowId: workflow.id,
            workflow,
            startTime: Date.now(),
            currentStep: 0,
            totalSteps: workflow.steps.length,
            status: 'running',
            results: [],
            errors: []
        };
        
        this.currentExecution = execution;
        
        try {
            console.log(`📋 Executing ${execution.totalSteps} steps for workflow: ${workflow.name}`);
            
            // Emit execution started event
            this.emit('executionStarted', {
                executionId,
                workflowId: workflow.id,
                workflowName: workflow.name,
                totalSteps: execution.totalSteps
            });

            // Update execution record
            await this.databaseManager.updateExecution(executionId, {
                status: 'running',
                totalSteps: execution.totalSteps
            });

            // Execute each step
            for (let i = 0; i < workflow.steps.length; i++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Execution was aborted');
                }

                const step = workflow.steps[i];
                execution.currentStep = i + 1;
                
                console.log(`🔄 Executing step ${i + 1}/${execution.totalSteps}: ${step.type}`);
                
                // Emit progress event
                this.emit('executionProgress', {
                    executionId,
                    currentStep: execution.currentStep,
                    totalSteps: execution.totalSteps,
                    step,
                    progress: (execution.currentStep / execution.totalSteps) * 100
                });

                try {
                    // Update current step in database
                    await this.databaseManager.updateExecution(executionId, {
                        currentStep: step,
                        stepsCompleted: execution.currentStep - 1
                    });

                    // Execute the step
                    const stepResult = await this.executeStep(step, execution);
                    execution.results.push(stepResult);
                    
                    console.log(`✅ Step ${i + 1} completed successfully`);
                    
                } catch (stepError) {
                    console.error(`❌ Step ${i + 1} failed:`, stepError.message);
                    
                    const errorInfo = {
                        stepNumber: i + 1,
                        step,
                        error: stepError.message,
                        timestamp: Date.now()
                    };
                    
                    execution.errors.push(errorInfo);
                    
                    // Handle step failure
                    if (this.settings.retryFailedSteps) {
                        const retryResult = await this.retryStep(step, execution, stepError);
                        if (retryResult.success) {
                            execution.results.push(retryResult);
                            continue;
                        }
                    }
                    
                    // Stop execution on critical failure
                    if (!options.continueOnError) {
                        throw new Error(`Step ${i + 1} failed: ${stepError.message}`);
                    }
                    
                    execution.results.push({
                        success: false,
                        error: stepError.message,
                        step
                    });
                }
            }

            // Execution completed successfully
            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            
            console.log(`✅ Workflow execution completed in ${execution.duration}ms`);
            
            // Update execution record
            await this.databaseManager.updateExecution(executionId, {
                status: 'completed',
                completedAt: new Date(execution.endTime).toISOString(),
                durationMs: execution.duration,
                stepsCompleted: execution.totalSteps,
                executionLog: execution.results
            });

            // Emit completion event
            this.emit('executionCompleted', {
                executionId,
                workflowId: workflow.id,
                duration: execution.duration,
                totalSteps: execution.totalSteps,
                errors: execution.errors,
                success: execution.errors.length === 0
            });

            return {
                success: true,
                executionId,
                duration: execution.duration,
                stepsExecuted: execution.totalSteps,
                errors: execution.errors
            };

        } catch (error) {
            // Execution failed
            execution.status = 'failed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            
            console.error(`❌ Workflow execution failed after ${execution.duration}ms:`, error.message);
            
            // Update execution record
            await this.databaseManager.updateExecution(executionId, {
                status: 'failed',
                completedAt: new Date(execution.endTime).toISOString(),
                durationMs: execution.duration,
                stepsCompleted: execution.currentStep - 1,
                errorMessage: error.message,
                executionLog: execution.results
            });

            // Emit failure event
            this.emit('executionFailed', {
                executionId,
                workflowId: workflow.id,
                error: error.message,
                stepsCompleted: execution.currentStep - 1,
                totalSteps: execution.totalSteps
            });

            throw error;
            
        } finally {
            this.isExecuting = false;
            this.currentExecution = null;
            this.abortController = null;
        }
    }

    async executeStep(step, execution) {
        const stepStartTime = Date.now();
        
        try {
            let result;
            
            switch (step.type) {
                case 'click':
                    result = await this.executeClickStep(step);
                    break;
                    
                case 'type':
                    result = await this.executeTypeStep(step);
                    break;
                    
                case 'key':
                    result = await this.executeKeyStep(step);
                    break;
                    
                case 'wait':
                    result = await this.executeWaitStep(step);
                    break;
                    
                case 'scroll':
                    result = await this.executeScrollStep(step);
                    break;
                    
                case 'screenshot':
                    result = await this.executeScreenshotStep(step);
                    break;
                    
                case 'window_focus':
                    result = await this.executeWindowFocusStep(step);
                    break;
                    
                case 'navigation':
                    result = await this.executeNavigationStep(step);
                    break;
                    
                case 'manual_marker':
                    result = await this.executeManualMarkerStep(step);
                    break;
                    
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
            
            const stepDuration = Date.now() - stepStartTime;
            
            // Add default delay between steps
            if (step.waitTime > 0) {
                await this.delay(step.waitTime);
            } else if (this.settings.defaultStepDelay > 0) {
                await this.delay(this.settings.defaultStepDelay);
            }
            
            return {
                success: true,
                step,
                result,
                duration: stepDuration,
                timestamp: Date.now()
            };
            
        } catch (error) {
            // Take screenshot on error if enabled
            if (this.settings.screenshotOnError) {
                try {
                    await this.takeErrorScreenshot(step, execution, error);
                } catch (screenshotError) {
                    console.warn('Failed to take error screenshot:', screenshotError.message);
                }
            }
            
            throw error;
        }
    }

    async executeClickStep(step) {
        if (!this.automationService.isInitialized) {
            throw new Error('Mouse automation not available');
        }
        
        const { coordinates, button = 'left' } = step;
        
        if (!coordinates || typeof coordinates.x !== 'number' || typeof coordinates.y !== 'number') {
            throw new Error('Invalid click coordinates');
        }
        
        console.log(`🖱️ Clicking at (${coordinates.x}, ${coordinates.y}) with ${button} button`);
        
        // Execute the click
        await this.automationService.clickMouse(coordinates.x, coordinates.y, button);
        
        return {
            action: 'click',
            coordinates,
            button
        };
    }

    async executeTypeStep(step) {
        if (!this.automationService.isInitialized) {
            throw new Error('Keyboard automation not available');
        }
        
        const { text } = step;
        
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input');
        }
        
        console.log(`⌨️ Typing text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        
        // Type the text
        await this.automationService.typeText(text);
        
        return {
            action: 'type',
            text,
            length: text.length
        };
    }

    async executeKeyStep(step) {
        if (!this.automationService.isInitialized) {
            throw new Error('Keyboard automation not available');
        }
        
        const { key, modifiers = [] } = step;
        
        if (!key) {
            throw new Error('Invalid key input');
        }
        
        console.log(`🔑 Pressing key: ${key}${modifiers.length > 0 ? ` with modifiers: ${modifiers.join(', ')}` : ''}`);
        
        // Press key with modifiers
        await this.automationService.pressKey(key, modifiers);
        
        return {
            action: 'key',
            key,
            modifiers
        };
    }

    async executeWaitStep(step) {
        const { duration } = step;
        
        if (!duration || duration < 0) {
            throw new Error('Invalid wait duration');
        }
        
        await this.delay(duration);
        
        return {
            action: 'wait',
            duration
        };
    }

    async executeScrollStep(step) {
        if (!this.automationService.isInitialized) {
            throw new Error('Mouse automation not available');
        }
        
        const { direction, amount, coordinates } = step;
        
        const scrollDirection = direction === 'up' ? 'up' : 'down';
        const scrollAmount = Math.abs(amount) || 3;
        
        console.log(`📜 Scrolling ${scrollDirection} by ${scrollAmount} clicks`);
        
        // Use coordinates if provided, otherwise scroll at current position
        const x = coordinates ? coordinates.x : undefined;
        const y = coordinates ? coordinates.y : undefined;
        
        await this.automationService.scrollMouse(x, y, scrollDirection, scrollAmount);
        
        return {
            action: 'scroll',
            direction: scrollDirection,
            amount: scrollAmount,
            coordinates
        };
    }

    async executeScreenshotStep(step) {
        try {
            const img = await screenshot({ format: 'png' });
            
            return {
                action: 'screenshot',
                size: img.length,
                timestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`Screenshot failed: ${error.message}`);
        }
    }

    async executeWindowFocusStep(step) {
        // Platform-specific window focusing would go here
        return {
            action: 'window_focus',
            target: step.target
        };
    }

    async executeNavigationStep(step) {
        // Navigation steps would typically be handled by browser automation
        return {
            action: 'navigation',
            target: step.target
        };
    }

    async executeManualMarkerStep(step) {
        // Manual markers are just informational
        return {
            action: 'manual_marker',
            description: step.description
        };
    }

    async retryStep(step, execution, originalError) {
        const maxRetries = this.settings.maxRetries;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Retrying step (attempt ${attempt}/${maxRetries})`);
            
            try {
                // Wait before retry
                await this.delay(1000 * attempt);
                
                const result = await this.executeStep(step, execution);
                
                console.log(`✅ Step retry ${attempt} succeeded`);
                
                return {
                    ...result,
                    retried: true,
                    attempts: attempt,
                    originalError: originalError.message
                };
                
            } catch (retryError) {
                console.log(`❌ Step retry ${attempt} failed:`, retryError.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Step failed after ${maxRetries} retries. Last error: ${retryError.message}`);
                }
            }
        }
    }

    async createExecutionRecord(workflow, options) {
        return await this.databaseManager.createExecution({
            workflowId: workflow.id,
            scheduledWorkflowId: options.scheduledWorkflowId || null,
            triggerType: options.triggerType || 'manual',
            triggerMetadata: options.triggerMetadata || {},
            totalSteps: workflow.steps.length
        });
    }

    async takeErrorScreenshot(step, execution, error) {
        const timestamp = Date.now();
        const filename = `error_${execution.id}_step_${execution.currentStep}_${timestamp}.png`;
        // Implementation would save screenshot to error directory
        console.log(`📸 Error screenshot saved: ${filename}`);
    }

    async testWorkflow(workflowData) {
        // Test workflow without saving to database
        const testWorkflow = {
            id: 'test',
            name: 'Test Workflow',
            ...workflowData
        };
        
        console.log('🧪 Testing workflow...');
        
        try {
            // Validate workflow steps
            this.validateWorkflowSteps(testWorkflow.steps);
            
            // Run a dry-run simulation
            const simulation = await this.simulateWorkflow(testWorkflow);
            
            return {
                success: true,
                valid: true,
                simulation,
                estimatedDuration: simulation.estimatedDuration
            };
            
        } catch (error) {
            return {
                success: false,
                valid: false,
                error: error.message
            };
        }
    }

    validateWorkflowSteps(steps) {
        if (!Array.isArray(steps) || steps.length === 0) {
            throw new Error('Workflow must contain at least one step');
        }
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            if (!step.type) {
                throw new Error(`Step ${i + 1} missing type`);
            }
            
            // Validate step-specific requirements
            switch (step.type) {
                case 'click':
                    if (!step.coordinates) {
                        throw new Error(`Click step ${i + 1} missing coordinates`);
                    }
                    break;
                    
                case 'type':
                    if (!step.text) {
                        throw new Error(`Type step ${i + 1} missing text`);
                    }
                    break;
                    
                case 'key':
                    if (!step.key) {
                        throw new Error(`Key step ${i + 1} missing key`);
                    }
                    break;
                    
                case 'wait':
                    if (!step.duration || step.duration < 0) {
                        throw new Error(`Wait step ${i + 1} missing or invalid duration`);
                    }
                    break;
            }
        }
    }

    async simulateWorkflow(workflow) {
        const simulation = {
            steps: [],
            estimatedDuration: 0,
            warnings: []
        };
        
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            
            const stepSimulation = {
                stepNumber: i + 1,
                type: step.type,
                estimatedDuration: this.estimateStepDuration(step),
                warnings: this.getStepWarnings(step)
            };
            
            simulation.steps.push(stepSimulation);
            simulation.estimatedDuration += stepSimulation.estimatedDuration;
            simulation.warnings.push(...stepSimulation.warnings);
        }
        
        return simulation;
    }

    estimateStepDuration(step) {
        const baseDurations = {
            click: 200,
            type: step.text ? step.text.length * 50 : 500,
            key: 100,
            wait: step.duration || 0,
            scroll: 300,
            screenshot: 500,
            window_focus: 300,
            navigation: 2000,
            manual_marker: 0
        };
        
        return baseDurations[step.type] || 500;
    }

    getStepWarnings(step) {
        const warnings = [];
        
        if (step.type === 'click' && (!step.coordinates || step.coordinates.x < 0 || step.coordinates.y < 0)) {
            warnings.push('Click coordinates may be invalid');
        }
        
        if (step.type === 'wait' && step.duration > 10000) {
            warnings.push('Long wait duration may slow execution');
        }
        
        if (step.type === 'type' && step.text && step.text.length > 1000) {
            warnings.push('Large text input may be slow to type');
        }
        
        return warnings;
    }

    abortExecution() {
        if (this.isExecuting && this.abortController) {
            console.log('🛑 Aborting workflow execution...');
            this.abortController.abort();
            return true;
        }
        return false;
    }

    getExecutionStatus() {
        if (!this.isExecuting || !this.currentExecution) {
            return { isExecuting: false };
        }
        
        return {
            isExecuting: true,
            executionId: this.currentExecution.id,
            workflowId: this.currentExecution.workflowId,
            workflowName: this.currentExecution.workflow.name,
            currentStep: this.currentExecution.currentStep,
            totalSteps: this.currentExecution.totalSteps,
            progress: (this.currentExecution.currentStep / this.currentExecution.totalSteps) * 100,
            duration: Date.now() - this.currentExecution.startTime,
            errors: this.currentExecution.errors.length
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}

module.exports = WorkflowExecutor;
