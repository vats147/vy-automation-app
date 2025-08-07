const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// Helper function to convert local file to generative part
async function fileToGenerativePart(filePath) {
    const mimeType = 'image/png'; // Assuming all screenshots are PNGs
    const data = await fs.readFile(filePath, 'base64');
    return {
        inlineData: {
            data,
            mimeType
        },
    };
}

class GeminiAIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.genAI = null;
        this.model = null;
        this.visionModel = null;
        this.isInitialized = false;
        
        // System prompt for task automation
        this.systemPrompt = `You are an intelligent task automation assistant for a desktop environment. Your job is to analyze user commands and return a JSON structure that describes the automation steps needed. Break down complex tasks into simple, granular steps using the available actions. Always return valid JSON.`;

        this.agentSystemPrompt = `You are a highly intelligent autonomous agent designed to operate a computer.
Your goal is to achieve a high-level objective provided by the user.
You will be given a screenshot of the current state of the screen, the user's objective, and the history of actions you have already taken.
Your task is to decide the single next action to take to move closer to the objective.

Analyze the screenshot carefully. Your actions should be precise.

Available Actions (return one of these in JSON format):
- click(x, y, reason): Click at a specific coordinate. Provide a reason for the click.
- type(text, reason): Type a string of text. Provide a reason for typing this text.
- pressKey(key, modifiers, reason): Press a special key (e.g., 'enter', 'esc', 'tab').
- scroll(direction, reason): Scroll the screen 'up' or 'down'.
- finish(message): Use this action when you believe the objective has been fully achieved. Provide a summary message.
- fail(message): Use this action if you are stuck or cannot achieve the objective. Provide a reason for the failure.

Your response MUST be a single, valid JSON object representing the next action.

Example Response:
{
  "action": "click",
  "x": 520,
  "y": 340,
  "reason": "Clicking the 'Login' button to proceed."
}

Another Example:
{
  "action": "type",
  "text": "hello world",
  "reason": "Typing the message into the chat box."
}

Final Example:
{
  "action": "finish",
  "message": "Successfully sent the message to xyz."
}
`;
    }

    async initialize() {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Gemini API key not found. Set GEMINI_API_KEY environment variable.');
                return false;
            }

            this.genAI = new GoogleGenerativeAI(this.apiKey);

            // Initialize text model
            this.model = this.genAI.getGenerativeModel({ 
                model: "gemini-pro",
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            });

            // Initialize vision model
            this.visionModel = this.genAI.getGenerativeModel({
                model: "gemini-pro-vision",
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                }
            });

            this.isInitialized = true;
            console.log('✅ Gemini AI Service initialized with text and vision models');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI:', error);
            return false;
        }
    }

    async processNaturalLanguageCommand(userCommand) {
        try {
            if (!this.isInitialized) {
                return this.createFallbackResponse(userCommand);
            }

            const prompt = `${this.systemPrompt}\n\nUser Command: "${userCommand}"\n\nGenerate automation steps:`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const automationPlan = JSON.parse(jsonMatch[0]);
                
                // Validate the structure
                if (this.validateAutomationPlan(automationPlan)) {
                    console.log('🤖 Gemini AI generated automation plan:', automationPlan);
                    return automationPlan;
                }
            }

            // Fallback if parsing fails
            return this.createFallbackResponse(userCommand);

        } catch (error) {
            console.error('Failed to process command with Gemini AI:', error);
            return this.createFallbackResponse(userCommand);
        }
    }

    validateAutomationPlan(plan) {
        return plan && 
               plan.intent && 
               plan.description && 
               Array.isArray(plan.steps) && 
               plan.steps.length > 0 &&
               plan.steps.every(step => step.type && step.description);
    }

    createFallbackResponse(userCommand) {
        // Create a basic automation plan when AI is not available
        const lowerCommand = userCommand.toLowerCase();
        
        if (lowerCommand.includes('terminal') || lowerCommand.includes('ls')) {
            return {
                intent: "open_terminal_basic",
                description: `Execute command: ${userCommand}`,
                steps: [
                    {
                        type: "openApp",
                        appName: "Terminal",
                        description: "Open Terminal application"
                    },
                    {
                        type: "delay",
                        duration: 2000,
                        description: "Wait for Terminal to open"
                    }
                ],
                estimated_duration: 3000,
                risk_level: "low",
                fallback: true
            };
        }

        if (lowerCommand.includes('open') && lowerCommand.includes('chrome')) {
            return {
                intent: "open_browser",
                description: "Open Chrome browser",
                steps: [
                    {
                        type: "openApp",
                        appName: "Google Chrome",
                        description: "Open Chrome browser"
                    }
                ],
                estimated_duration: 3000,
                risk_level: "low",
                fallback: true
            };
        }

        if (lowerCommand.includes('screenshot')) {
            return {
                intent: "take_screenshot",
                description: "Take a screenshot",
                steps: [
                    {
                        type: "takeScreenshot",
                        description: "Capture current screen"
                    }
                ],
                estimated_duration: 1000,
                risk_level: "low",
                fallback: true
            };
        }

        // Generic fallback
        return {
            intent: "unknown_command",
            description: `Process command: ${userCommand}`,
            steps: [
                {
                    type: "delay",
                    duration: 1000,
                    description: "Processing command..."
                }
            ],
            estimated_duration: 1000,
            risk_level: "unknown",
            fallback: true,
            error: "Could not parse command. Please be more specific."
        };
    }

    async generateWorkflowSuggestions(description) {
        try {
            if (!this.isInitialized) {
                return this.getBasicWorkflowSuggestions();
            }

            const prompt = `Generate 3-5 workflow suggestions based on this description: "${description}"

Return a JSON array of workflow suggestions with the following structure:
[
  {
    "name": "Workflow Name",
    "description": "Detailed description",
    "category": "productivity|development|system|entertainment",
    "difficulty": "easy|medium|hard",
    "estimated_time": "time in minutes",
    "steps": ["Step 1", "Step 2", "Step 3"]
  }
]`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return this.getBasicWorkflowSuggestions();

        } catch (error) {
            console.error('Failed to generate workflow suggestions:', error);
            return this.getBasicWorkflowSuggestions();
        }
    }

    getBasicWorkflowSuggestions() {
        return [
            {
                name: "Daily Development Setup",
                description: "Open development tools and prepare workspace",
                category: "development",
                difficulty: "easy",
                estimated_time: "2 minutes",
                steps: ["Open Terminal", "Open VS Code", "Open Chrome", "Navigate to project folder"]
            },
            {
                name: "System Maintenance",
                description: "Run basic system maintenance commands",
                category: "system",
                difficulty: "medium",
                estimated_time: "5 minutes",
                steps: ["Check disk usage", "Clear cache", "Update system", "Restart dock"]
            },
            {
                name: "Quick Screenshot Workflow",
                description: "Take and organize screenshots",
                category: "productivity",
                difficulty: "easy",
                estimated_time: "1 minute",
                steps: ["Take screenshot", "Open in Preview", "Crop if needed", "Save to Documents"]
            }
        ];
    }

    // Method to improve commands based on context
    async enhanceCommand(command, context = {}) {
        try {
            if (!this.isInitialized) {
                return command;
            }

            const prompt = `Enhance this automation command with context:
Command: "${command}"
Context: ${JSON.stringify(context)}

Make the command more specific and actionable. Return just the enhanced command text.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const enhancedCommand = response.text().trim();

            return enhancedCommand || command;

        } catch (error) {
            console.error('Failed to enhance command:', error);
            return command;
        }
    }

    // Get help for commands
    async getCommandHelp(command) {
        const helpResponses = {
            'terminal': 'Opens Terminal app. You can then type commands like "ls", "cd", "pwd", etc.',
            'screenshot': 'Takes a screenshot of your current screen and saves it.',
            'open app': 'Opens any application. Example: "open Chrome", "open Calculator"',
            'type': 'Types text at the current cursor position.',
            'click': 'Clicks at specified coordinates on screen.',
            'shortcut': 'Presses keyboard shortcuts. Example: "press cmd+c" to copy.'
        };

        const lowerCommand = command.toLowerCase();
        for (const [key, help] of Object.entries(helpResponses)) {
            if (lowerCommand.includes(key)) {
                return help;
            }
        }

        return 'I can help you automate tasks on your Mac. Try commands like "open terminal", "take screenshot", or "open Chrome browser".';
    }

    async getNextAction(task, screenshotPath) {
        if (!this.isInitialized || !this.visionModel) {
            throw new Error('Vision model is not initialized.');
        }

        try {
            const imagePart = await fileToGenerativePart(screenshotPath);

            const history_string = task.history.map(h => JSON.stringify(h.action)).join('\n');

            const prompt = `
Objective: ${task.goal}

Action History:
${history_string || 'No actions taken yet.'}

Based on the objective, history, and the provided screenshot, what is the single next action to perform?
`;

            const result = await this.visionModel.generateContent([this.agentSystemPrompt, prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const nextAction = JSON.parse(jsonMatch[0]);
                console.log('🤖 Agent received next action:', nextAction);
                return nextAction;
            }

            throw new Error('Failed to parse JSON response from vision model.');

        } catch (error) {
            console.error('Failed to get next action from Gemini Vision:', error);
            // Return a fail action
            return {
                action: 'fail',
                message: `Failed to get next action from AI: ${error.message}`
            };
        }
    }
}

module.exports = GeminiAIService;
