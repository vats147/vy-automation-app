const { screen, desktopCapturer, globalShortcut } = require('electron');
const screenshot = require('screenshot-desktop');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class WorkflowRecorder extends EventEmitter {
    constructor(mainWindow) {
        super();
        this.mainWindow = mainWindow;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordedSteps = [];
        this.screenshots = [];
        this.currentWorkflowId = null;
        this.screenshotInterval = null;
        this.mouseTracker = null;
        
        // Recording settings
        this.settings = {
            captureScreenshots: true,
            screenshotInterval: 2000, // 2 seconds
            captureMouseMovements: true,
            captureKeystrokes: true,
            autoSave: true
        };
        
        this.setupGlobalShortcuts();
    }

    setupGlobalShortcuts() {
        // Global shortcut to start/stop recording
        globalShortcut.register('CommandOrControl+Shift+R', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        // Global shortcut to add manual step
        globalShortcut.register('CommandOrControl+Shift+M', () => {
            if (this.isRecording) {
                this.addManualStep();
            }
        });
    }

    async startRecording(workflowName = null) {
        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        try {
            console.log('🔴 Starting workflow recording...');
            
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.recordedSteps = [];
            this.screenshots = [];
            
            // Create unique workflow ID for this recording session
            this.currentWorkflowId = `workflow_${Date.now()}`;
            
            // Start screenshot capture
            if (this.settings.captureScreenshots) {
                await this.startScreenshotCapture();
            }
            
            // Start mouse and keyboard tracking
            await this.startInputTracking();
            
            // Notify UI
            this.emit('recordingStarted', {
                workflowId: this.currentWorkflowId,
                startTime: this.recordingStartTime
            });
            
            this.mainWindow.webContents.send('recording:started', {
                workflowId: this.currentWorkflowId,
                startTime: this.recordingStartTime
            });
            
            console.log('✅ Recording started successfully');
            
            return {
                success: true,
                workflowId: this.currentWorkflowId,
                startTime: this.recordingStartTime
            };
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.isRecording = false;
            this.emit('recordingError', error);
            throw error;
        }
    }

    async stopRecording() {
        if (!this.isRecording) {
            throw new Error('No recording in progress');
        }

        try {
            console.log('⏹️ Stopping workflow recording...');
            
            this.isRecording = false;
            const recordingEndTime = Date.now();
            const duration = recordingEndTime - this.recordingStartTime;
            
            // Stop screenshot capture
            this.stopScreenshotCapture();
            
            // Stop input tracking
            this.stopInputTracking();
            
            // Process and optimize recorded steps
            const processedSteps = await this.processRecordedSteps();
            
            const recordingResult = {
                workflowId: this.currentWorkflowId,
                startTime: this.recordingStartTime,
                endTime: recordingEndTime,
                duration,
                steps: processedSteps,
                screenshots: this.screenshots,
                stepCount: processedSteps.length
            };
            
            // Notify UI
            this.emit('recordingStopped', recordingResult);
            this.mainWindow.webContents.send('recording:stopped', recordingResult);
            
            console.log(`✅ Recording stopped. Captured ${processedSteps.length} steps in ${duration}ms`);
            
            // Reset state
            this.currentWorkflowId = null;
            this.recordingStartTime = null;
            this.recordedSteps = [];
            this.screenshots = [];
            
            return recordingResult;
            
        } catch (error) {
            console.error('❌ Failed to stop recording:', error);
            this.emit('recordingError', error);
            throw error;
        }
    }

    async startScreenshotCapture() {
        const screenshotsDir = path.join(__dirname, '../screenshots');
        
        // Ensure screenshots directory exists
        try {
            await fs.access(screenshotsDir);
        } catch (error) {
            await fs.mkdir(screenshotsDir, { recursive: true });
        }
        
        // Take initial screenshot
        await this.takeScreenshot();
        
        // Set up interval for periodic screenshots
        this.screenshotInterval = setInterval(async () => {
            if (this.isRecording) {
                await this.takeScreenshot();
            }
        }, this.settings.screenshotInterval);
    }

    stopScreenshotCapture() {
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
        }
    }

    async takeScreenshot() {
        try {
            const timestamp = Date.now();
            const filename = `screenshot_${this.currentWorkflowId}_${timestamp}.png`;
            const filepath = path.join(__dirname, '../screenshots', filename);
            
            // Capture screenshot of all displays
            const img = await screenshot({ format: 'png' });
            await fs.writeFile(filepath, img);
            
            const screenshotData = {
                timestamp,
                filename,
                filepath,
                relativeTime: timestamp - this.recordingStartTime
            };
            
            this.screenshots.push(screenshotData);
            
            // Emit screenshot taken event
            this.emit('screenshotTaken', screenshotData);
            this.mainWindow.webContents.send('recording:screenshot', screenshotData);
            
        } catch (error) {
            console.error('Failed to take screenshot:', error);
        }
    }

    async startInputTracking() {
        // Note: For full input tracking, we'd need additional libraries
        // This is a simplified version that tracks basic events
        
        // Track window focus events
        this.mainWindow.webContents.on('focus', () => {
            if (this.isRecording) {
                this.addStep({
                    type: 'window_focus',
                    target: 'main_window',
                    timestamp: Date.now()
                });
            }
        });
        
        // Track navigation events
        this.mainWindow.webContents.on('did-navigate', (event, url) => {
            if (this.isRecording) {
                this.addStep({
                    type: 'navigation',
                    target: url,
                    timestamp: Date.now()
                });
            }
        });
    }

    stopInputTracking() {
        // Remove event listeners
        this.mainWindow.webContents.removeAllListeners('focus');
        this.mainWindow.webContents.removeAllListeners('did-navigate');
    }

    addStep(stepData) {
        if (!this.isRecording) return;
        
        const step = {
            id: `step_${this.recordedSteps.length + 1}`,
            timestamp: Date.now(),
            relativeTime: Date.now() - this.recordingStartTime,
            ...stepData
        };
        
        this.recordedSteps.push(step);
        
        // Emit step added event
        this.emit('stepAdded', step);
        this.mainWindow.webContents.send('recording:step', step);
    }

    addManualStep() {
        if (!this.isRecording) return;
        
        const step = {
            type: 'manual_marker',
            description: 'Manual step marker',
            timestamp: Date.now(),
            userAdded: true
        };
        
        this.addStep(step);
        
        // Show notification in UI
        this.mainWindow.webContents.send('recording:manual-step', step);
    }

    async processRecordedSteps() {
        // Remove duplicate steps
        const uniqueSteps = this.removeDuplicateSteps(this.recordedSteps);
        
        // Group similar steps
        const groupedSteps = this.groupSimilarSteps(uniqueSteps);
        
        // Add timing information
        const timedSteps = this.addTimingInfo(groupedSteps);
        
        // Optimize step sequence
        const optimizedSteps = this.optimizeStepSequence(timedSteps);
        
        return optimizedSteps;
    }

    removeDuplicateSteps(steps) {
        const seen = new Set();
        return steps.filter(step => {
            const key = `${step.type}_${step.target}_${Math.floor(step.timestamp / 1000)}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    groupSimilarSteps(steps) {
        const grouped = [];
        let currentGroup = null;
        
        for (const step of steps) {
            if (currentGroup && 
                currentGroup.type === step.type && 
                step.timestamp - currentGroup.lastTimestamp < 1000) {
                // Add to current group
                currentGroup.steps.push(step);
                currentGroup.lastTimestamp = step.timestamp;
                currentGroup.count++;
            } else {
                // Start new group
                if (currentGroup) {
                    grouped.push(this.finalizeGroup(currentGroup));
                }
                currentGroup = {
                    type: step.type,
                    steps: [step],
                    firstTimestamp: step.timestamp,
                    lastTimestamp: step.timestamp,
                    count: 1
                };
            }
        }
        
        if (currentGroup) {
            grouped.push(this.finalizeGroup(currentGroup));
        }
        
        return grouped;
    }

    finalizeGroup(group) {
        if (group.count === 1) {
            return group.steps[0];
        }
        
        return {
            id: `group_${group.type}_${group.firstTimestamp}`,
            type: `${group.type}_sequence`,
            description: `${group.type} sequence (${group.count} actions)`,
            timestamp: group.firstTimestamp,
            relativeTime: group.firstTimestamp - this.recordingStartTime,
            duration: group.lastTimestamp - group.firstTimestamp,
            steps: group.steps,
            count: group.count
        };
    }

    addTimingInfo(steps) {
        return steps.map((step, index) => {
            const nextStep = steps[index + 1];
            const waitTime = nextStep ? nextStep.timestamp - step.timestamp : 0;
            
            return {
                ...step,
                waitTime,
                stepNumber: index + 1
            };
        });
    }

    optimizeStepSequence(steps) {
        // Remove very short wait times (< 100ms)
        return steps.map(step => ({
            ...step,
            waitTime: step.waitTime && step.waitTime < 100 ? 0 : step.waitTime
        }));
    }

    getStatus() {
        return {
            isRecording: this.isRecording,
            workflowId: this.currentWorkflowId,
            startTime: this.recordingStartTime,
            duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
            stepCount: this.recordedSteps.length,
            screenshotCount: this.screenshots.length
        };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Apply screenshot interval change if recording
        if (this.isRecording && this.screenshotInterval && newSettings.screenshotInterval) {
            this.stopScreenshotCapture();
            this.startScreenshotCapture();
        }
    }

    // Manual step addition methods for UI integration
    async addClickStep(x, y, button = 'left', target = null) {
        this.addStep({
            type: 'click',
            coordinates: { x, y },
            button,
            target,
            description: `Click ${button} button at (${x}, ${y})`
        });
    }

    async addTypeStep(text, target = null) {
        this.addStep({
            type: 'type',
            text,
            target,
            description: `Type: "${text}"`
        });
    }

    async addKeyStep(key, modifiers = []) {
        this.addStep({
            type: 'key',
            key,
            modifiers,
            description: `Press ${modifiers.length ? modifiers.join('+') + '+' : ''}${key}`
        });
    }

    async addWaitStep(duration) {
        this.addStep({
            type: 'wait',
            duration,
            description: `Wait ${duration}ms`
        });
    }

    async addScrollStep(direction, amount) {
        this.addStep({
            type: 'scroll',
            direction,
            amount,
            description: `Scroll ${direction} ${amount}px`
        });
    }

    cleanup() {
        this.stopScreenshotCapture();
        this.stopInputTracking();
        
        // Unregister global shortcuts
        globalShortcut.unregisterAll();
    }
}

module.exports = WorkflowRecorder;
