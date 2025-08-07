const SystemAutomationService = require('./system-automation');
const GeminiAIService = require('../services/gemini-ai-service');
const Task = require('./task');

/**
 * The AutonomousAgent is responsible for executing complex, multi-step tasks
 * by following an "Observe, Think, Act" loop.
 */
class AutonomousAgent {
    /**
     * @param {Task} task - The task to be executed.
     * @param {GeminiAIService} geminiAI - The AI service for decision making.
     * @param {SystemAutomationService} systemAutomation - The service for controlling the system.
     */
    constructor(task, geminiAI, systemAutomation) {
        if (!(task instanceof Task)) {
            throw new Error('AutonomousAgent requires a valid Task object.');
        }
        if (!(geminiAI instanceof GeminiAIService)) {
            throw new Error('AutonomousAgent requires a valid GeminiAIService object.');
        }
        if (!(systemAutomation instanceof SystemAutomationService)) {
            throw new Error('AutonomousAgent requires a valid SystemAutomationService object.');
        }

        this.task = task;
        this.geminiAI = geminiAI;
        this.systemAutomation = systemAutomation;
        this.maxSteps = 20; // Safety brake to prevent infinite loops
    }

    /**
     * Starts the agent's "Observe, Think, Act" loop.
     */
    async run() {
        this.task.start();
        console.log(`🚀 Starting autonomous agent for task: ${this.task.goal}`);

        for (let i = 0; i < this.maxSteps; i++) {
            try {
                console.log(`\n--- Step ${i + 1}/${this.maxSteps} ---`);

                // 1. Observe
                console.log('👀 Observing screen...');
                const screenshotResult = await this.systemAutomation.takeScreenshot();
                const screenshotPath = screenshotResult.filePath;

                // 2. Think
                console.log('🤔 Thinking about next action...');
                const nextAction = await this.geminiAI.getNextAction(this.task, screenshotPath);
                console.log(`💡 AI action: ${JSON.stringify(nextAction)}`);

                // 3. Act
                await this.executeAction(nextAction);
                this.task.addAction(nextAction, screenshotPath);

                // Check for terminal states
                if (nextAction.action === 'finish' || nextAction.action === 'fail') {
                    if (nextAction.action === 'finish') {
                        this.task.complete();
                        console.log(`✅ Agent finished task: ${nextAction.message}`);
                    } else {
                        this.task.fail(nextAction.message);
                        console.log(`❌ Agent failed task: ${nextAction.message}`);
                    }
                    return this.task.getSummary();
                }

                // Small delay between steps to allow UI to update
                await this.systemAutomation.delay(1000);

            } catch (error) {
                console.error('Unhandled error in agent loop:', error);
                this.task.fail(error.message);
                return this.task.getSummary();
            }
        }

        this.task.fail('Reached maximum step limit.');
        console.log('⚠️ Agent stopped: reached maximum step limit.');
        return this.task.getSummary();
    }

    /**
     * Executes a single action provided by the AI.
     * @param {object} action - The action to execute.
     */
    async executeAction(action) {
        console.log(`⚡ Executing action: ${action.action}`);
        switch (action.action) {
            case 'click':
                return await this.systemAutomation.clickMouse(action.x, action.y);
            case 'type':
                return await this.systemAutomation.typeText(action.text);
            case 'pressKey':
                return await this.systemAutomation.pressKey(action.key, action.modifiers || []);
            case 'scroll':
                // Assuming a default scroll amount if not specified
                return await this.systemAutomation.scrollMouse(undefined, undefined, action.direction, 5);
            case 'finish':
            case 'fail':
                // These are terminal actions, no system automation needed.
                return { success: true, message: action.message };
            default:
                throw new Error(`Unknown or unsupported action type: ${action.action}`);
        }
    }
}

module.exports = AutonomousAgent;
