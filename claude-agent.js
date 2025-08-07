#!/usr/bin/env node

const readline = require('readline');
const ClaudeStyleComputerAgent = require('./src/services/claude-style-computer-agent');
const EnhancedComputerVision = require('./src/services/enhanced-computer-vision');

class InteractiveComputerAgent {
    constructor() {
        this.agent = new ClaudeStyleComputerAgent();
        this.vision = new EnhancedComputerVision();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '🤖 Computer Agent > '
        });
        
        this.isRunning = false;
        this.currentMode = 'interactive'; // 'interactive', 'autonomous', 'demo'
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            await this.handleUserInput(input.trim());
        });

        this.rl.on('close', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });

        // Handle Ctrl+C gracefully
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down Computer Agent...');
            await this.shutdown();
            process.exit(0);
        });
    }

    async start() {
        console.log('\n' + '='.repeat(80));
        console.log('🤖 CLAUDE-STYLE COMPUTER AGENT');
        console.log('Autonomous Computer Control & Task Execution');
        console.log('='.repeat(80));
        
        try {
            console.log('\n🚀 Initializing systems...');
            
            // Initialize agent
            const agentInit = await this.agent.initialize();
            console.log(`   ${agentInit ? '✅' : '⚠️'} Computer Agent: ${agentInit ? 'Ready' : 'Limited'}`);
            
            // Initialize vision
            const visionInit = await this.vision.initialize();
            console.log(`   ${visionInit ? '✅' : '⚠️'} Computer Vision: ${visionInit ? 'Ready' : 'Limited'}`);
            
            if (!agentInit && !visionInit) {
                console.log('\n❌ Critical systems failed to initialize. Exiting...');
                process.exit(1);
            }
            
            this.isRunning = true;
            
            // Show welcome message and help
            this.showWelcome();
            this.showHelp();
            
            // Start interactive session
            this.rl.prompt();
            
        } catch (error) {
            console.error('\n❌ Startup failed:', error);
            process.exit(1);
        }
    }

    showWelcome() {
        console.log(`
✨ Welcome to your Claude-style Computer Agent!

I can help you automate any computer task by:
• 👁️  Observing and analyzing your screen
• 🧠 Planning step-by-step approaches
• ⚡ Executing actions with reasoning
• ✅ Verifying completion

I work just like Claude's computer use - I see what you see, think through 
the problem, and take action autonomously.

Current Status:
• Mode: ${this.currentMode}
• MCP Enhanced: ${this.agent.mcpClient ? 'Available' : 'Fallback'}
• Vision System: ${this.vision ? 'Active' : 'Limited'}
• Ready for tasks!
`);
    }

    showHelp() {
        console.log(`
📋 COMMANDS:
  
🎯 Task Execution:
  • Just describe what you want: "open Safari and search for news"
  • Complex workflows: "create a folder called Projects, then open VS Code"
  • System operations: "take a screenshot and save it to Desktop"

💬 Conversation:
  • help          - Show this help
  • status        - Show current system status  
  • demo          - Run demonstration tasks
  • mode <type>   - Change mode (interactive/autonomous/demo)
  • vision        - Analyze current screen
  • observe       - Take screenshot and analyze
  • clear         - Clear screen
  • exit/quit     - Shutdown agent

🔧 System Commands:
  • /screenshot   - Take and analyze screenshot
  • /elements     - Find all clickable elements
  • /text <query> - Search for text on screen
  • /apps         - List running applications
  • /mcp-status   - Check MCP server connectivity

Examples:
  🤖 Computer Agent > open calculator and compute 15 * 23
  🤖 Computer Agent > find all PDF files on Desktop and move them to Documents
  🤖 Computer Agent > open terminal and check system memory usage
  🤖 Computer Agent > take a screenshot and analyze what's on screen

Type any task description and I'll execute it step by step!
`);
    }

    async handleUserInput(input) {
        if (!input) {
            this.rl.prompt();
            return;
        }

        try {
            // Handle system commands
            if (input.startsWith('/')) {
                await this.handleSystemCommand(input);
                this.rl.prompt();
                return;
            }

            // Handle basic commands
            switch (input.toLowerCase()) {
                case 'help':
                case 'h':
                    this.showHelp();
                    break;
                    
                case 'status':
                    await this.showStatus();
                    break;
                    
                case 'demo':
                    await this.runDemo();
                    break;
                    
                case 'vision':
                case 'observe':
                    await this.analyzeCurrentScreen();
                    break;
                    
                case 'clear':
                    console.clear();
                    this.showWelcome();
                    break;
                    
                case 'exit':
                case 'quit':
                case 'q':
                    await this.shutdown();
                    process.exit(0);
                    break;
                    
                default:
                    // Handle as task request
                    await this.executeTask(input);
                    break;
            }
            
        } catch (error) {
            console.error('❌ Error processing input:', error);
        }
        
        this.rl.prompt();
    }

    async handleSystemCommand(command) {
        const [cmd, ...args] = command.slice(1).split(' ');
        
        switch (cmd) {
            case 'screenshot':
                await this.takeScreenshot();
                break;
                
            case 'elements':
                await this.findClickableElements();
                break;
                
            case 'text':
                const searchText = args.join(' ');
                if (searchText) {
                    await this.searchForText(searchText);
                } else {
                    console.log('❌ Please provide text to search for: /text <query>');
                }
                break;
                
            case 'apps':
                await this.listRunningApps();
                break;
                
            case 'mcp-status':
                await this.checkMCPStatus();
                break;
                
            case 'mode':
                const newMode = args[0];
                if (newMode) {
                    this.changeMode(newMode);
                } else {
                    console.log(`Current mode: ${this.currentMode}`);
                    console.log('Available modes: interactive, autonomous, demo');
                }
                break;
                
            default:
                console.log(`❌ Unknown system command: /${cmd}`);
                console.log('Available commands: /screenshot, /elements, /text, /apps, /mcp-status, /mode');
        }
    }

    async executeTask(taskDescription) {
        console.log(`\n🎯 Executing Task: "${taskDescription}"`);
        console.log('─'.repeat(60));
        
        try {
            const startTime = Date.now();
            
            // Execute task using the agent
            const result = await this.agent.executeTask(taskDescription, {
                dryRun: false,
                stopOnError: false
            });
            
            const executionTime = Date.now() - startTime;
            
            // Display results
            console.log('\n📊 EXECUTION SUMMARY:');
            console.log(`   ⏱️  Total Time: ${executionTime}ms`);
            console.log(`   ${result.success ? '✅' : '❌'} Status: ${result.success ? 'COMPLETED' : 'FAILED'}`);
            
            if (result.actions_taken) {
                console.log(`   🎯 Actions Taken: ${result.actions_taken}`);
            }
            
            if (result.verification) {
                console.log(`   🔍 Verification: ${result.verification.completed ? 'PASSED' : 'NEEDS REVIEW'}`);
                console.log(`   📊 Confidence: ${(result.verification.completion_confidence * 100).toFixed(1)}%`);
            }
            
            if (result.reasoning) {
                console.log(`   🧠 Reasoning: ${result.reasoning.slice(0, 100)}...`);
            }
            
            if (!result.success && result.error) {
                console.log(`   ❌ Error: ${result.error}`);
            }
            
            // Show recent actions for context
            if (result.session_log && result.session_log.length > 0) {
                console.log('\n📝 Recent Actions:');
                result.session_log.slice(-3).forEach(log => {
                    console.log(`   • ${log.type}: ${this.summarizeLogEntry(log)}`);
                });
            }
            
        } catch (error) {
            console.error('\n❌ Task execution failed:', error);
        }
        
        console.log('\n' + '─'.repeat(60));
    }

    summarizeLogEntry(logEntry) {
        switch (logEntry.type) {
            case 'observation':
                return `Observed ${logEntry.data.summary || 'screen state'}`;
            case 'planning':
                return `Planned ${logEntry.data.steps_planned || 0} steps`;
            case 'verification':
                return `Verified completion (${(logEntry.data.completion_confidence * 100).toFixed(0)}% confidence)`;
            default:
                return logEntry.data?.summary || 'Action completed';
        }
    }

    async analyzeCurrentScreen() {
        console.log('\n👁️  CURRENT SCREEN ANALYSIS');
        console.log('─'.repeat(60));
        
        try {
            const analysis = await this.vision.analyzeScreen();
            
            if (analysis.success) {
                const data = analysis.analysis;
                
                console.log(`📊 Screen Analysis Results:`);
                console.log(`   📐 Dimensions: ${data.dimensions.width}x${data.dimensions.height}`);
                console.log(`   🎯 Elements Detected: ${data.detected_elements.length}`);
                console.log(`   📝 Text Blocks: ${data.text_content.length}`);
                console.log(`   🖱️  Clickable Areas: ${data.clickable_areas.length}`);
                console.log(`   📸 Screenshot: ${analysis.screenshot_path}`);
                
                if (data.layout_analysis.estimated_focus) {
                    console.log(`   🎯 Estimated Focus: ${data.layout_analysis.estimated_focus}`);
                }
                
                // Show detected elements
                if (data.detected_elements.length > 0) {
                    console.log('\n🔍 Detected Elements:');
                    data.detected_elements.slice(0, 5).forEach(elem => {
                        console.log(`   • ${elem.type}: "${elem.text || 'No text'}" at (${elem.bounds.x}, ${elem.bounds.y})`);
                    });
                    
                    if (data.detected_elements.length > 5) {
                        console.log(`   ... and ${data.detected_elements.length - 5} more`);
                    }
                }
                
                // Show clickable areas
                if (data.clickable_areas.length > 0) {
                    console.log('\n🖱️  Clickable Areas:');
                    data.clickable_areas.slice(0, 5).forEach(area => {
                        console.log(`   • ${area.type}: "${area.label}" (${area.action_hint})`);
                    });
                }
                
            } else {
                console.log('❌ Screen analysis failed:', analysis.error);
            }
            
        } catch (error) {
            console.error('❌ Screen analysis error:', error);
        }
        
        console.log('─'.repeat(60));
    }

    async showStatus() {
        console.log('\n📊 SYSTEM STATUS');
        console.log('─'.repeat(60));
        
        try {
            const agentStatus = this.agent.getStatus();
            const visionStatus = this.vision.getStatus();
            
            console.log('🤖 Computer Agent:');
            console.log(`   • Initialized: ${agentStatus.initialized ? '✅' : '❌'}`);
            console.log(`   • Current Task: ${agentStatus.current_task || 'None'}`);
            console.log(`   • Task Status: ${agentStatus.task_status}`);
            console.log(`   • Session Actions: ${agentStatus.session_actions}`);
            console.log(`   • Last Screen State: ${agentStatus.last_screen_state}`);
            
            console.log('\n👁️  Computer Vision:');
            console.log(`   • Screenshot Capability: ${visionStatus.capabilities.screenshot_analysis ? '✅' : '❌'}`);
            console.log(`   • Element Detection: ${visionStatus.capabilities.element_detection ? '✅' : '❌'}`);
            console.log(`   • Text Recognition: ${visionStatus.capabilities.text_recognition ? '✅' : '❌'}`);
            console.log(`   • Cache Size: ${visionStatus.cache_size}/${visionStatus.max_cache_size}`);
            
            console.log('\n🔗 MCP Client:');
            if (agentStatus.mcp_client) {
                console.log(`   • Status: ${agentStatus.mcp_client.fallbackMode ? 'Fallback Mode' : 'Connected'}`);
                console.log(`   • Servers: ${agentStatus.mcp_client.connectedServers || 0}/3 connected`);
            } else {
                console.log('   • Status: Not available');
            }
            
            console.log('\n🤖 AI Service:');
            if (agentStatus.ai_service) {
                console.log(`   • Status: ${agentStatus.ai_service.initialized ? 'Ready' : 'Limited'}`);
                console.log(`   • Mode: ${agentStatus.ai_service.fallbackMode ? 'Fallback' : 'Enhanced'}`);
            } else {
                console.log('   • Status: Not available');
            }
            
            console.log(`\n⚙️  System:');
            console.log(`   - Mode: ${this.currentMode}`);
            console.log(`   - Platform: ${process.platform}`);
            console.log(`   - Node Version: ${process.version}`);
            console.log(`   - Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
            
        } catch (error) {
            console.error('❌ Status check failed:', error);
        }
        
        console.log('─'.repeat(60));
    }

    async runDemo() {
        console.log('\n🎪 DEMO MODE - Computer Agent Capabilities');
        console.log('─'.repeat(60));
        
        const demoTasks = [
            "Observe current screen and analyze what's visible",
            "Take a screenshot and identify clickable elements",
            "Search for any buttons with text 'OK' or 'Cancel'",
            "Demonstrate multi-step task planning",
            "Show reasoning and verification process"
        ];
        
        console.log('Available demo tasks:');
        demoTasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ${task}`);
        });
        
        console.log('\nRunning demonstration...\n');
        
        try {
            // Demo 1: Screen observation
            console.log('📊 Demo 1: Screen Observation');
            await this.analyzeCurrentScreen();
            
            await this.delay(2000);
            
            // Demo 2: Element search
            console.log('\n🔍 Demo 2: Element Search');
            await this.findClickableElements();
            
            await this.delay(2000);
            
            // Demo 3: Planning demonstration
            console.log('\n🧠 Demo 3: Task Planning (Dry Run)');
            const demoResult = await this.agent.executeTask("open calculator and compute 15 * 23", { dryRun: true });
            
            if (demoResult.plan) {
                console.log(`   📋 Generated ${demoResult.plan.steps.length}-step plan:`);
                demoResult.plan.steps.forEach((step, index) => {
                    console.log(`      ${index + 1}. ${step.description || step.type}`);
                });
            }
            
            console.log('\n✅ Demo completed! The agent is ready for real tasks.');
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        }
        
        console.log('─'.repeat(60));
    }

    async takeScreenshot() {
        console.log('\n📸 Taking screenshot...');
        
        try {
            const result = await this.vision.takeScreenshot();
            
            if (result.success) {
                console.log(`   ✅ Screenshot saved: ${result.path}`);
                
                // Quick analysis
                const analysis = await this.vision.analyzeScreen();
                if (analysis.success) {
                    console.log(`   📊 Quick analysis: ${analysis.analysis.detected_elements.length} elements, ${analysis.analysis.clickable_areas.length} clickable areas`);
                }
            } else {
                console.log(`   ❌ Screenshot failed: ${result.error}`);
            }
            
        } catch (error) {
            console.error('❌ Screenshot error:', error);
        }
    }

    async findClickableElements() {
        console.log('\n🖱️  Finding clickable elements...');
        
        try {
            const result = await this.vision.findClickableElements();
            
            if (result.found) {
                console.log(`   ✅ Found ${result.count} clickable elements:`);
                
                result.elements.forEach((element, index) => {
                    console.log(`      ${index + 1}. ${element.type}: "${element.label}" at (${element.bounds.x}, ${element.bounds.y}) - ${element.action_hint}`);
                });
            } else {
                console.log('   ❌ No clickable elements found');
            }
            
        } catch (error) {
            console.error('❌ Element search error:', error);
        }
    }

    async searchForText(searchText) {
        console.log(`\n🔍 Searching for text: "${searchText}"`);
        
        try {
            const result = await this.vision.findElementByText(searchText, { fuzzy: true });
            
            if (result.found) {
                console.log(`   ✅ Found ${result.elements.length} matching elements:`);
                
                result.elements.forEach((element, index) => {
                    console.log(`      ${index + 1}. "${element.text}" at (${element.bounds.x}, ${element.bounds.y}) - confidence: ${(element.confidence * 100).toFixed(1)}%`);
                });
            } else {
                console.log(`   ❌ Text "${searchText}" not found on screen`);
            }
            
        } catch (error) {
            console.error('❌ Text search error:', error);
        }
    }

    async listRunningApps() {
        console.log('\n📱 Attempting to list running applications...');
        
        try {
            // This would use the system automation service to get running apps
            const agentStatus = this.agent.getStatus();
            
            if (agentStatus.last_screen_state && agentStatus.last_screen_state !== 'unknown') {
                console.log(`   🎯 Currently active: ${agentStatus.last_screen_state}`);
            } else {
                console.log('   ❌ Unable to determine active application');
            }
            
            console.log('   💡 For full app listing, use: /screenshot to analyze current screen');
            
        } catch (error) {
            console.error('❌ App listing error:', error);
        }
    }

    async checkMCPStatus() {
        console.log('\n🔗 Checking MCP Server Status...');
        
        try {
            const agentStatus = this.agent.getStatus();
            
            if (agentStatus.mcp_client) {
                console.log(`   📊 MCP Client Status:`);
                console.log(`      • Mode: ${agentStatus.mcp_client.fallbackMode ? 'Fallback' : 'Enhanced'}`);
                console.log(`      • Connected Servers: ${agentStatus.mcp_client.connectedServers || 0}/3`);
                console.log(`      • Last Connection: ${agentStatus.mcp_client.lastConnectionAttempt || 'Unknown'}`);
                
                if (agentStatus.mcp_client.fallbackMode) {
                    console.log('\n   💡 To enable MCP enhancement:');
                    console.log('      1. Run: npm run setup:mcp');
                    console.log('      2. Start servers: npm run start:mcp');
                    console.log('      3. Restart this agent');
                }
            } else {
                console.log('   ❌ MCP Client not available');
            }
            
        } catch (error) {
            console.error('❌ MCP status check error:', error);
        }
    }

    changeMode(newMode) {
        const validModes = ['interactive', 'autonomous', 'demo'];
        
        if (validModes.includes(newMode)) {
            this.currentMode = newMode;
            console.log(`✅ Mode changed to: ${newMode}`);
            
            switch (newMode) {
                case 'interactive':
                    console.log('   💬 Interactive mode: Ask me to perform tasks step by step');
                    break;
                case 'autonomous':
                    console.log('   🤖 Autonomous mode: I will work independently with minimal prompts');
                    break;
                case 'demo':
                    console.log('   🎪 Demo mode: I will demonstrate capabilities without taking real actions');
                    break;
            }
        } else {
            console.log(`❌ Invalid mode: ${newMode}`);
            console.log(`Available modes: ${validModes.join(', ')}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        console.log('\n🛑 Shutting down Computer Agent...');
        
        try {
            await this.agent.shutdown();
            
            // Cleanup screenshots
            await this.vision.cleanupScreenshots();
            
            this.rl.close();
            
            console.log('✅ Shutdown complete');
            
        } catch (error) {
            console.error('❌ Shutdown error:', error);
        }
    }
}

// Run the interactive agent
if (require.main === module) {
    const agent = new InteractiveComputerAgent();
    agent.start().catch(error => {
        console.error('❌ Failed to start Computer Agent:', error);
        process.exit(1);
    });
}

module.exports = InteractiveComputerAgent;
