const { GoogleGenerativeAI } = require('@google/generative-ai');
const MCPClient = require('./mcp-client');

class MCPEnhancedGeminiAIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        this.mcpClient = new MCPClient();
        
        // Enhanced system prompt for MCP-based automation
        this.systemPrompt = `You are an intelligent task automation assistant that converts natural language commands into structured automation tasks.

You now have access to STRUCTURED SCREEN DATA instead of screenshots. Use this data to make precise automation decisions.

IMPORTANT RULES:
1. Always return valid JSON
2. Use structured screen data to determine precise UI interactions
3. Prefer element-based targeting over coordinate-based when possible
4. Include confidence scores for UI element identification
5. Use accessibility information to find the best interaction targets

Available automation actions:
- openApp(appName): Open an application
- clickElement(elementId, elementType): Click on UI element by ID/type
- clickMouse(x, y, button): Click at coordinates (fallback)
- typeText(text): Type text into focused element
- pressKey(key, modifiers): Press keyboard shortcuts
- delay(ms): Wait for specified time
- runCommand(command): Execute terminal commands
- takeScreenshot(): Capture screen (fallback only)
- findElement(text, type): Find UI element by text or type
- focusElement(elementId): Focus on specific UI element

Screen Context Available:
- activeWindow: Current window title, app, bounds, PID
- uiElements: Array of UI elements with bounds, types, text
- clickableElements: Elements that can be clicked with coordinates
- screenLayout: Overall screen layout and window positions

Example input: "click the OK button"
Example output:
{
  "intent": "click_ui_element",
  "description": "Click the OK button in the current window",
  "steps": [
    {
      "type": "findElement",
      "text": "OK",
      "elementType": "button",
      "description": "Find the OK button element"
    },
    {
      "type": "clickElement",
      "target": "found_element",
      "description": "Click the found OK button"
    }
  ],
  "requires_context": true,
  "estimated_duration": 2000,
  "risk_level": "low"
}

Always prefer structured data interactions over pixel-based coordinates when possible.`;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing MCP-Enhanced Gemini AI Service...');
            
            // Initialize MCP client first
            const mcpInit = await this.mcpClient.initialize();
            
            // Initialize Gemini AI
            let geminiInit = false;
            if (this.apiKey) {
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
                geminiInit = true;
                console.log('✅ Gemini AI initialized');
            } else {
                console.warn('⚠️ Gemini API key not found. Using structured fallbacks.');
            }

            this.isInitialized = mcpInit || geminiInit;
            
            if (this.isInitialized) {
                console.log('✅ MCP-Enhanced Gemini AI Service ready');
                console.log(`📊 MCP Status: ${mcpInit ? 'Connected' : 'Fallback mode'}`);
                console.log(`🤖 Gemini Status: ${geminiInit ? 'Active' : 'Fallback mode'}`);
            }
            
            return this.isInitialized;

        } catch (error) {
            console.error('❌ Failed to initialize MCP-Enhanced Gemini AI:', error);
            return false;
        }
    }

    async processNaturalLanguageCommand(userCommand) {
        try {
            console.log(`🎯 Processing MCP-enhanced command: "${userCommand}"`);
            
            // Step 1: Gather screen context via MCP instead of screenshots
            const screenContext = await this.mcpClient.gatherScreenContext();
            console.log('📊 Screen context gathered:', screenContext.method);
            
            if (!this.isInitialized || !this.model) {
                return this.createStructuredFallbackResponse(userCommand, screenContext);
            }

            // Step 2: Create enhanced prompt with structured data
            const enhancedPrompt = this.createMCPEnhancedPrompt(userCommand, screenContext);
            
            // Step 3: Get AI response
            const result = await this.model.generateContent(enhancedPrompt);
            const response = await result.response;
            const text = response.text();

            // Step 4: Parse and validate response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const automationPlan = JSON.parse(jsonMatch[0]);
                
                if (this.validateAutomationPlan(automationPlan)) {
                    // Enhance plan with MCP context
                    const enhancedPlan = await this.enhancePlanWithMCP(automationPlan, screenContext);
                    console.log('🤖 MCP-enhanced automation plan generated');
                    return enhancedPlan;
                }
            }

            // Fallback with structured data
            return this.createStructuredFallbackResponse(userCommand, screenContext);

        } catch (error) {
            console.error('Failed to process MCP-enhanced command:', error);
            const fallbackContext = await this.mcpClient.gatherScreenContextFallback();
            return this.createStructuredFallbackResponse(userCommand, fallbackContext);
        }
    }

    createMCPEnhancedPrompt(userCommand, screenContext) {
        const contextSummary = this.summarizeScreenContext(screenContext);
        
        return `${this.systemPrompt}

CURRENT SCREEN CONTEXT:
${contextSummary}

User Command: "${userCommand}"

Based on the structured screen data above, generate precise automation steps:`;
    }

    summarizeScreenContext(screenContext) {
        const { context } = screenContext;
        
        let summary = `Data Source: ${screenContext.method}\n`;
        summary += `Timestamp: ${new Date(screenContext.timestamp).toISOString()}\n\n`;

        // Active Window
        if (context.activeWindow) {
            const win = context.activeWindow.result || context.activeWindow;
            summary += `ACTIVE WINDOW:\n`;
            summary += `- App: ${win.app || 'Unknown'}\n`;
            summary += `- Title: ${win.title || 'Unknown'}\n`;
            summary += `- Bounds: ${JSON.stringify(win.bounds || {})}\n\n`;
        }

        // UI Elements
        if (context.uiElements) {
            const elements = context.uiElements.result || context.uiElements;
            summary += `UI ELEMENTS (${Array.isArray(elements) ? elements.length : 0}):\n`;
            if (Array.isArray(elements)) {
                elements.slice(0, 10).forEach((element, index) => {
                    summary += `- ${index + 1}. Type: ${element.type || 'unknown'}, `;
                    summary += `Text: "${element.text || 'N/A'}", `;
                    summary += `Bounds: ${JSON.stringify(element.bounds || {})}\n`;
                });
                if (elements.length > 10) {
                    summary += `... and ${elements.length - 10} more elements\n`;
                }
            }
            summary += '\n';
        }

        // Clickable Elements
        if (context.clickableElements) {
            const clickable = context.clickableElements.result || context.clickableElements;
            summary += `CLICKABLE ELEMENTS (${Array.isArray(clickable) ? clickable.length : 0}):\n`;
            if (Array.isArray(clickable)) {
                clickable.slice(0, 5).forEach((element, index) => {
                    summary += `- ${index + 1}. Position: (${element.x || 0}, ${element.y || 0}), `;
                    summary += `Type: ${element.type || 'unknown'}, `;
                    summary += `Confidence: ${element.confidence || 0}\n`;
                });
            }
            summary += '\n';
        }

        return summary;
    }

    async enhancePlanWithMCP(automationPlan, screenContext) {
        // Enhance automation steps with MCP data
        const enhancedSteps = [];
        
        for (const step of automationPlan.steps) {
            const enhancedStep = { ...step };
            
            // Enhance element finding with actual screen data
            if (step.type === 'findElement' && step.text) {
                const foundElement = await this.findElementInContext(step.text, screenContext);
                if (foundElement) {
                    enhancedStep.elementId = foundElement.id;
                    enhancedStep.bounds = foundElement.bounds;
                    enhancedStep.confidence = foundElement.confidence;
                    enhancedStep.found = true;
                } else {
                    enhancedStep.found = false;
                    enhancedStep.fallback = 'coordinate_click';
                }
            }
            
            // Enhance click operations with element data
            if (step.type === 'clickElement' && step.target === 'found_element') {
                const previousStep = enhancedSteps[enhancedSteps.length - 1];
                if (previousStep && previousStep.found && previousStep.bounds) {
                    enhancedStep.x = previousStep.bounds.x + (previousStep.bounds.width / 2);
                    enhancedStep.y = previousStep.bounds.y + (previousStep.bounds.height / 2);
                    enhancedStep.elementBounds = previousStep.bounds;
                }
            }
            
            enhancedSteps.push(enhancedStep);
        }
        
        return {
            ...automationPlan,
            steps: enhancedSteps,
            context_enhanced: true,
            screen_data_quality: screenContext.fallback ? 'fallback' : 'high',
            mcp_enabled: !screenContext.fallback
        };
    }

    async findElementInContext(text, screenContext) {
        const { context } = screenContext;
        
        // Search in UI elements
        if (context.uiElements) {
            const elements = context.uiElements.result || context.uiElements;
            if (Array.isArray(elements)) {
                for (const element of elements) {
                    if (element.text && element.text.toLowerCase().includes(text.toLowerCase())) {
                        return {
                            id: element.id || `element_${Date.now()}`,
                            bounds: element.bounds,
                            confidence: 0.9,
                            type: element.type,
                            text: element.text
                        };
                    }
                }
            }
        }
        
        // Search in clickable elements
        if (context.clickableElements) {
            const clickable = context.clickableElements.result || context.clickableElements;
            if (Array.isArray(clickable)) {
                for (const element of clickable) {
                    if (element.text && element.text.toLowerCase().includes(text.toLowerCase())) {
                        return {
                            id: element.id || `clickable_${Date.now()}`,
                            bounds: { x: element.x, y: element.y, width: 50, height: 30 },
                            confidence: element.confidence || 0.7,
                            type: element.type
                        };
                    }
                }
            }
        }
        
        return null;
    }

    createStructuredFallbackResponse(userCommand, screenContext) {
        const lowerCommand = userCommand.toLowerCase();
        
        // Use screen context to create better fallback responses
        if (lowerCommand.includes('click') && lowerCommand.includes('ok')) {
            return {
                intent: "click_ok_button",
                description: `Click OK button using ${screenContext.method} data`,
                steps: [
                    {
                        type: "findElement",
                        text: "OK",
                        elementType: "button",
                        description: "Find OK button in current context",
                        context_aware: true
                    },
                    {
                        type: "clickElement",
                        target: "found_element",
                        description: "Click the found OK button",
                        fallback_coordinates: { x: 200, y: 150 }
                    }
                ],
                estimated_duration: 2000,
                risk_level: "low",
                fallback: true,
                mcp_enhanced: true
            };
        }
        
        if (lowerCommand.includes('terminal') || lowerCommand.includes('ls')) {
            return {
                intent: "open_terminal_with_context",
                description: `Execute terminal command using ${screenContext.method} context`,
                steps: [
                    {
                        type: "openApp",
                        appName: "Terminal",
                        description: "Open Terminal application",
                        context_aware: true
                    },
                    {
                        type: "delay",
                        duration: 2000,
                        description: "Wait for Terminal to open"
                    }
                ],
                estimated_duration: 3000,
                risk_level: "low",
                fallback: true,
                mcp_enhanced: true
            };
        }
        
        if (lowerCommand.includes('screenshot')) {
            return {
                intent: "take_screenshot_mcp",
                description: "Take screenshot (fallback from MCP method)",
                steps: [
                    {
                        type: "takeScreenshot",
                        description: "Capture current screen state",
                        method: "fallback"
                    }
                ],
                estimated_duration: 1000,
                risk_level: "low",
                fallback: true,
                note: "MCP method preferred but screenshot available as fallback"
            };
        }
        
        // Generic structured fallback
        return {
            intent: "structured_command_processing",
            description: `Process "${userCommand}" with structured data context`,
            steps: [
                {
                    type: "analyzeContext",
                    description: "Analyze current screen context",
                    context_method: screenContext.method
                },
                {
                    type: "delay",
                    duration: 1000,
                    description: "Processing with available context data"
                }
            ],
            estimated_duration: 2000,
            risk_level: "unknown",
            fallback: true,
            mcp_enhanced: true,
            error: "Command requires more specific instructions or better context data"
        };
    }

    validateAutomationPlan(plan) {
        return plan && 
               plan.intent && 
               plan.description && 
               Array.isArray(plan.steps) && 
               plan.steps.length > 0 &&
               plan.steps.every(step => step.type && step.description);
    }

    async generateWorkflowSuggestions(description) {
        try {
            if (!this.isInitialized || !this.model) {
                return this.getMCPEnhancedWorkflowSuggestions();
            }

            const prompt = `Generate 3-5 workflow suggestions that leverage structured screen data: "${description}"

Return a JSON array of workflow suggestions optimized for MCP-based automation:
[
  {
    "name": "Workflow Name",
    "description": "Detailed description with MCP context awareness",
    "category": "productivity|development|system|entertainment",
    "difficulty": "easy|medium|hard",
    "estimated_time": "time in minutes",
    "mcp_optimized": true,
    "steps": ["Step 1 with element targeting", "Step 2 with context awareness", "Step 3"]
  }
]`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return this.getMCPEnhancedWorkflowSuggestions();

        } catch (error) {
            console.error('Failed to generate MCP workflow suggestions:', error);
            return this.getMCPEnhancedWorkflowSuggestions();
        }
    }

    getMCPEnhancedWorkflowSuggestions() {
        return [
            {
                name: "Smart UI Interaction",
                description: "Intelligently interact with UI elements using accessibility data",
                category: "productivity",
                difficulty: "easy",
                estimated_time: "1 minute",
                mcp_optimized: true,
                steps: ["Scan UI elements", "Find target button/field", "Execute precise click/input"]
            },
            {
                name: "Context-Aware Development Setup",
                description: "Open development tools based on current screen context",
                category: "development",
                difficulty: "medium",
                estimated_time: "3 minutes",
                mcp_optimized: true,
                steps: ["Analyze current workspace", "Open appropriate IDE", "Load relevant project"]
            },
            {
                name: "Intelligent Window Management",
                description: "Organize windows based on screen layout analysis",
                category: "system",
                difficulty: "medium",
                estimated_time: "2 minutes",
                mcp_optimized: true,
                steps: ["Analyze window layout", "Identify optimization opportunities", "Rearrange windows efficiently"]
            }
        ];
    }

    async enhanceCommand(command, context = {}) {
        try {
            if (!this.isInitialized || !this.model) {
                return command;
            }

            // Gather current screen context
            const screenContext = await this.mcpClient.gatherScreenContext();
            
            const prompt = `Enhance this automation command with structured screen context:
Command: "${command}"
Additional Context: ${JSON.stringify(context)}
Screen Context: ${this.summarizeScreenContext(screenContext)}

Make the command more specific and leverage available UI elements. Return just the enhanced command text.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const enhancedCommand = response.text().trim();

            return enhancedCommand || command;

        } catch (error) {
            console.error('Failed to enhance command with MCP context:', error);
            return command;
        }
    }

    async getCommandHelp(command) {
        const helpResponses = {
            'click': 'Intelligently clicks UI elements using accessibility data. Example: "click the OK button" finds and clicks the actual OK button.',
            'find': 'Locates UI elements using structured screen data. More accurate than coordinate-based targeting.',
            'terminal': 'Opens Terminal with awareness of current desktop context.',
            'screenshot': 'Available as fallback. MCP provides structured data instead of images for better performance.',
            'type': 'Types text into focused elements with context awareness.',
            'open': 'Opens applications with intelligent window management based on current screen layout.'
        };

        const lowerCommand = command.toLowerCase();
        for (const [key, help] of Object.entries(helpResponses)) {
            if (lowerCommand.includes(key)) {
                return `${help} (MCP-enhanced)`;
            }
        }

        return 'I can help you automate tasks using structured screen data instead of screenshots. This is faster and more accurate. Try commands like "click the save button" or "find text field".';
    }

    getStatus() {
        const mcpStatus = this.mcpClient.getStatus();
        return {
            initialized: this.isInitialized,
            gemini_ai: this.model ? true : false,
            mcp_client: mcpStatus,
            mode: mcpStatus.fallbackMode ? 'fallback' : 'mcp_enhanced',
            performance: mcpStatus.fallbackMode ? 'standard' : 'optimized'
        };
    }

    async disconnect() {
        if (this.mcpClient) {
            await this.mcpClient.disconnect();
        }
    }
}

module.exports = MCPEnhancedGeminiAIService;
