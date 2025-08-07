const MCPEnhancedGeminiAIService = require('./mcp-enhanced-gemini-ai-service');
const MCPClient = require('./mcp-client');
const SystemAutomationService = require('../automation/system-automation');
const fs = require('fs');
const path = require('path');

class ClaudeStyleComputerAgent {
    constructor() {
        this.geminiAI = new MCPEnhancedGeminiAIService();
        this.mcpClient = new MCPClient();
        this.systemAutomation = new SystemAutomationService();
        this.isInitialized = false;
        this.sessionLog = [];
        this.currentTask = null;
        this.capabilities = {
            screen_analysis: true,
            application_control: true,
            file_operations: true,
            web_browsing: true,
            text_processing: true,
            system_commands: true,
            multi_step_workflows: true,
            learning_from_context: true
        };
        
        // Claude-like reasoning and observation
        this.lastScreenState = null;
        this.currentContext = null;
        this.planningHistory = [];
        this.actionHistory = [];
    }

    async initialize() {
        try {
            console.log('🤖 Initializing Claude-Style Computer Agent...');
            
            // Initialize core services
            const mcpInit = await this.mcpClient.initialize();
            const geminiInit = await this.geminiAI.initialize();
            const systemInit = await this.systemAutomation.initialize();
            
            this.isInitialized = mcpInit || geminiInit || systemInit;
            
            if (this.isInitialized) {
                console.log('✅ Claude-Style Computer Agent ready');
                console.log('🎯 Capabilities: Screen analysis, app control, file ops, web browsing');
                console.log('🧠 Mode: Autonomous reasoning with step-by-step execution');
                
                // Initialize session
                this.startSession();
            }
            
            return this.isInitialized;
        } catch (error) {
            console.error('❌ Failed to initialize Computer Agent:', error);
            return false;
        }
    }

    startSession() {
        const session = {
            id: `session_${Date.now()}`,
            start_time: new Date().toISOString(),
            capabilities: this.capabilities,
            mode: 'claude_style_autonomous'
        };
        
        this.sessionLog.push({
            type: 'session_start',
            data: session,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🚀 Started Computer Agent session: ${session.id}`);
    }

    async executeTask(userRequest, options = {}) {
        try {
            console.log(`\n🎯 New Task: "${userRequest}"`);
            
            this.currentTask = {
                request: userRequest,
                start_time: new Date().toISOString(),
                steps: [],
                status: 'planning',
                attempts: 0,
                max_attempts: 3,
                feedback_history: []
            };

            // Enhanced iterative execution with feedback loop
            return await this.executeTaskWithFeedback(userRequest, options);
            
        } catch (error) {
            console.error('❌ Task execution failed:', error);
            
            if (this.currentTask) {
                this.currentTask.status = 'failed';
                this.currentTask.error = error.message;
                this.currentTask.end_time = new Date().toISOString();
            }
            
            return {
                success: false,
                task: userRequest,
                error: error.message,
                session_log: this.getRecentLog(5),
                timestamp: new Date().toISOString()
            };
        }
    }

    async executeTaskWithFeedback(userRequest, options = {}) {
        let lastResult = null;
        let currentPlan = null;
        
        while (this.currentTask.attempts < this.currentTask.max_attempts) {
            this.currentTask.attempts++;
            console.log(`\n🔄 Attempt ${this.currentTask.attempts}/${this.currentTask.max_attempts}`);
            
            try {
                // Step 1: Observe current screen state (like Claude)
                console.log('👁️  Step 1: Observing current screen state...');
                const screenState = await this.observeScreen();
                
                // Step 2: Enhanced analysis with previous attempt feedback
                console.log('🧠 Step 2: Analyzing situation and planning approach...');
                currentPlan = await this.analyzeAndPlanWithFeedback(userRequest, screenState, lastResult);
                
                // Step 3: Ask for clarification if needed
                const clarification = await this.checkIfClarificationNeeded(currentPlan, userRequest);
                if (clarification.needed) {
                    console.log(`\n❓ Clarification needed: ${clarification.question}`);
                    // In real implementation, this would prompt user for input
                    // For now, we'll proceed with best guess
                    console.log(`💭 Proceeding with best interpretation...`);
                }
                
                // Step 4: Execute plan with reasoning
                console.log('⚡ Step 3: Executing planned actions...');
                const result = await this.executeWithAdaptiveReasoning(currentPlan, options, lastResult);
                
                // Step 5: Enhanced verification with feedback analysis
                console.log('✅ Step 4: Verifying task completion...');
                const verification = await this.verifyCompletionWithFeedback(userRequest, result, this.currentTask.attempts);
                
                // Step 6: Analyze if we need to retry or adjust approach
                const shouldContinue = await this.analyzeIfShouldContinue(verification, result, userRequest);
                
                if (verification.completed || shouldContinue.stop) {
                    this.currentTask.status = verification.completed ? 'completed' : 'partial';
                    this.currentTask.end_time = new Date().toISOString();
                    
                    return {
                        success: verification.completed,
                        task: userRequest,
                        plan: currentPlan,
                        execution_result: result,
                        verification: verification,
                        session_log: this.getRecentLog(10),
                        reasoning: currentPlan.reasoning,
                        actions_taken: this.currentTask.steps.length,
                        attempts_made: this.currentTask.attempts,
                        feedback_history: this.currentTask.feedback_history,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    // Store feedback for next attempt
                    this.currentTask.feedback_history.push({
                        attempt: this.currentTask.attempts,
                        plan: currentPlan,
                        result: result,
                        verification: verification,
                        lessons: shouldContinue.lessons,
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`\n🔄 Task not completed. ${shouldContinue.reason}`);
                    console.log(`💡 Next attempt will: ${shouldContinue.next_approach}`);
                    
                    lastResult = result;
                    await this.delay(2000); // Brief pause before retry
                }
                
            } catch (error) {
                console.error(`❌ Attempt ${this.currentTask.attempts} failed:`, error);
                lastResult = { error: error.message, success: false };
            }
        }
        
        // Max attempts reached
        console.log(`\n⚠️ Max attempts (${this.currentTask.max_attempts}) reached`);
        this.currentTask.status = 'incomplete';
        this.currentTask.end_time = new Date().toISOString();
        
        return {
            success: false,
            task: userRequest,
            plan: currentPlan,
            execution_result: lastResult,
            verification: { completed: false, reason: 'Max attempts reached' },
            session_log: this.getRecentLog(10),
            reasoning: currentPlan?.reasoning || 'Task analysis incomplete',
            actions_taken: this.currentTask.steps.length,
            attempts_made: this.currentTask.attempts,
            feedback_history: this.currentTask.feedback_history,
            timestamp: new Date().toISOString()
        };
    }

    async analyzeAndPlanWithFeedback(userRequest, screenState, previousResult = null) {
        console.log('   🔍 Analyzing user request with feedback integration...');
        
        // Build enhanced prompt with previous attempt feedback
        let feedbackContext = '';
        if (previousResult && this.currentTask.feedback_history.length > 0) {
            const lastFeedback = this.currentTask.feedback_history[this.currentTask.feedback_history.length - 1];
            feedbackContext = `
PREVIOUS ATTEMPT FEEDBACK:
- Attempt ${lastFeedback.attempt} result: ${lastFeedback.result.successful_steps}/${lastFeedback.result.steps_executed?.length || 0} steps successful
- What failed: ${lastFeedback.lessons.failed_actions?.join(', ') || 'Unknown'}
- Lessons learned: ${lastFeedback.lessons.improvements?.join(', ') || 'Need different approach'}
- Screen state after last attempt: ${screenState.active_application?.app || 'Unknown'}

ADJUSTMENT STRATEGY:
Based on previous failures, I need to adjust my approach by: ${lastFeedback.lessons.next_strategy || 'trying alternative methods'}
`;
        }
        
        // Create comprehensive task analysis prompt for Gemini
        const analysisPrompt = `
You are an expert computer automation assistant. I need you to analyze this user request and create a detailed execution plan.

USER REQUEST: "${userRequest}"
${feedbackContext}

CURRENT SCREEN STATE:
- Active Application: ${screenState.active_application?.app || 'Unknown'}
- Platform: ${process.platform} (macOS/Windows/Linux)
- Visible Elements: ${screenState.visible_elements.length} UI elements detected
- Clickable Areas: ${screenState.clickable_areas.length} interactive elements
- Context Quality: ${screenState.screen_data.fallback ? 'Basic (fallback mode)' : 'Detailed (MCP enhanced)'}

AVAILABLE CAPABILITIES:
1. Screen Analysis: Take screenshots, detect UI elements, read text
2. Mouse Control: Click, drag, move to any screen coordinate  
3. Keyboard Control: Type text, press keys, use shortcuts (Cmd/Ctrl+C, etc.)
4. Application Control: Open/close apps, switch between windows
5. File Operations: Create, move, copy, delete files and folders
6. Web Browsing: Navigate websites, fill forms, click links
7. System Commands: Run terminal/command prompt commands
8. Cross-platform shortcuts:
   - macOS: Cmd+Space (Spotlight), Cmd+Tab (app switch), Cmd+Q (quit)
   - Windows: Win+R (run), Alt+Tab (app switch), Alt+F4 (close)
   - Universal: Ctrl+C/V (copy/paste), F11 (fullscreen)

SPECIFIC TASK EXAMPLES AND APPROACHES:

1. "Send WhatsApp message to Data":
   APPROACH A (Web): Open browser → Navigate to web.whatsapp.com → Search "Data" → Click chat → Type message → Press Enter
   APPROACH B (App): Open WhatsApp desktop app → Search "Data" → Click chat → Type message → Send
   SHORTCUTS: Cmd/Ctrl+F (search), Enter (send message)

2. "Delete last downloaded video from downloads":
   APPROACH: Open Downloads folder → Sort by date modified (newest first) → Find video file (.mp4, .avi, .mov, .mkv) → Select → Delete
   SHORTCUTS: Cmd/Ctrl+Shift+J (downloads), Cmd/Ctrl+Delete (delete file)

3. "Send email to xyz@gmail.com":
   APPROACH A (Gmail): Open browser → Navigate to gmail.com → Click Compose → Enter recipient → Type subject → Type message → Send
   APPROACH B (Mail app): Open Mail app → Click New Message → Enter details → Send
   SHORTCUTS: Cmd/Ctrl+Enter (send), Tab (move between fields)

TASK ANALYSIS REQUIREMENTS:
1. Break down the request into specific, actionable steps
2. Identify what applications need to be opened
3. Determine exact keyboard shortcuts and mouse actions needed
4. Consider the current screen state and what's already visible
5. Plan for error handling and verification steps
6. Include timing delays where needed for UI responses
7. Provide fallback methods if primary approach fails

Please provide a detailed JSON response with this structure:
{
  "reasoning": "Detailed analysis of the task and chosen approach...",
  "confidence": 0.9,
  "complexity": "low/medium/high", 
  "estimated_time": 15000,
  "required_apps": ["WhatsApp", "Browser"],
  "primary_method": "web_based",
  "steps": [
    {
      "step_number": 1,
      "type": "openApp",
      "description": "Open Safari browser", 
      "appName": "Safari",
      "reasoning": "Need browser to access WhatsApp Web",
      "alternatives": ["Chrome", "Firefox"],
      "shortcuts": ["Cmd+Space to open Spotlight"],
      "expected_outcome": "Safari should launch and show homepage",
      "verification": "Check if Safari window is active"
    }
  ],
  "shortcuts": ["Cmd+T for new tab", "Cmd+L for address bar"],
  "verification_steps": ["Check if message appears in chat", "Look for message sent confirmation"],
  "fallback_options": ["Use WhatsApp desktop app", "Use phone if web fails"],
  "clarification_needed": {
    "needed": false,
    "questions": []
  }
}

Focus on providing the most reliable approach for the current platform and screen state.
`;

        try {
            // Get AI analysis and planning
            const aiResponse = await this.geminiAI.processCommand(analysisPrompt);
            
            // Parse AI response into structured plan
            let plan;
            if (aiResponse && aiResponse.plan) {
                plan = this.parseAIPlan(aiResponse.plan, userRequest, screenState);
            } else {
                // Try to extract plan from text response
                plan = this.extractPlanFromText(aiResponse, userRequest, screenState);
            }
            
            // Add feedback-specific enhancements
            if (previousResult) {
                plan = this.enhancePlanWithFeedback(plan, previousResult);
            }
            
            console.log(`   ✅ Created ${plan.steps.length}-step execution plan (${plan.complexity} complexity)`);
            
            // Log planning with enhanced details
            this.logAction('planning', {
                request: userRequest,
                attempt: this.currentTask.attempts,
                steps_planned: plan.steps.length,
                complexity: plan.complexity,
                estimated_time: plan.estimated_time,
                required_apps: plan.required_apps,
                reasoning_summary: plan.reasoning.slice(0, 200) + '...',
                confidence: plan.confidence,
                has_feedback: previousResult !== null
            });
            
            return plan;
            
        } catch (error) {
            console.error('   ❌ AI planning failed, using enhanced fallback approach');
            
            // Enhanced fallback planning based on task type
            return this.createIntelligentFallbackPlan(userRequest, screenState);
        }
    }

    async checkIfClarificationNeeded(plan, userRequest) {
        // Check if the plan indicates clarification is needed
        if (plan.clarification_needed && plan.clarification_needed.needed) {
            return {
                needed: true,
                question: plan.clarification_needed.questions[0] || 'Need more details about the task',
                suggestions: plan.clarification_needed.questions || []
            };
        }
        
        // Detect ambiguous requests that might need clarification
        const ambiguousPatterns = [
            { pattern: /send.*message.*to\s+(\w+)/, question: 'What message would you like to send?' },
            { pattern: /email.*to\s+([^\s]+)/, question: 'What should be the subject and content of the email?' },
            { pattern: /delete.*file/, question: 'Which specific file should I delete?' },
            { pattern: /open.*app/, question: 'Which application would you like me to open?' }
        ];
        
        for (const { pattern, question } of ambiguousPatterns) {
            if (pattern.test(userRequest.toLowerCase())) {
                // For now, we'll proceed without asking, but this could be enhanced
                return {
                    needed: false,
                    potential_question: question,
                    proceeding_with_assumption: true
                };
            }
        }
        
        return { needed: false };
    }

    async executeWithAdaptiveReasoning(plan, options = {}, previousResult = null) {
        console.log(`   🎯 Executing ${plan.steps.length} planned steps with adaptive reasoning...`);
        
        const executionResults = {
            plan: plan,
            steps_executed: [],
            successful_steps: 0,
            failed_steps: 0,
            total_time: 0,
            reasoning_log: [],
            adaptive_changes: [],
            previous_result: previousResult
        };

        const dryRun = options.dryRun || false;
        
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const startTime = Date.now();
            
            console.log(`\n   📍 Step ${i + 1}/${plan.steps.length}: ${step.description}`);
            
            try {
                // Enhanced reasoning before action (considers previous failures)
                const preActionReasoning = await this.reasonBeforeActionWithFeedback(step, i, previousResult);
                
                // Adaptive step modification based on current context
                const adaptedStep = await this.adaptStepBasedOnContext(step, i, executionResults);
                if (adaptedStep.modified) {
                    console.log(`      🔧 Step adapted: ${adaptedStep.changes}`);
                    executionResults.adaptive_changes.push(adaptedStep);
                }
                
                // Execute the step (adapted or original)
                let stepResult;
                if (dryRun) {
                    stepResult = { success: true, action: 'simulated', dry_run: true };
                    console.log('      🔍 [DRY RUN] Simulated execution');
                } else {
                    stepResult = await this.executeEnhancedStep(adaptedStep.step || step);
                }
                
                // Enhanced reasoning after action (with adaptation analysis)
                const postActionReasoning = await this.reasonAfterActionWithFeedback(step, stepResult, i);
                
                const executionTime = Date.now() - startTime;
                executionResults.total_time += executionTime;
                
                const stepExecutionResult = {
                    step_number: i + 1,
                    original_step: step,
                    adapted_step: adaptedStep.step || step,
                    result: stepResult,
                    execution_time: executionTime,
                    pre_reasoning: preActionReasoning,
                    post_reasoning: postActionReasoning,
                    success: stepResult.success || false,
                    adaptation_applied: adaptedStep.modified,
                    timestamp: new Date().toISOString()
                };
                
                executionResults.steps_executed.push(stepExecutionResult);
                
                if (stepResult.success) {
                    executionResults.successful_steps++;
                    step.status = 'completed';
                    console.log(`      ✅ Step completed in ${executionTime}ms`);
                } else {
                    executionResults.failed_steps++;
                    step.status = 'failed';
                    console.log(`      ❌ Step failed: ${stepResult.error || 'Unknown error'}`);
                    
                    // Enhanced recovery with learning from previous attempts
                    if (!options.stopOnError) {
                        console.log(`      🔄 Attempting intelligent recovery...`);
                        const recovery = await this.attemptIntelligentRecovery(step, stepResult, previousResult);
                        if (recovery.success) {
                            executionResults.successful_steps++;
                            step.status = 'recovered';
                            console.log(`      ✅ Recovery successful: ${recovery.method}`);
                        }
                    }
                }
                
                // Update current task
                this.currentTask.steps.push(stepExecutionResult);
                
                // Adaptive delay based on step type and success
                if (i < plan.steps.length - 1 && !dryRun) {
                    const delay = this.calculateAdaptiveDelay(step, stepResult);
                    await this.delay(delay);
                }
                
            } catch (error) {
                console.error(`      ❌ Step execution error:`, error);
                
                executionResults.failed_steps++;
                step.status = 'error';
                
                executionResults.steps_executed.push({
                    step_number: i + 1,
                    step: step,
                    error: error.message,
                    execution_time: Date.now() - startTime,
                    success: false,
                    timestamp: new Date().toISOString()
                });
                
                if (options.stopOnError !== false) {
                    console.log('      🛑 Stopping execution due to error');
                    break;
                }
            }
        }
        
        console.log(`\n   📊 Execution Summary: ${executionResults.successful_steps}/${plan.steps.length} steps successful`);
        
        return executionResults;
    }

    async verifyCompletionWithFeedback(userRequest, executionResult, attemptNumber) {
        console.log('   🔍 Verifying task completion with enhanced feedback analysis...');
        
        // Take final screen observation
        const finalScreenState = await this.observeScreen();
        
        // Enhanced completion verification with attempt history
        const verification = {
            completed: false,
            success_rate: (executionResult.successful_steps / (executionResult.steps_executed?.length || 1)) * 100,
            final_screen_state: finalScreenState,
            completion_confidence: 0.0,
            verification_method: 'enhanced_feedback',
            attempt_number: attemptNumber,
            detailed_analysis: {},
            recommendations: [],
            timestamp: new Date().toISOString()
        };
        
        // Detailed success analysis
        verification.detailed_analysis = {
            steps_total: executionResult.steps_executed?.length || 0,
            steps_successful: executionResult.successful_steps,
            steps_failed: executionResult.failed_steps,
            adaptive_changes_applied: executionResult.adaptive_changes?.length || 0,
            execution_time: executionResult.total_time,
            screen_changed: this.hasScreenChanged(finalScreenState)
        };
        
        // Task-specific verification
        const taskSpecificVerification = await this.performTaskSpecificVerification(userRequest, finalScreenState, executionResult);
        verification.task_specific = taskSpecificVerification;
        
        // Calculate completion confidence
        verification.completion_confidence = this.calculateCompletionConfidence(verification, taskSpecificVerification);
        verification.completed = verification.completion_confidence >= 0.7;
        
        // Generate recommendations for improvement
        if (!verification.completed) {
            verification.recommendations = await this.generateImprovementRecommendations(userRequest, executionResult, finalScreenState);
        }
        
        // Enhanced AI verification if available
        try {
            const verificationPrompt = `
Analyze task completion for: "${userRequest}"

EXECUTION SUMMARY:
- Attempt: ${attemptNumber}
- Steps executed: ${verification.detailed_analysis.steps_successful}/${verification.detailed_analysis.steps_total}
- Success rate: ${verification.success_rate.toFixed(1)}%
- Final screen state: ${finalScreenState.active_application?.app || 'unknown'}
- Screen changed: ${verification.detailed_analysis.screen_changed}

TASK-SPECIFIC VERIFICATION:
${JSON.stringify(taskSpecificVerification, null, 2)}

Based on this information, provide:
1. Is the task completed? (true/false)
2. Confidence score (0-1)
3. What evidence supports completion?
4. What might be missing?
5. Recommendations for next attempt (if needed)

Respond in JSON format:
{
  "completed": true/false,
  "confidence": 0.8,
  "evidence": ["Message sent confirmation visible", "Chat shows new message"],
  "missing": ["Delivery confirmation not visible"],
  "recommendations": ["Wait longer for delivery confirmation", "Check internet connection"]
}
`;
            
            const aiVerification = await this.geminiAI.processCommand(verificationPrompt);
            if (aiVerification && aiVerification.verification) {
                verification.ai_analysis = aiVerification.verification;
                verification.completed = aiVerification.verification.completed;
                verification.completion_confidence = Math.max(verification.completion_confidence, aiVerification.verification.confidence);
                verification.verification_method = 'ai_enhanced_feedback';
            }
            
        } catch (error) {
            console.log('   ⚠️ AI verification unavailable, using basic verification');
        }
        
        this.logAction('verification', verification);
        
        console.log(`   📊 Completion: ${verification.completed ? 'YES' : 'NO'} (${(verification.completion_confidence * 100).toFixed(1)}% confidence)`);
        
        return verification;
    }

    async observeScreen() {
        console.log('   📊 Gathering comprehensive screen context...');
        
        // Gather structured screen data (like Claude's observation)
        const screenContext = await this.mcpClient.gatherScreenContext();
        
        // Analyze current state
        const observation = {
            timestamp: new Date().toISOString(),
            screen_data: screenContext,
            active_application: null,
            visible_elements: [],
            clickable_areas: [],
            text_content: [],
            current_focus: null,
            screen_resolution: null
        };

        // Extract key information
        if (screenContext.context) {
            if (screenContext.context.activeWindow) {
                observation.active_application = screenContext.context.activeWindow.result || screenContext.context.activeWindow;
            }
            
            if (screenContext.context.uiElements) {
                observation.visible_elements = screenContext.context.uiElements.result || screenContext.context.uiElements || [];
            }
            
            if (screenContext.context.clickableElements) {
                observation.clickable_areas = screenContext.context.clickableElements.result || screenContext.context.clickableElements || [];
            }
        }

        // Log observation (like Claude's thought process)
        this.logAction('observation', {
            summary: `Observed ${observation.visible_elements.length} UI elements, ${observation.clickable_areas.length} clickable areas`,
            active_app: observation.active_application?.app || 'unknown',
            context_quality: screenContext.fallback ? 'basic' : 'detailed'
        });

        console.log(`   ✅ Observed: ${observation.active_application?.app || 'Unknown app'}, ${observation.visible_elements.length} elements`);
        
        this.lastScreenState = observation;
        return observation;
    }

    async analyzeAndPlan(userRequest, screenState) {
        console.log('   🔍 Analyzing user request and current context...');
        
        // Create comprehensive task analysis prompt for Gemini
        const analysisPrompt = `
You are an expert computer automation assistant. I need you to analyze this user request and create a detailed execution plan.

USER REQUEST: "${userRequest}"

CURRENT SCREEN STATE:
- Active Application: ${screenState.active_application?.app || 'Unknown'}
- Platform: ${process.platform} (macOS/Windows/Linux)
- Visible Elements: ${screenState.visible_elements.length} UI elements detected
- Clickable Areas: ${screenState.clickable_areas.length} interactive elements
- Context Quality: ${screenState.screen_data.fallback ? 'Basic (fallback mode)' : 'Detailed (MCP enhanced)'}

AVAILABLE CAPABILITIES:
1. Screen Analysis: Take screenshots, detect UI elements, read text
2. Mouse Control: Click, drag, move to any screen coordinate
3. Keyboard Control: Type text, press keys, use shortcuts (Cmd/Ctrl+C, etc.)
4. Application Control: Open/close apps, switch between windows
5. File Operations: Create, move, copy, delete files and folders
6. Web Browsing: Navigate websites, fill forms, click links
7. System Commands: Run terminal/command prompt commands
8. Cross-platform shortcuts: 
   - macOS: Cmd+Space (Spotlight), Cmd+Tab (app switch), Cmd+Q (quit)
   - Windows: Win+R (run), Alt+Tab (app switch), Alt+F4 (close)
   - Universal: Ctrl+C/V (copy/paste), F11 (fullscreen)

TASK ANALYSIS REQUIREMENTS:
1. Break down the request into specific, actionable steps
2. Identify what applications need to be opened
3. Determine keyboard shortcuts and mouse actions needed
4. Consider the current screen state and what's already visible
5. Plan for error handling and verification steps
6. Include timing delays where needed for UI responses

For complex tasks like:
- "Send WhatsApp message to Data": Open WhatsApp Web/App → Search contact → Click → Type message → Send
- "Delete last downloaded video": Open Downloads folder → Sort by date → Find video file → Delete
- "Send email to xyz@gmail.com": Open Gmail/Mail app → Compose → Enter recipient → Type content → Send

Please provide:
1. REASONING: Explain your understanding of the task
2. STEP_BY_STEP_PLAN: Detailed execution steps with specific actions
3. REQUIRED_APPS: Applications that need to be opened
4. SHORTCUTS: Keyboard shortcuts to use
5. VERIFICATION: How to confirm the task was completed
6. FALLBACK: Alternative approaches if primary method fails

Respond in this JSON format:
{
  "reasoning": "Your analysis of the task...",
  "confidence": 0.9,
  "complexity": "low/medium/high",
  "estimated_time": 15000,
  "required_apps": ["WhatsApp", "Browser"],
  "primary_method": "web_based",
  "steps": [
    {
      "step_number": 1,
      "type": "openApp",
      "description": "Open Safari browser",
      "appName": "Safari",
      "reasoning": "Need browser to access WhatsApp Web"
    },
    {
      "step_number": 2,
      "type": "navigate",
      "description": "Navigate to WhatsApp Web",
      "url": "https://web.whatsapp.com",
      "reasoning": "Access WhatsApp through web interface"
    }
  ],
  "shortcuts": ["Cmd+T for new tab", "Cmd+L for address bar"],
  "verification_steps": ["Check if message appears in chat", "Look for message sent confirmation"],
  "fallback_options": ["Use WhatsApp desktop app", "Use phone if web fails"]
}
`;

        try {
            // Get AI analysis and planning
            const aiResponse = await this.geminiAI.processCommand(analysisPrompt);
            
            // Parse AI response into structured plan
            let plan;
            if (aiResponse && aiResponse.plan) {
                plan = this.parseAIPlan(aiResponse.plan, userRequest, screenState);
            } else {
                // Try to extract plan from text response
                plan = this.extractPlanFromText(aiResponse, userRequest, screenState);
            }
            
            console.log(`   ✅ Created ${plan.steps.length}-step execution plan (${plan.complexity} complexity)`);
            
            // Log planning with enhanced details
            this.logAction('planning', {
                request: userRequest,
                steps_planned: plan.steps.length,
                complexity: plan.complexity,
                estimated_time: plan.estimated_time,
                required_apps: plan.required_apps,
                reasoning_summary: plan.reasoning.slice(0, 200) + '...',
                confidence: plan.confidence
            });
            
            return plan;
            
        } catch (error) {
            console.error('   ❌ AI planning failed, using enhanced fallback approach');
            
            // Enhanced fallback planning based on task type
            return this.createIntelligentFallbackPlan(userRequest, screenState);
        }
    }

    parseAIPlan(aiPlan, userRequest, screenState) {
        // Parse structured AI response
        const plan = {
            request: userRequest,
            reasoning: aiPlan.reasoning || 'AI-generated plan for task execution',
            steps: aiPlan.steps || [],
            complexity: aiPlan.complexity || 'medium',
            estimated_time: aiPlan.estimated_time || 10000,
            required_apps: aiPlan.required_apps || [],
            shortcuts: aiPlan.shortcuts || [],
            verification_steps: aiPlan.verification_steps || [],
            fallback_options: aiPlan.fallback_options || [],
            confidence: aiPlan.confidence || 0.7,
            primary_method: aiPlan.primary_method || 'standard',
            requires_user_input: false,
            fallback_available: true
        };

        // Enhance steps with platform-specific details
        plan.steps = plan.steps.map((step, index) => ({
            ...step,
            step_number: index + 1,
            status: 'pending',
            platform_specific: this.addPlatformSpecificDetails(step),
            fallback_coordinates: this.generateFallbackCoordinates(step)
        }));

        // Check if user input might be needed
        const needsInput = plan.steps.some(step => 
            step.type === 'user_input' || 
            step.description.toLowerCase().includes('password') ||
            step.description.toLowerCase().includes('confirm') ||
            step.description.toLowerCase().includes('enter text')
        );
        plan.requires_user_input = needsInput;

        return plan;
    }

    extractPlanFromText(aiResponse, userRequest, screenState) {
        // Enhanced text parsing for when AI doesn't return structured JSON
        const responseText = JSON.stringify(aiResponse).toLowerCase();
        
        // Detect task type
        const taskType = this.detectTaskType(userRequest);
        const steps = this.generateStepsForTaskType(taskType, userRequest, screenState);
        
        const plan = {
            request: userRequest,
            reasoning: `Enhanced AI analysis for ${taskType} task: ${userRequest}`,
            steps: steps,
            complexity: steps.length > 5 ? 'high' : steps.length > 2 ? 'medium' : 'low',
            estimated_time: steps.length * 3000,
            required_apps: this.extractRequiredApps(userRequest, taskType),
            shortcuts: this.getRelevantShortcuts(taskType),
            verification_steps: [`Verify ${taskType} completed successfully`],
            fallback_options: ['Take screenshot and analyze result', 'Use alternative method'],
            confidence: 0.8,
            primary_method: taskType,
            requires_user_input: false,
            fallback_available: true
        };

        return plan;
    }

    detectTaskType(userRequest) {
        const request = userRequest.toLowerCase();
        
        // WhatsApp/Messaging
        if (request.includes('whatsapp') || request.includes('message') || request.includes('chat')) {
            return 'messaging';
        }
        
        // Email
        if (request.includes('email') || request.includes('mail') || request.includes('@')) {
            return 'email';
        }
        
        // File operations
        if (request.includes('delete') || request.includes('download') || request.includes('file') || request.includes('folder')) {
            return 'file_operation';
        }
        
        // Web browsing
        if (request.includes('search') || request.includes('browse') || request.includes('website') || request.includes('google')) {
            return 'web_browsing';
        }
        
        // Application control
        if (request.includes('open') || request.includes('launch') || request.includes('start')) {
            return 'app_control';
        }
        
        // System operations
        if (request.includes('screenshot') || request.includes('system') || request.includes('settings')) {
            return 'system_operation';
        }
        
        return 'general';
    }

    generateStepsForTaskType(taskType, userRequest, screenState) {
        const steps = [];
        
        switch (taskType) {
            case 'messaging':
                return this.generateMessagingSteps(userRequest);
            case 'email':
                return this.generateEmailSteps(userRequest);
            case 'file_operation':
                return this.generateFileOperationSteps(userRequest);
            case 'web_browsing':
                return this.generateWebBrowsingSteps(userRequest);
            case 'app_control':
                return this.generateAppControlSteps(userRequest);
            case 'system_operation':
                return this.generateSystemOperationSteps(userRequest);
            default:
                return this.generateGeneralSteps(userRequest);
        }
    }

    generateMessagingSteps(userRequest) {
        // Extract contact name from request
        const contactMatch = userRequest.match(/to\s+([^.\s]+)/i);
        const contactName = contactMatch ? contactMatch[1] : 'contact';
        
        // Extract message content
        const messageMatch = userRequest.match(/message[:\s]+"([^"]+)"/i) || 
                           userRequest.match(/send\s+([^.]+)\s+to/i);
        const messageContent = messageMatch ? messageMatch[1] : 'Hello';
        
        return [
            {
                type: 'openApp',
                description: 'Open WhatsApp (web or desktop)',
                appName: 'WhatsApp',
                alternatives: ['Safari', 'Chrome', 'WhatsApp'],
                reasoning: 'Need to access WhatsApp to send message'
            },
            {
                type: 'navigate',
                description: 'Navigate to WhatsApp Web if using browser',
                url: 'https://web.whatsapp.com',
                conditional: true,
                reasoning: 'Access WhatsApp through web interface'
            },
            {
                type: 'search',
                description: `Search for contact: ${contactName}`,
                searchText: contactName,
                searchMethod: 'text_input',
                reasoning: 'Find the contact to send message to'
            },
            {
                type: 'clickElement',
                description: `Click on ${contactName}'s chat`,
                elementText: contactName,
                reasoning: 'Open conversation with contact'
            },
            {
                type: 'typeText',
                description: `Type message: "${messageContent}"`,
                text: messageContent,
                reasoning: 'Enter the message content'
            },
            {
                type: 'pressKey',
                description: 'Send message (Enter key)',
                key: 'Return',
                reasoning: 'Send the typed message'
            },
            {
                type: 'verify',
                description: 'Verify message was sent',
                verification_method: 'check_for_checkmarks',
                reasoning: 'Confirm message delivery'
            }
        ];
    }

    generateEmailSteps(userRequest) {
        // Extract email details
        const emailMatch = userRequest.match(/to\s+([^\s@]+@[^\s.]+\.[^\s]+)/i);
        const emailAddress = emailMatch ? emailMatch[1] : 'example@email.com';
        
        const subjectMatch = userRequest.match(/subject[:\s]+"([^"]+)"/i);
        const subject = subjectMatch ? subjectMatch[1] : 'Message';
        
        return [
            {
                type: 'openApp',
                description: 'Open Mail app or Gmail',
                appName: 'Mail',
                alternatives: ['Gmail', 'Safari', 'Chrome'],
                reasoning: 'Need email client to send email'
            },
            {
                type: 'clickElement',
                description: 'Click Compose button',
                elementText: 'Compose',
                searchAlternatives: ['New Message', 'Write', '+'],
                reasoning: 'Start composing new email'
            },
            {
                type: 'typeText',
                description: `Enter recipient: ${emailAddress}`,
                text: emailAddress,
                targetField: 'to',
                reasoning: 'Add email recipient'
            },
            {
                type: 'typeText',
                description: `Enter subject: ${subject}`,
                text: subject,
                targetField: 'subject',
                reasoning: 'Add email subject'
            },
            {
                type: 'clickElement',
                description: 'Click in message body',
                elementType: 'textfield',
                targetField: 'body',
                reasoning: 'Focus on message content area'
            },
            {
                type: 'typeText',
                description: 'Type email content',
                text: 'Hello,\n\nThis is an automated message.\n\nBest regards',
                reasoning: 'Enter email message content'
            },
            {
                type: 'clickElement',
                description: 'Click Send button',
                elementText: 'Send',
                reasoning: 'Send the email'
            }
        ];
    }

    generateFileOperationSteps(userRequest) {
        const request = userRequest.toLowerCase();
        
        if (request.includes('delete') && request.includes('download')) {
            return [
                {
                    type: 'openFolder',
                    description: 'Open Downloads folder',
                    folderPath: process.platform === 'darwin' ? '~/Downloads' : 'Downloads',
                    reasoning: 'Access downloads to find files'
                },
                {
                    type: 'sortFiles',
                    description: 'Sort files by date (newest first)',
                    sortMethod: 'date_modified',
                    reasoning: 'Find the most recently downloaded files'
                },
                {
                    type: 'findFile',
                    description: 'Find last downloaded video file',
                    fileType: 'video',
                    extensions: ['.mp4', '.avi', '.mov', '.mkv'],
                    reasoning: 'Locate the target video file'
                },
                {
                    type: 'selectFile',
                    description: 'Select the video file',
                    selectionMethod: 'click',
                    reasoning: 'Select file for deletion'
                },
                {
                    type: 'deleteFile',
                    description: 'Delete selected file',
                    method: 'keyboard_shortcut',
                    key: process.platform === 'darwin' ? 'Cmd+Delete' : 'Delete',
                    reasoning: 'Remove the file from downloads'
                }
            ];
        }
        
        return [
            {
                type: 'analyzeRequest',
                description: 'Analyze file operation request',
                reasoning: 'Determine specific file operation needed'
            }
        ];
    }

    generateWebBrowsingSteps(userRequest) {
        // Extract search terms
        const searchMatch = userRequest.match(/search(?:\s+for)?\s+(.+)/i);
        const searchTerm = searchMatch ? searchMatch[1] : 'information';
        
        return [
            {
                type: 'openApp',
                description: 'Open web browser',
                appName: 'Safari',
                alternatives: ['Chrome', 'Firefox', 'Edge'],
                reasoning: 'Need browser for web search'
            },
            {
                type: 'navigate',
                description: 'Navigate to Google',
                url: 'https://www.google.com',
                reasoning: 'Access search engine'
            },
            {
                type: 'clickElement',
                description: 'Click search box',
                elementType: 'textfield',
                targetField: 'search',
                reasoning: 'Focus on search input'
            },
            {
                type: 'typeText',
                description: `Search for: ${searchTerm}`,
                text: searchTerm,
                reasoning: 'Enter search query'
            },
            {
                type: 'pressKey',
                description: 'Press Enter to search',
                key: 'Return',
                reasoning: 'Execute search'
            }
        ];
    }

    generateAppControlSteps(userRequest) {
        // Extract app name
        const appMatch = userRequest.match(/open\s+([^.\s]+)/i);
        const appName = appMatch ? appMatch[1] : 'application';
        
        return [
            {
                type: 'openApp',
                description: `Open ${appName}`,
                appName: appName,
                method: 'spotlight_search',
                reasoning: `Launch ${appName} application`
            },
            {
                type: 'waitForApp',
                description: `Wait for ${appName} to load`,
                timeout: 5000,
                reasoning: 'Ensure app is fully loaded before proceeding'
            },
            {
                type: 'verify',
                description: `Verify ${appName} is running`,
                verification_method: 'check_active_window',
                reasoning: 'Confirm app launched successfully'
            }
        ];
    }

    generateSystemOperationSteps(userRequest) {
        if (userRequest.toLowerCase().includes('screenshot')) {
            return [
                {
                    type: 'takeScreenshot',
                    description: 'Take screenshot of current screen',
                    savePath: 'Desktop',
                    reasoning: 'Capture current screen state'
                },
                {
                    type: 'verify',
                    description: 'Verify screenshot was saved',
                    verification_method: 'check_file_exists',
                    reasoning: 'Confirm screenshot file created'
                }
            ];
        }
        
        return [
            {
                type: 'analyzeRequest',
                description: 'Analyze system operation request',
                reasoning: 'Determine specific system operation needed'
            }
        ];
    }

    generateGeneralSteps(userRequest) {
        return [
            {
                type: 'observe',
                description: 'Observe current screen state',
                reasoning: 'Understand current context before acting'
            },
            {
                type: 'analyzeRequest',
                description: `Analyze request: ${userRequest}`,
                reasoning: 'Break down the user request into actionable steps'
            },
            {
                type: 'planApproach',
                description: 'Plan approach based on current state',
                reasoning: 'Determine best method to accomplish task'
            }
        ];
    }

    extractRequiredApps(userRequest, taskType) {
        const apps = [];
        const request = userRequest.toLowerCase();
        
        if (request.includes('whatsapp') || taskType === 'messaging') {
            apps.push('WhatsApp', 'Safari', 'Chrome');
        }
        if (request.includes('email') || request.includes('mail') || taskType === 'email') {
            apps.push('Mail', 'Gmail', 'Safari');
        }
        if (request.includes('browser') || request.includes('search') || taskType === 'web_browsing') {
            apps.push('Safari', 'Chrome', 'Firefox');
        }
        if (request.includes('calculator')) {
            apps.push('Calculator');
        }
        if (request.includes('terminal') || request.includes('command')) {
            apps.push('Terminal', 'Command Prompt');
        }
        
        return apps.length > 0 ? apps : ['System'];
    }

    getRelevantShortcuts(taskType) {
        const shortcuts = [];
        
        switch (taskType) {
            case 'messaging':
            case 'email':
                shortcuts.push(
                    process.platform === 'darwin' ? 'Cmd+T (new tab)' : 'Ctrl+T (new tab)',
                    process.platform === 'darwin' ? 'Cmd+L (address bar)' : 'Ctrl+L (address bar)',
                    'Return (send/confirm)'
                );
                break;
            case 'file_operation':
                shortcuts.push(
                    process.platform === 'darwin' ? 'Cmd+Delete (delete)' : 'Delete (delete)',
                    process.platform === 'darwin' ? 'Cmd+O (open)' : 'Ctrl+O (open)',
                    process.platform === 'darwin' ? 'Cmd+Shift+N (new folder)' : 'Ctrl+Shift+N (new folder)'
                );
                break;
            case 'web_browsing':
                shortcuts.push(
                    process.platform === 'darwin' ? 'Cmd+L (address bar)' : 'Ctrl+L (address bar)',
                    process.platform === 'darwin' ? 'Cmd+R (refresh)' : 'Ctrl+R (refresh)',
                    process.platform === 'darwin' ? 'Cmd+W (close tab)' : 'Ctrl+W (close tab)'
                );
                break;
            default:
                shortcuts.push(
                    process.platform === 'darwin' ? 'Cmd+Space (Spotlight)' : 'Win+R (Run)',
                    process.platform === 'darwin' ? 'Cmd+Tab (app switch)' : 'Alt+Tab (app switch)'
                );
        }
        
        return shortcuts;
    }

    structurePlan(aiResponse, userRequest, screenState) {
        // Extract steps from AI response and create structured plan
        const plan = {
            request: userRequest,
            reasoning: this.extractReasoning(aiResponse),
            steps: this.extractSteps(aiResponse),
            complexity: 'medium',
            estimated_time: 0,
            requires_user_input: false,
            fallback_available: true
        };

        // Estimate complexity and time
        plan.complexity = plan.steps.length > 5 ? 'high' : plan.steps.length > 2 ? 'medium' : 'low';
        plan.estimated_time = plan.steps.length * 2000; // 2 seconds per step average

        // Check if user input might be needed
        const needsInput = plan.steps.some(step => 
            step.type === 'user_input' || 
            step.description.toLowerCase().includes('password') ||
            step.description.toLowerCase().includes('confirm')
        );
        plan.requires_user_input = needsInput;

        return plan;
    }

    extractReasoning(aiResponse) {
        // Extract reasoning from AI response
        if (aiResponse && aiResponse.plan && aiResponse.plan.reasoning) {
            return aiResponse.plan.reasoning;
        }
        
        // Fallback reasoning extraction
        return `Task analysis: Breaking down "${this.currentTask.request}" into executable steps based on current screen state.`;
    }

    extractSteps(aiResponse) {
        // Extract steps from AI response
        if (aiResponse && aiResponse.plan && aiResponse.plan.steps) {
            return aiResponse.plan.steps.map((step, index) => ({
                ...step,
                step_number: index + 1,
                status: 'pending'
            }));
        }
        
        // Fallback step extraction - create basic steps
        return [
            {
                step_number: 1,
                type: 'analyze',
                description: 'Analyze current screen state',
                status: 'pending'
            }
        ];
    }

    createFallbackPlan(userRequest, screenState) {
        // Create a basic plan when AI planning fails
        const plan = {
            request: userRequest,
            reasoning: `Using fallback planning for request: ${userRequest}`,
            steps: [
                {
                    step_number: 1,
                    type: 'observe',
                    description: 'Take screenshot and analyze current state',
                    status: 'pending'
                },
                {
                    step_number: 2,
                    type: 'search',
                    description: 'Search for relevant UI elements',
                    status: 'pending'
                },
                {
                    step_number: 3,
                    type: 'interact',
                    description: 'Perform required interactions',
                    status: 'pending'
                }
            ],
            complexity: 'low',
            estimated_time: 6000,
            requires_user_input: false,
            fallback_available: false
        };

        return plan;
    }

    async executeWithReasoning(plan, options = {}) {
        console.log(`   🎯 Executing ${plan.steps.length} planned steps...`);
        
        const executionResults = {
            plan: plan,
            steps_executed: [],
            successful_steps: 0,
            failed_steps: 0,
            total_time: 0,
            reasoning_log: []
        };

        const dryRun = options.dryRun || false;
        
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const startTime = Date.now();
            
            console.log(`\n   📍 Step ${i + 1}/${plan.steps.length}: ${step.description}`);
            
            try {
                // Reasoning before action (like Claude)
                const preActionReasoning = await this.reasonBeforeAction(step, i);
                
                // Execute the step
                let stepResult;
                if (dryRun) {
                    stepResult = { success: true, action: 'simulated', dry_run: true };
                    console.log('      🔍 [DRY RUN] Simulated execution');
                } else {
                    stepResult = await this.executeStep(step);
                }
                
                // Reasoning after action (like Claude)
                const postActionReasoning = await this.reasonAfterAction(step, stepResult);
                
                const executionTime = Date.now() - startTime;
                executionResults.total_time += executionTime;
                
                const stepExecutionResult = {
                    step_number: i + 1,
                    step: step,
                    result: stepResult,
                    execution_time: executionTime,
                    pre_reasoning: preActionReasoning,
                    post_reasoning: postActionReasoning,
                    success: stepResult.success || false,
                    timestamp: new Date().toISOString()
                };
                
                executionResults.steps_executed.push(stepExecutionResult);
                
                if (stepResult.success) {
                    executionResults.successful_steps++;
                    step.status = 'completed';
                    console.log(`      ✅ Step completed in ${executionTime}ms`);
                } else {
                    executionResults.failed_steps++;
                    step.status = 'failed';
                    console.log(`      ❌ Step failed: ${stepResult.error || 'Unknown error'}`);
                    
                    // Attempt recovery
                    if (!options.stopOnError) {
                        console.log(`      🔄 Attempting recovery...`);
                        const recovery = await this.attemptRecovery(step, stepResult);
                        if (recovery.success) {
                            executionResults.successful_steps++;
                            step.status = 'recovered';
                            console.log(`      ✅ Recovery successful`);
                        }
                    }
                }
                
                // Update current task
                this.currentTask.steps.push(stepExecutionResult);
                
                // Brief pause between steps
                if (i < plan.steps.length - 1 && !dryRun) {
                    await this.delay(1000);
                }
                
            } catch (error) {
                console.error(`      ❌ Step execution error:`, error);
                
                executionResults.failed_steps++;
                step.status = 'error';
                
                executionResults.steps_executed.push({
                    step_number: i + 1,
                    step: step,
                    error: error.message,
                    execution_time: Date.now() - startTime,
                    success: false,
                    timestamp: new Date().toISOString()
                });
                
                if (options.stopOnError !== false) {
                    console.log('      🛑 Stopping execution due to error');
                    break;
                }
            }
        }
        
        console.log(`\n   📊 Execution Summary: ${executionResults.successful_steps}/${plan.steps.length} steps successful`);
        
        return executionResults;
    }

    async reasonBeforeAction(step, stepIndex) {
        // Claude-style pre-action reasoning
        const reasoning = {
            step_analysis: `About to execute step ${stepIndex + 1}: ${step.description}`,
            current_context: this.lastScreenState?.active_application?.app || 'unknown',
            expected_outcome: this.predictOutcome(step),
            potential_risks: this.assessRisks(step),
            timestamp: new Date().toISOString()
        };
        
        this.logAction('pre_reasoning', reasoning);
        return reasoning;
    }

    async reasonAfterAction(step, result) {
        // Claude-style post-action reasoning
        const reasoning = {
            action_result: result.success ? 'successful' : 'failed',
            observed_changes: 'Screen state monitoring needed',
            next_considerations: this.planNextConsiderations(step, result),
            lessons_learned: result.success ? 'Action executed as expected' : `Failed: ${result.error}`,
            timestamp: new Date().toISOString()
        };
        
        this.logAction('post_reasoning', reasoning);
        return reasoning;
    }

    predictOutcome(step) {
        // Predict what should happen after this step
        switch (step.type) {
            case 'openApp':
                return `Application ${step.appName} should launch and become active`;
            case 'clickMouse':
                return `Click at coordinates should interact with UI element`;
            case 'typeText':
                return `Text "${step.text}" should appear in focused field`;
            case 'pressKey':
                return `Keyboard shortcut should trigger expected action`;
            default:
                return `Step should complete as described: ${step.description}`;
        }
    }

    assessRisks(step) {
        // Assess potential risks of this action
        const risks = [];
        
        if (step.type === 'runCommand') {
            risks.push('Terminal command execution - potential system impact');
        }
        
        if (step.type === 'clickMouse' && !step.elementId) {
            risks.push('Coordinate-based click - may be inaccurate if UI changed');
        }
        
        if (step.type === 'openApp') {
            risks.push('App launch may take time or fail if app not installed');
        }
        
        return risks.length > 0 ? risks : ['Low risk action'];
    }

    planNextConsiderations(step, result) {
        // Plan what to consider for next steps
        if (!result.success) {
            return ['Need to retry or find alternative approach', 'Verify current screen state', 'Consider fallback options'];
        }
        
        switch (step.type) {
            case 'openApp':
                return ['Wait for app to fully load', 'Verify app interface is ready', 'Prepare for next interaction'];
            case 'clickMouse':
                return ['Observe UI response', 'Check if new elements appeared', 'Verify click had intended effect'];
            default:
                return ['Continue to next planned step', 'Monitor for unexpected changes'];
        }
    }

    async executeStep(step) {
        // Execute individual step (uses existing automation capabilities)
        switch (step.type) {
            case 'observe':
                const screenState = await this.observeScreen();
                return { success: true, data: screenState, action: 'screen_observed' };
                
            case 'openApp':
                return await this.systemAutomation.openApplication(step.appName || step.app);
                
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
                await this.delay(step.duration || 1000);
                return { success: true, action: 'delay_completed' };
                
            case 'runCommand':
                return await this.systemAutomation.runTerminalCommand(step.command);
                
            case 'takeScreenshot':
                return await this.systemAutomation.takeScreenshot(step.path);
                
            case 'findElement':
                const element = await this.mcpClient.findElementByText(step.text);
                return { success: element.found, data: element, action: 'element_search' };
                
            case 'moveMouse':
                return await this.systemAutomation.moveMouse(step.x || 100, step.y || 100);
                
            case 'dragMouse':
                return await this.systemAutomation.dragMouse(
                    step.fromX || 100, step.fromY || 100,
                    step.toX || 200, step.toY || 200
                );
                
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    async attemptRecovery(failedStep, result) {
        // Attempt to recover from failed step
        console.log(`      🔧 Attempting recovery for ${failedStep.type}...`);
        
        try {
            // Re-observe screen state
            await this.observeScreen();
            
            // Try alternative approach based on step type
            switch (failedStep.type) {
                case 'clickMouse':
                    // Try clicking at slightly different coordinates
                    const altX = (failedStep.x || 100) + 10;
                    const altY = (failedStep.y || 100) + 10;
                    return await this.systemAutomation.clickMouse(altX, altY);
                    
                case 'findElement':
                    // Try fuzzy search
                    const fuzzyResult = await this.mcpClient.findElementByText(failedStep.text, { fuzzy: true });
                    return { success: fuzzyResult.found, data: fuzzyResult, action: 'fuzzy_search_recovery' };
                    
                case 'openApp':
                    // Try alternative app name or path
                    const altName = failedStep.appName?.toLowerCase() || failedStep.app?.toLowerCase();
                    return await this.systemAutomation.openApplication(altName);
                    
                default:
                    return { success: false, message: 'No recovery method available for this step type' };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyCompletion(userRequest, executionResult) {
        console.log('   🔍 Verifying task completion...');
        
        // Take final screen observation
        const finalScreenState = await this.observeScreen();
        
        // Basic completion verification
        const verification = {
            completed: executionResult.successful_steps > 0,
            success_rate: (executionResult.successful_steps / executionResult.steps_executed.length) * 100,
            final_screen_state: finalScreenState,
            completion_confidence: 0.5,
            verification_method: 'basic',
            timestamp: new Date().toISOString()
        };
        
        // Enhanced verification if AI is available
        try {
            const verificationPrompt = `
Task: "${userRequest}"
Steps executed: ${executionResult.successful_steps}/${executionResult.steps_executed.length}
Final screen state: ${finalScreenState.active_application?.app || 'unknown'}

Based on the execution results, has this task been completed successfully?
Provide a confidence score (0-1) and explanation.
`;
            
            const aiVerification = await this.geminiAI.processCommand(verificationPrompt);
            if (aiVerification && aiVerification.verification) {
                verification.completed = aiVerification.verification.completed;
                verification.completion_confidence = aiVerification.verification.confidence;
                verification.verification_method = 'ai_enhanced';
            }
            
        } catch (error) {
            console.log('   ⚠️ AI verification unavailable, using basic verification');
        }
        
        this.logAction('verification', verification);
        
        console.log(`   📊 Completion: ${verification.completed ? 'YES' : 'NO'} (${(verification.completion_confidence * 100).toFixed(1)}% confidence)`);
        
        return verification;
    }

    // Utility and logging methods
    logAction(type, data) {
        const logEntry = {
            type,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.sessionLog.push(logEntry);
        this.actionHistory.push(logEntry);
        
        // Keep logs manageable
        if (this.sessionLog.length > 1000) {
            this.sessionLog = this.sessionLog.slice(-500);
        }
    }

    getRecentLog(count = 10) {
        return this.sessionLog.slice(-count);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Claude-like conversational interface
    async chat(message) {
        console.log(`💬 User: ${message}`);
        
        // Determine if this is a task request or conversation
        if (this.isTaskRequest(message)) {
            return await this.executeTask(message);
        } else {
            return await this.respondToChat(message);
        }
    }

    isTaskRequest(message) {
        const taskKeywords = [
            'open', 'click', 'type', 'run', 'execute', 'launch', 'find', 'search', 
            'create', 'delete', 'move', 'copy', 'save', 'download', 'upload',
            'browse', 'navigate', 'scroll', 'close', 'maximize', 'minimize'
        ];
        
        return taskKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
    }

    async respondToChat(message) {
        // Handle conversational messages
        const response = {
            type: 'chat_response',
            message: message,
            response: this.generateChatResponse(message),
            capabilities: this.capabilities,
            current_status: this.getStatus(),
            timestamp: new Date().toISOString()
        };
        
        this.logAction('chat', response);
        return response;
    }

    generateChatResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm your Claude-style computer assistant. I can help you automate tasks, control applications, browse the web, manage files, and much more. What would you like me to do?";
        }
        
        if (lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
            return `I can help you with:
• Opening and controlling applications
• Clicking buttons and filling forms
• File and folder operations
• Web browsing and automation
• Running terminal commands
• Taking screenshots and analyzing screens
• Multi-step workflows and complex tasks

Just tell me what you'd like to accomplish, and I'll break it down into steps and execute it for you!`;
        }
        
        if (lowerMessage.includes('help')) {
            return "I'm here to help! You can ask me to perform computer tasks like 'open Safari and search for news' or 'create a new folder called Projects on Desktop'. I'll analyze the screen, plan the steps, and execute them while explaining my reasoning.";
        }
        
        return "I understand. Feel free to ask me to perform any computer task, and I'll help you accomplish it step by step.";
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            current_task: this.currentTask?.request || null,
            task_status: this.currentTask?.status || 'idle',
            session_actions: this.actionHistory.length,
            capabilities: this.capabilities,
            last_screen_state: this.lastScreenState?.active_application?.app || 'unknown',
            mcp_client: this.mcpClient.getStatus(),
            ai_service: this.geminiAI.getStatus()
        };
    }

    async shutdown() {
        console.log('🛑 Shutting down Computer Agent...');
        
        if (this.currentTask && this.currentTask.status === 'running') {
            this.currentTask.status = 'interrupted';
            this.currentTask.end_time = new Date().toISOString();
        }
        
        await this.mcpClient.disconnect();
        await this.geminiAI.disconnect();
        
        console.log('✅ Computer Agent shutdown complete');
    }
}

module.exports = ClaudeStyleComputerAgent;
