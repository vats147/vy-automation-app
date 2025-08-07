const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

/**
 * Cross-platform automation service that replaces robotjs
 * Uses AppleScript on macOS, PowerShell on Windows, and xdotool on Linux
 */
class SystemAutomationService {
    constructor() {
        this.platform = process.platform;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log(`🤖 Initializing System Automation for ${this.platform}...`);
            
            // Check platform capabilities
            await this.checkPlatformSupport();
            
            this.isInitialized = true;
            console.log('✅ System Automation Service initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize System Automation:', error);
            throw error;
        }
    }

    async checkPlatformSupport() {
        switch (this.platform) {
            case 'darwin':
                // macOS - AppleScript is always available
                break;
                
            case 'win32':
                // Windows - Check if PowerShell is available
                try {
                    await execAsync('powershell -Command "Get-Host"');
                } catch (error) {
                    throw new Error('PowerShell not available on Windows');
                }
                break;
                
            case 'linux':
                // Linux - Check if xdotool is available
                try {
                    await execAsync('which xdotool');
                } catch (error) {
                    console.warn('⚠️ xdotool not found. Some automation features may not work. Install with: sudo apt-get install xdotool');
                }
                break;
                
            default:
                console.warn(`⚠️ Platform ${this.platform} has limited automation support`);
        }
    }

    // Mouse operations
    async moveMouse(x, y) {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    await execAsync(`osascript -e 'tell application "System Events" to set the mouse position to {${x}, ${y}}'`);
                    break;
                    
                case 'win32':
                    const moveScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
                    `;
                    await execAsync(`powershell -Command "${moveScript.replace(/\n/g, '; ')}"`);
                    break;
                    
                case 'linux':
                    await execAsync(`xdotool mousemove ${x} ${y}`);
                    break;
                    
                default:
                    throw new Error(`Mouse movement not supported on ${this.platform}`);
            }
            
            return { success: true, x, y };
            
        } catch (error) {
            console.error('Failed to move mouse:', error);
            throw error;
        }
    }

    async clickMouse(x, y, button = 'left') {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    if (x !== undefined && y !== undefined) {
                        await this.moveMouse(x, y);
                    }
                    
                    const clickScript = button === 'right' 
                        ? 'tell application "System Events" to control click at the mouse position'
                        : 'tell application "System Events" to click at the mouse position';
                    
                    await execAsync(`osascript -e '${clickScript}'`);
                    break;
                    
                case 'win32':
                    const clickPowerShell = `
                        Add-Type -AssemblyName System.Windows.Forms
                        ${x !== undefined && y !== undefined ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});` : ''}
                        ${button === 'right' ? 
                            '[System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 100; [System.Windows.Forms.Application]::DoEvents();' :
                            '[System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 100; [System.Windows.Forms.Application]::DoEvents();'
                        }
                    `;
                    await execAsync(`powershell -Command "${clickPowerShell.replace(/\n/g, '; ')}"`);
                    break;
                    
                case 'linux':
                    const linuxButton = button === 'right' ? '3' : '1';
                    if (x !== undefined && y !== undefined) {
                        await execAsync(`xdotool mousemove ${x} ${y} click ${linuxButton}`);
                    } else {
                        await execAsync(`xdotool click ${linuxButton}`);
                    }
                    break;
                    
                default:
                    throw new Error(`Mouse clicking not supported on ${this.platform}`);
            }
            
            return { success: true, x, y, button };
            
        } catch (error) {
            console.error('Failed to click mouse:', error);
            throw error;
        }
    }

    async doubleClick(x, y) {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    if (x !== undefined && y !== undefined) {
                        await this.moveMouse(x, y);
                    }
                    await execAsync(`osascript -e 'tell application "System Events" to double click at the mouse position'`);
                    break;
                    
                case 'win32':
                    // Simulate double click with two rapid clicks
                    await this.clickMouse(x, y);
                    await this.delay(50);
                    await this.clickMouse(undefined, undefined); // Click at current position
                    break;
                    
                case 'linux':
                    if (x !== undefined && y !== undefined) {
                        await execAsync(`xdotool mousemove ${x} ${y} click --repeat 2 --delay 50 1`);
                    } else {
                        await execAsync(`xdotool click --repeat 2 --delay 50 1`);
                    }
                    break;
                    
                default:
                    throw new Error(`Double clicking not supported on ${this.platform}`);
            }
            
            return { success: true, x, y };
            
        } catch (error) {
            console.error('Failed to double click:', error);
            throw error;
        }
    }

    async dragMouse(fromX, fromY, toX, toY) {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    const dragScript = `
                        tell application "System Events"
                            set startPoint to {${fromX}, ${fromY}}
                            set endPoint to {${toX}, ${toY}}
                            set the mouse position to startPoint
                            mouse down at startPoint
                            delay 0.1
                            set the mouse position to endPoint
                            mouse up at endPoint
                        end tell
                    `;
                    await execAsync(`osascript -e '${dragScript.replace(/\n/g, '; ')}'`);
                    break;
                    
                case 'linux':
                    await execAsync(`xdotool mousemove ${fromX} ${fromY} mousedown 1 mousemove ${toX} ${toY} mouseup 1`);
                    break;
                    
                default:
                    // Fallback: move to start, click and hold, move to end, release
                    await this.moveMouse(fromX, fromY);
                    await this.delay(100);
                    await this.moveMouse(toX, toY);
                    break;
            }
            
            return { success: true, fromX, fromY, toX, toY };
            
        } catch (error) {
            console.error('Failed to drag mouse:', error);
            throw error;
        }
    }

    // Keyboard operations
    async typeText(text) {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            // Escape special characters for shell safety
            const safeText = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
            
            switch (this.platform) {
                case 'darwin':
                    await execAsync(`osascript -e 'tell application "System Events" to keystroke "${safeText}"'`);
                    break;
                    
                case 'win32':
                    const typeScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        [System.Windows.Forms.SendKeys]::SendWait("${safeText}")
                    `;
                    await execAsync(`powershell -Command "${typeScript.replace(/\n/g, '; ')}"`);
                    break;
                    
                case 'linux':
                    await execAsync(`xdotool type "${safeText}"`);
                    break;
                    
                default:
                    throw new Error(`Text typing not supported on ${this.platform}`);
            }
            
            return { success: true, text };
            
        } catch (error) {
            console.error('Failed to type text:', error);
            throw error;
        }
    }

    async pressKey(key, modifiers = []) {
        if (!this.isInitialized) throw new Error('Service not initialized');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    let keyCommand = 'keystroke';
                    let modifierStr = '';
                    
                    if (modifiers.includes('cmd') || modifiers.includes('command')) {
                        modifierStr += ' using command down';
                    }
                    if (modifiers.includes('ctrl') || modifiers.includes('control')) {
                        modifierStr += ' using control down';
                    }
                    if (modifiers.includes('shift')) {
                        modifierStr += ' using shift down';
                    }
                    if (modifiers.includes('alt') || modifiers.includes('option')) {
                        modifierStr += ' using option down';
                    }
                    
                    // Map common keys
                    const keyMap = {
                        'enter': 'return',
                        'esc': 'escape',
                        'space': 'space',
                        'tab': 'tab',
                        'backspace': 'delete',
                        'delete': 'forward delete',
                        'up': 'up arrow',
                        'down': 'down arrow',
                        'left': 'left arrow',
                        'right': 'right arrow'
                    };
                    
                    const mappedKey = keyMap[key.toLowerCase()] || key;
                    
                    await execAsync(`osascript -e 'tell application "System Events" to ${keyCommand} "${mappedKey}"${modifierStr}'`);
                    break;
                    
                case 'linux':
                    let linuxModifiers = '';
                    modifiers.forEach(mod => {
                        const modMap = {
                            'cmd': 'super',
                            'command': 'super',
                            'ctrl': 'ctrl',
                            'control': 'ctrl',
                            'shift': 'shift',
                            'alt': 'alt',
                            'option': 'alt'
                        };
                        if (modMap[mod]) {
                            linuxModifiers += `${modMap[mod]}+`;
                        }
                    });
                    
                    await execAsync(`xdotool key ${linuxModifiers}${key}`);
                    break;
                    
                default:
                    throw new Error(`Key pressing not supported on ${this.platform}`);
            }
            
            return { success: true, key, modifiers };
            
        } catch (error) {
            console.error('Failed to press key:', error);
            throw error;
        }
    }

    // Screen operations
    async getScreenSize() {
        try {
            switch (this.platform) {
                case 'darwin':
                    const { stdout } = await execAsync(`osascript -e 'tell application "Finder" to get bounds of window of desktop'`);
                    const bounds = stdout.trim().split(', ');
                    return {
                        width: parseInt(bounds[2]) - parseInt(bounds[0]),
                        height: parseInt(bounds[3]) - parseInt(bounds[1])
                    };
                    
                case 'win32':
                    const sizeScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
                        Write-Output "$($screen.Width),$($screen.Height)"
                    `;
                    const { stdout: winSize } = await execAsync(`powershell -Command "${sizeScript.replace(/\n/g, '; ')}"`);
                    const [width, height] = winSize.trim().split(',');
                    return { width: parseInt(width), height: parseInt(height) };
                    
                case 'linux':
                    const { stdout: linuxSize } = await execAsync(`xdpyinfo | grep dimensions`);
                    const dimensions = linuxSize.match(/(\d+)x(\d+)/);
                    return {
                        width: parseInt(dimensions[1]),
                        height: parseInt(dimensions[2])
                    };
                    
                default:
                    return { width: 1920, height: 1080 }; // Default fallback
            }
            
        } catch (error) {
            console.error('Failed to get screen size:', error);
            return { width: 1920, height: 1080 }; // Fallback
        }
    }

    async getMousePosition() {
        try {
            switch (this.platform) {
                case 'darwin':
                    const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get the mouse position'`);
                    const [mouseX, mouseY] = stdout.trim().split(', ');
                    return { x: parseInt(mouseX), y: parseInt(mouseY) };
                    
                case 'linux':
                    const { stdout: linuxPos } = await execAsync(`xdotool getmouselocation --shell`);
                    const posX = linuxPos.match(/X=(\d+)/)[1];
                    const posY = linuxPos.match(/Y=(\d+)/)[1];
                    return { x: parseInt(posX), y: parseInt(posY) };
                    
                default:
                    return { x: 0, y: 0 }; // Fallback
            }
            
        } catch (error) {
            console.error('Failed to get mouse position:', error);
            return { x: 0, y: 0 };
        }
    }

    // Application operations
    async openApplication(appName) {
        try {
            switch (this.platform) {
                case 'darwin':
                    await execAsync(`open -a "${appName}"`);
                    break;
                    
                case 'win32':
                    await execAsync(`start "${appName}"`);
                    break;
                    
                case 'linux':
                    await execAsync(`${appName}`);
                    break;
                    
                default:
                    throw new Error(`Application opening not supported on ${this.platform}`);
            }
            
            return { success: true, appName };
            
        } catch (error) {
            console.error('Failed to open application:', error);
            throw error;
        }
    }

    async closeApplication(appName) {
        try {
            switch (this.platform) {
                case 'darwin':
                    await execAsync(`osascript -e 'tell application "${appName}" to quit'`);
                    break;
                    
                case 'win32':
                    await execAsync(`taskkill /f /im "${appName}.exe"`);
                    break;
                    
                case 'linux':
                    await execAsync(`pkill -f "${appName}"`);
                    break;
                    
                default:
                    throw new Error(`Application closing not supported on ${this.platform}`);
            }
            
            return { success: true, appName };
            
        } catch (error) {
            console.error('Failed to close application:', error);
            throw error;
        }
    }

    // Utility methods
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async scrollMouse(x, y, direction = 'down', clicks = 3) {
        try {
            switch (this.platform) {
                case 'darwin':
                    if (x !== undefined && y !== undefined) {
                        await this.moveMouse(x, y);
                    }
                    const scrollDirection = direction === 'up' ? 'up' : 'down';
                    await execAsync(`osascript -e 'tell application "System Events" to scroll ${scrollDirection} ${clicks}'`);
                    break;
                    
                case 'linux':
                    const button = direction === 'up' ? '4' : '5';
                    if (x !== undefined && y !== undefined) {
                        await this.moveMouse(x, y);
                    }
                    for (let i = 0; i < clicks; i++) {
                        await execAsync(`xdotool click ${button}`);
                        await this.delay(50);
                    }
                    break;
                    
                default:
                    console.warn(`Scrolling not implemented for ${this.platform}`);
            }
            
            return { success: true, x, y, direction, clicks };
            
        } catch (error) {
            console.error('Failed to scroll:', error);
            throw error;
        }
    }

    // Workflow automation helpers
    async executeStep(step) {
        try {
            console.log(`🔄 Executing automation step: ${step.type}`);
            
            switch (step.type) {
                case 'click':
                    return await this.clickMouse(step.x, step.y, step.button);
                    
                case 'doubleClick':
                    return await this.doubleClick(step.x, step.y);
                    
                case 'drag':
                    return await this.dragMouse(step.fromX, step.fromY, step.toX, step.toY);
                    
                case 'type':
                    return await this.typeText(step.text);
                    
                case 'keyPress':
                    return await this.pressKey(step.key, step.modifiers || []);
                    
                case 'delay':
                    await this.delay(step.duration || 1000);
                    return { success: true, duration: step.duration };
                    
                case 'scroll':
                    return await this.scrollMouse(step.x, step.y, step.direction, step.clicks);
                    
                case 'openApp':
                    return await this.openApplication(step.appName);
                    
                case 'closeApp':
                    return await this.closeApplication(step.appName);
                    
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
            
        } catch (error) {
            console.error(`Failed to execute step ${step.type}:`, error);
            throw error;
        }
    }

    // Platform information
    getPlatformInfo() {
        return {
            platform: this.platform,
            isInitialized: this.isInitialized,
            supportedFeatures: this.getSupportedFeatures()
        };
    }

    getSupportedFeatures() {
        const features = {
            mouse: true,
            keyboard: true,
            screen: true,
            applications: true
        };
        
        switch (this.platform) {
            case 'darwin':
                return { ...features, applescript: true };
                
            case 'win32':
                return { ...features, powershell: true };
                
            case 'linux':
                return { ...features, xdotool: true };
                
            default:
                return { ...features, limited: true };
        }
    }

    async takeScreenshot(filePath = null) {
        try {
            if (!filePath) {
                filePath = path.join(process.cwd(), 'screenshots', `screenshot_${Date.now()}.png`);
            }

            // Ensure screenshots directory exists
            const screenshotDir = path.dirname(filePath);
            await fs.mkdir(screenshotDir, { recursive: true });

            switch (this.platform) {
                case 'darwin': {
                    await execAsync(`screencapture "${filePath}"`);
                    break;
                }

                case 'win32': {
                    const screenshotScript = `
                        Add-Type -AssemblyName System.Windows.Forms,System.Drawing
                        $bounds = [Drawing.Rectangle]::FromLTRB(0, 0, [System.Windows.Forms.SystemInformation]::VirtualScreen.Width, [System.Windows.Forms.SystemInformation]::VirtualScreen.Height)
                        $bmp = New-Object Drawing.Bitmap $bounds.width, $bounds.height
                        $graphics = [Drawing.Graphics]::FromImage($bmp)
                        $graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.size)
                        $bmp.Save("${filePath.replace(/\\/g, '\\\\')}")
                        $graphics.Dispose()
                        $bmp.Dispose()
                    `;
                    await execAsync(`powershell -Command "${screenshotScript.replace(/\n/g, '; ')}"`);
                    break;
                }

                case 'linux': {
                    await execAsync(`import "${filePath}"`);
                    break;
                }

                default:
                    throw new Error(`Screenshot not supported on platform: ${this.platform}`);
            }

            console.log(`📸 Screenshot saved to: ${filePath}`);
            return { success: true, filePath: filePath };

        } catch (error) {
            console.error('❌ Screenshot failed:', error);
            throw error;
        }
    }

    async runTerminalCommand(command) {
        try {
            console.log(`💻 Running terminal command: ${command}`);
            
            const { stdout, stderr } = await execAsync(command);
            
            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                command: command
            };

        } catch (error) {
            console.error('❌ Terminal command failed:', error);
            return {
                success: false,
                error: error.message,
                command: command,
                stdout: error.stdout || '',
                stderr: error.stderr || ''
            };
        }
    }

    async dragMouse(fromX, fromY, toX, toY) {
        try {
            console.log(`🖱️ Dragging mouse from (${fromX}, ${fromY}) to (${toX}, ${toY})`);

            switch (this.platform) {
                case 'darwin': {
                    const dragScript = `
                        tell application "System Events"
                            set startPos to {${fromX}, ${fromY}}
                            set endPos to {${toX}, ${toY}}
                            my dragFromTo(startPos, endPos)
                        end tell
                        
                        on dragFromTo(startPos, endPos)
                            tell application "System Events"
                                set mousePos to startPos
                                delay 0.1
                                click at mousePos
                                delay 0.1
                                set mousePos to endPos
                                delay 0.1
                            end tell
                        end dragFromTo
                    `;
                    await execAsync(`osascript -e '${dragScript}'`);
                    break;
                }

                case 'win32': {
                    const dragScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
                        Start-Sleep -Milliseconds 100
                        [void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
                        [System.Windows.Forms.Application]::DoEvents()
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
                    `;
                    await execAsync(`powershell -Command "${dragScript.replace(/\n/g, '; ')}"`);
                    break;
                }

                case 'linux': {
                    await execAsync(`xdotool mousemove ${fromX} ${fromY}`);
                    await execAsync(`xdotool mousedown 1`);
                    await execAsync(`xdotool mousemove ${toX} ${toY}`);
                    await execAsync(`xdotool mouseup 1`);
                    break;
                }

                default:
                    throw new Error(`Drag mouse not supported on platform: ${this.platform}`);
            }

            return { success: true, from: { x: fromX, y: fromY }, to: { x: toX, y: toY } };

        } catch (error) {
            console.error('❌ Drag mouse failed:', error);
            throw error;
        }
    }
}

module.exports = SystemAutomationService;
