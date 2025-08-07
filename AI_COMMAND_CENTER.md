# 🤖 AI Command Center - Gemini AI Integration

## Overview

The Vy Automation app now includes a powerful AI Command Center that allows you to control your Mac using natural language commands powered by Google's Gemini AI.

## Features

### 🎯 Natural Language Automation
- **Voice-like Commands**: "open terminal and run ls command"
- **Application Control**: "open Chrome browser", "launch Calculator"
- **System Actions**: "take a screenshot", "click at center of screen"
- **Complex Workflows**: Combine multiple actions in one command

### 🧠 AI-Powered Understanding
- **Smart Parsing**: Gemini AI understands context and intent
- **Safe Execution**: Built-in safety checks for dangerous commands
- **Fallback Support**: Works without API key for basic commands
- **Command Suggestions**: Real-time autocomplete and suggestions

### ⚡ Automation Capabilities
- **Mouse Control**: Click, move, drag operations
- **Keyboard Input**: Type text, press shortcuts
- **Application Management**: Open, close, switch applications
- **Terminal Commands**: Execute shell commands safely
- **Screenshots**: Capture screen automatically
- **Workflow Preview**: Dry-run mode to preview actions

## Quick Start

### 1. Setup Gemini AI (Optional but Recommended)

```bash
# Get your free API key from: https://makersuite.google.com/app/apikey
# Create .env file in the app directory
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 2. Example Commands

Try these natural language commands in the AI Command Center:

**Basic Examples:**
- `open terminal and run ls`
- `take a screenshot`
- `open Chrome browser`
- `open Calculator app`

**Advanced Examples:**
- `open terminal, wait 2 seconds, type 'git status', press enter`
- `open VS Code and then open Chrome browser`
- `take screenshot and then open Preview app`
- `click at coordinates 500,300 and then type hello world`

**System Commands:**
- `press command+space to open spotlight`
- `type 'System Preferences' and press enter`
- `press command+tab to switch applications`

### 3. Safety Features

- **Risk Assessment**: Commands are evaluated for safety level (low/medium/high)
- **Dry Run Mode**: Preview commands before execution with the 🔍 Preview button
- **Step-by-Step Execution**: See exactly what each automation step does
- **Error Handling**: Graceful failure handling with detailed error messages
- **Command History**: Track and reuse previous commands

## Architecture

### AI Integration
```
User Input → Gemini AI → Automation Plan → System Execution → Results
```

### Components
- **GeminiAIService**: Processes natural language using Google's Gemini AI
- **NaturalLanguageProcessor**: Orchestrates command processing and execution
- **SystemAutomationService**: Cross-platform automation (macOS/Windows/Linux)
- **NaturalLanguagePanel**: React UI for command input and results

### Platform Support
- **macOS**: AppleScript-based automation (fully supported)
- **Windows**: PowerShell-based automation 
- **Linux**: xdotool-based automation

## API Integration

### Gemini AI Features
- **Model**: gemini-pro for natural language understanding
- **Temperature**: 0.1 for consistent, predictable responses
- **Safety**: Built-in content filtering and safety checks
- **Fallback**: Works without API key using basic pattern matching

### Command Processing Flow
1. **Input**: Natural language command from user
2. **AI Analysis**: Gemini processes intent and generates automation steps
3. **Validation**: Safety checks and step validation
4. **Execution**: Cross-platform automation using native APIs
5. **Feedback**: Real-time progress and results display

## Examples in Action

### Terminal Automation
```
Input: "open terminal and run ls command"
Output:
├── Step 1: Open Terminal application
├── Step 2: Wait 2 seconds for Terminal to load
├── Step 3: Type "ls"
└── Step 4: Press Enter to execute
```

### Multi-App Workflow
```
Input: "open Chrome, wait 3 seconds, then open VS Code"
Output:
├── Step 1: Open Google Chrome
├── Step 2: Wait 3000ms
└── Step 3: Open Visual Studio Code
```

### Screenshot Workflow
```
Input: "take screenshot and save it"
Output:
├── Step 1: Capture current screen
└── Result: Screenshot saved to screenshots/screenshot_1640995200000.png
```

## Development

### Adding New Commands
The system is extensible - add new automation actions in `SystemAutomationService`:

```javascript
async newAutomationAction(params) {
    // Platform-specific implementation
    switch (this.platform) {
        case 'darwin':
            // macOS AppleScript
            break;
        case 'win32': 
            // Windows PowerShell
            break;
        case 'linux':
            // Linux xdotool
            break;
    }
}
```

### Custom Prompts
Modify the system prompt in `GeminiAIService` to customize AI behavior:

```javascript
this.systemPrompt = `Your custom automation assistant prompt...`;
```

## Troubleshooting

### Common Issues

**No AI Features Available**
- Set `GEMINI_API_KEY` environment variable
- Restart the application
- Basic automation still works without API key

**Commands Not Executing**
- Check if permissions are granted (Accessibility, Screen Recording on macOS)
- Verify the command syntax in Preview mode
- Check console logs for detailed error messages

**Platform-Specific Issues**
- **macOS**: Grant Accessibility permissions in System Preferences > Security & Privacy
- **Windows**: Run as Administrator for some system commands
- **Linux**: Install xdotool: `sudo apt-get install xdotool`

## Security & Privacy

- **Local Processing**: All automation runs locally on your machine
- **API Usage**: Only command text is sent to Gemini AI (no screenshots or sensitive data)
- **Permission-Based**: Requires explicit system permissions for automation
- **Safe by Default**: Built-in safety checks prevent destructive commands

---

**Ready to automate your Mac with AI? Start typing natural language commands in the AI Command Center!** 🚀
