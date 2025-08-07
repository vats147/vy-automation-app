const NaturalLanguageProcessor = require('../src/services/natural-language-processor');
const GeminiAIService = require('../src/services/gemini-ai-service');
const SystemAutomationService = require('../src/automation/system-automation');
const AutonomousAgent = require('../src/automation/autonomous-agent');
const Task = require('../src/automation/task');

// Mock the modules
jest.mock('../src/services/gemini-ai-service');
jest.mock('../src/automation/system-automation');

describe('NaturalLanguageProcessor Delegation', () => {
    let nlp;
    let mockGeminiAI;
    let mockSystemAutomation;

    beforeEach(async () => {
        // Create new instances of the mocked classes for each test
        mockGeminiAI = new GeminiAIService();
        mockSystemAutomation = new SystemAutomationService();

        // Mock the implementations of the methods
        mockGeminiAI.initialize.mockResolvedValue(true);
        mockSystemAutomation.initialize.mockResolvedValue(true);

        // Setup for AutonomousAgent test
        mockGeminiAI.getNextAction
            .mockReset() // Reset call history
            .mockResolvedValueOnce({ action: 'type', text: 'hello world', reason: 'Typing message' })
            .mockResolvedValueOnce({ action: 'click', x: 100, y: 200, reason: 'Clicking send' })
            .mockResolvedValueOnce({ action: 'finish', message: 'Task complete' });

        // Setup for SystemAutomation mock
        mockSystemAutomation.takeScreenshot.mockResolvedValue({ filePath: '/fake/path.png' });
        mockSystemAutomation.clickMouse.mockResolvedValue({ success: true });
        mockSystemAutomation.typeText.mockResolvedValue({ success: true });
        mockSystemAutomation.pressKey.mockResolvedValue({ success: true });
        mockSystemAutomation.scrollMouse.mockResolvedValue({ success: true });
        mockSystemAutomation.delay.mockResolvedValue(true);
        mockSystemAutomation.openApplication = jest.fn().mockResolvedValue({ success: true });
        mockSystemAutomation.runTerminalCommand = jest.fn().mockResolvedValue({ success: true });

        // Instantiate the class under test and inject mocks
        nlp = new NaturalLanguageProcessor();
        nlp.geminiAI = mockGeminiAI;
        nlp.systemAutomation = mockSystemAutomation;
        await nlp.initialize();
    });

    test('should delegate complex tasks to the AutonomousAgent', async () => {
        const complexCommand = 'send a message to john on whatsapp';
        const result = await nlp.processCommand(complexCommand);

        expect(result.success).toBe(true);
        expect(result.agent_result).toBeDefined();
        expect(result.agent_result.status).toBe('completed');
        expect(result.agent_result.history_length).toBe(3);

        // Verify that the agent path was taken
        expect(mockGeminiAI.getNextAction).toHaveBeenCalledTimes(3);
        expect(mockGeminiAI.processNaturalLanguageCommand).not.toHaveBeenCalled();

        // Verify that system automation was called
        expect(mockSystemAutomation.typeText).toHaveBeenCalledWith('hello world');
        expect(mockSystemAutomation.clickMouse).toHaveBeenCalledWith(100, 200);

        // Verify history
        const task_summary = result.agent_result;
        // The actual task object is not returned, just its summary.
        // To check history, we'd need to adjust what's returned or how we test.
        // For now, checking the calls to the mock is sufficient.
    });

    test('should use static planner for simple tasks', async () => {
        const plan = {
            intent: 'open_app',
            description: 'Open Calculator',
            steps: [{ type: 'openApp', appName: 'Calculator', description: 'Open the calculator' }]
        };
        mockGeminiAI.processNaturalLanguageCommand.mockResolvedValue(plan);

        const simpleCommand = 'open calculator';
        const result = await nlp.processCommand(simpleCommand);

        expect(result.success).toBe(true);
        expect(mockGeminiAI.processNaturalLanguageCommand).toHaveBeenCalledWith(simpleCommand);
        expect(mockGeminiAI.getNextAction).not.toHaveBeenCalled();
        expect(mockSystemAutomation.openApplication).toHaveBeenCalledWith('Calculator');
    });
});
