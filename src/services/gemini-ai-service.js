const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        
        // System prompt for task automation
        this.systemPrompt = `You are an intelligent task automation assistant that helps convert natural language commands into structured automation tasks for macOS.

Your job is to analyze user commands and return a JSON structure that describes the automation steps needed.

IMPORTANT RULES:
1. Always return valid JSON
2. Break down complex tasks into simple steps
3. Use the available automation actions
4. Be specific about coordinates when needed
5. Include error handling suggestions

Available automation actions:
- openApp(appName): Open an application
- clickMouse(x, y, button): Click at coordinates
- typeText(text): Type text
- pressKey(key, modifiers): Press keyboard shortcuts
- delay(ms): Wait for specified time
- runCommand(command): Execute terminal commands
- takeScreenshot(): Capture screen
- moveMouse(x, y): Move mouse cursor
- dragMouse(fromX, fromY, toX, toY): Drag operation

Example input: "open terminal and run ls command"
Example output:
{
  "intent": "open_terminal_and_run_command",
  "description": "Open Terminal application and execute ls command",
  "steps": [
    {
      "type": "openApp",
      "appName": "Terminal",
      "description": "Open Terminal application"
    },
    {
      "type": "delay",
      "duration": 2000,
      "description": "Wait for Terminal to open"
    },
    {
      "type": "typeText",
      "text": "ls",
      "description": "Type ls command"
    },
    {
      "type": "pressKey",
      "key": "enter",
      "description": "Press Enter to execute command"
    }
  ],
  "estimated_duration": 5000,
  "risk_level": "low"
}

Always respond with this JSON structure. Be creative but safe.`;
    }

    async initialize() {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Gemini API key not found. Set GEMINI_API_KEY environment variable.');
                return false;
            }

            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ 
                model: "gemini-pro",
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            });

            this.isInitialized = true;
            console.log('✅ Gemini AI Service initialized');
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
}

module.exports = GeminiAIService;
