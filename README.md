# Vy Automation - Task Recording & Scheduling

A comprehensive Electron.js application for recording, scheduling, and automating desktop workflows. Built with React 18, SQLite3, and cross-platform automation capabilities.

## ✨ Features

- **🔴 Workflow Recording**: Record your screen interactions to create automated workflows
- **⏰ Smart Scheduling**: Schedule workflows to run automatically with cron-like expressions
- **🎵 Audio Recording**: Record audio instructions alongside your workflows
- **📊 Execution History**: Track and analyze workflow execution results
- **📱 Cross-Platform**: Works on macOS, Windows, and Linux
- **🗄️ SQLite Database**: Local data storage with full workflow management
- **🎨 Modern UI**: Clean React-based interface with real-time status updates

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Python 3** (for native dependencies)

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/vats/Desktop/TEMP/Agentic-AI/AI-app-electron/app-ai-propmt
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   # or use the development script
   ./start-dev.sh
   ```

## 📋 Project Structure

```
src/
├── main.js                 # Main Electron process
├── preload.js             # Secure IPC bridge
├── database/
│   └── sqlite-manager.js  # Database operations
├── automation/
│   ├── workflow-recorder.js  # Screen recording
│   └── workflow-executor.js  # Workflow execution
├── scheduling/
│   └── scheduler-service.js  # Cron scheduling
├── audio/
│   └── audio-recorder.js     # Audio recording
└── renderer/
    ├── index.html            # Main HTML template
    ├── index.js             # React entry point
    ├── App.js               # Main React component
    ├── context/
    │   └── AppContext.js    # Global state management
    ├── components/          # React components
    └── styles/              # CSS styles
```

## 🔧 Development

### Available Scripts

- `npm start` - Start the application in development mode
- `npm run build` - Build the application for production
- `npm run dist` - Package the application for distribution
- `npm test` - Run tests (when implemented)

### Development Features

- **Hot Reload**: Automatic restart on code changes
- **Developer Tools**: Chrome DevTools integration
- **Debug Logging**: Comprehensive logging in development mode
- **Error Handling**: Graceful error recovery and reporting

## 📚 Core Concepts

### Workflows

Workflows are sequences of automated actions that can be:
- **Recorded** from user interactions
- **Manually created** with step-by-step instructions
- **Scheduled** to run at specific times
- **Executed** on-demand or automatically

### Scheduling

The scheduler supports:
- **Cron expressions** for flexible timing
- **One-time** or **recurring** executions
- **Schedule overrides** for exceptions
- **Timezone support** for global teams

### Database Schema

Key tables:
- `workflows` - Workflow definitions and metadata
- `scheduled_workflows` - Scheduling configuration
- `workflow_executions` - Execution history and logs
- `workflow_overrides` - Schedule exceptions

## 🎯 Usage Examples

### Recording a Workflow

1. Click the **"Record"** tab in the sidebar
2. Enter a workflow name and description
3. Click **"Start Recording"**
4. Perform the actions you want to automate
5. Click **"Stop Recording"** to save

### Scheduling a Workflow

1. Navigate to the **"Schedule"** tab
2. Select a workflow to schedule
3. Set up the cron expression (e.g., `0 9 * * 1-5` for weekdays at 9 AM)
4. Configure any additional options
5. Activate the schedule

### Global Shortcuts

- `Cmd/Ctrl + Shift + R` - Start/Stop recording
- `Cmd/Ctrl + Shift + M` - Add manual marker during recording
- `Cmd/Ctrl + N` - Create new workflow
- `Cmd/Ctrl + O` - Import workflow file

## 🔒 Security

- **Context Isolation**: Secure separation between main and renderer processes
- **No Node.js in Renderer**: Renderer process has no direct Node.js access
- **IPC Validation**: All inter-process communication is validated
- **CSP Headers**: Content Security Policy prevents XSS attacks

## 🌐 Cross-Platform Support

### macOS
- Native window controls and menu bar
- System notification integration
- Retina display support

### Windows
- Custom window frame options
- Windows-specific automation APIs
- System tray integration

### Linux
- Various desktop environment support
- X11 and Wayland compatibility
- Package formats (AppImage, deb, rpm)

## 🛠️ Dependencies

### Core Dependencies
- **Electron 28.0.0** - Desktop application framework
- **React 18** - UI framework
- **SQLite3** - Local database
- **node-cron** - Scheduling engine
- **screenshot-desktop** - Screen capture

### Automation Dependencies
- **robotjs** - Cross-platform automation (optional)
- **puppeteer** - Browser automation
- **node-record-lpcm16** - Audio recording

## 🐛 Troubleshooting

### Common Issues

1. **Installation fails on native dependencies**:
   ```bash
   npm install --build-from-source
   ```

2. **robotjs not working**:
   - Try removing robotjs and using alternative automation methods
   - Check platform-specific requirements

3. **Audio recording not available**:
   - Install platform-specific audio tools (SoX, ALSA, etc.)
   - Check microphone permissions

4. **Database issues**:
   - Delete `data/workflows.db` to reset database
   - Check file permissions in data directory

### Debug Mode

Run with debug flags:
```bash
DEBUG=* npm start
```

## 📝 License

This project is for demonstration purposes. See the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or issues:
- Check the troubleshooting section above
- Review the code documentation
- Create an issue in the repository

---

**Built with ❤️ using Electron, React, and Node.js**
