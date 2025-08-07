#!/bin/bash

# MCP Server Setup Script for Vy Automation
# This script sets up local MCP servers for screen state, UI automation, and accessibility

echo "🚀 Setting up MCP Servers for Vy Automation..."

# Create MCP servers directory
MCP_DIR="./mcp-servers"
mkdir -p "$MCP_DIR"

# Function to create a simple MCP server
create_mcp_server() {
    local server_name=$1
    local port=$2
    local description=$3
    
    echo "📦 Creating $server_name server on port $port..."
    
    cat > "$MCP_DIR/$server_name.js" << EOF
const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

class ${server_name^}MCPServer {
    constructor(port) {
        this.port = port;
        this.wss = null;
        this.clients = new Set();
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('connection', (ws) => {
            console.log(\`✅ Client connected to $server_name server\`);
            this.clients.add(ws);
            
            ws.on('message', async (message) => {
                try {
                    const request = JSON.parse(message);
                    const response = await this.handleRequest(request);
                    ws.send(JSON.stringify(response));
                } catch (error) {
                    ws.send(JSON.stringify({
                        id: request?.id,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    }));
                }
            });
            
            ws.on('close', () => {
                console.log(\`❌ Client disconnected from $server_name server\`);
                this.clients.delete(ws);
            });
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                server: '$server_name',
                description: '$description',
                capabilities: this.getCapabilities(),
                timestamp: new Date().toISOString()
            }));
        });
        
        console.log(\`🌐 $server_name MCP Server running on port \${this.port}\`);
    }

    async handleRequest(request) {
        switch (request.method) {
            case 'ping':
                return { id: request.id, result: 'pong', timestamp: new Date().toISOString() };
                
            case 'getCapabilities':
                return { id: request.id, result: this.getCapabilities() };
                
            default:
                return await this.handleSpecificRequest(request);
        }
    }

    getCapabilities() {
        // Override in specific servers
        return ['ping', 'getCapabilities'];
    }

    async handleSpecificRequest(request) {
        // Override in specific servers
        throw new Error(\`Unsupported method: \${request.method}\`);
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new ${server_name^}MCPServer($port);
    server.start();
}

module.exports = ${server_name^}MCPServer;
EOF
}

# Create Screen State MCP Server
create_mcp_server "screen_state" 8080 "Provides current screen state and active window information"

# Enhance Screen State Server
cat >> "$MCP_DIR/screen_state.js" << 'EOF'

class ScreenStateMCPServer extends Screen_stateMCPServer {
    getCapabilities() {
        return [
            'ping',
            'getCapabilities', 
            'getActiveWindow',
            'getWindowList',
            'getScreenBounds',
            'captureScreenRegion'
        ];
    }

    async handleSpecificRequest(request) {
        switch (request.method) {
            case 'getActiveWindow':
                return { id: request.id, result: await this.getActiveWindow() };
                
            case 'getWindowList':
                return { id: request.id, result: await this.getWindowList() };
                
            case 'getScreenBounds':
                return { id: request.id, result: await this.getScreenBounds() };
                
            case 'captureScreenRegion':
                return { id: request.id, result: await this.captureScreenRegion(request.params) };
                
            default:
                throw new Error(`Unsupported method: ${request.method}`);
        }
    }

    async getActiveWindow() {
        return new Promise((resolve, reject) => {
            if (process.platform === 'darwin') {
                exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve({ app: stdout.trim(), platform: 'darwin', timestamp: new Date().toISOString() });
                });
            } else if (process.platform === 'win32') {
                exec('powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne \\"\\"} | Select-Object -First 1 ProcessName"', (error, stdout) => {
                    if (error) reject(error);
                    else resolve({ app: stdout.trim(), platform: 'win32', timestamp: new Date().toISOString() });
                });
            } else {
                exec('xdotool getactivewindow getwindowname', (error, stdout) => {
                    if (error) reject(error);
                    else resolve({ app: stdout.trim(), platform: 'linux', timestamp: new Date().toISOString() });
                });
            }
        });
    }

    async getWindowList() {
        return new Promise((resolve, reject) => {
            if (process.platform === 'darwin') {
                exec(`osascript -e 'tell application "System Events" to get name of every application process whose visible is true'`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve({ windows: stdout.trim().split(', '), platform: 'darwin', timestamp: new Date().toISOString() });
                });
            } else {
                resolve({ windows: [], platform: process.platform, timestamp: new Date().toISOString(), note: 'Window listing not implemented for this platform' });
            }
        });
    }

    async getScreenBounds() {
        // Simplified screen bounds - in real implementation would use platform-specific APIs
        return {
            width: 1920,
            height: 1080,
            platform: process.platform,
            timestamp: new Date().toISOString(),
            note: 'Simplified bounds - real implementation would detect actual screen size'
        };
    }

    async captureScreenRegion(params) {
        // Placeholder for screen capture functionality
        return {
            success: false,
            message: 'Screen capture not implemented in this demo server',
            requested_region: params,
            timestamp: new Date().toISOString()
        };
    }
}

// Fix the class name issue and start server
if (require.main === module) {
    const server = new ScreenStateMCPServer(8080);
    server.start();
}

module.exports = ScreenStateMCPServer;
EOF

# Create UI Automation MCP Server  
create_mcp_server "ui_automation" 8081 "Provides UI element detection and interaction capabilities"

# Enhance UI Automation Server
cat >> "$MCP_DIR/ui_automation.js" << 'EOF'

class UiAutomationMCPServer extends Ui_automationMCPServer {
    getCapabilities() {
        return [
            'ping',
            'getCapabilities',
            'findElementsByText', 
            'findClickableElements',
            'getElementBounds',
            'highlightElement'
        ];
    }

    async handleSpecificRequest(request) {
        switch (request.method) {
            case 'findElementsByText':
                return { id: request.id, result: await this.findElementsByText(request.params) };
                
            case 'findClickableElements':
                return { id: request.id, result: await this.findClickableElements() };
                
            case 'getElementBounds':
                return { id: request.id, result: await this.getElementBounds(request.params) };
                
            case 'highlightElement':
                return { id: request.id, result: await this.highlightElement(request.params) };
                
            default:
                throw new Error(`Unsupported method: ${request.method}`);
        }
    }

    async findElementsByText(params) {
        const { text, fuzzy = false } = params;
        
        // Simulated UI element finding
        const mockElements = [
            { id: 'elem_1', text: 'OK', bounds: { x: 100, y: 200, width: 80, height: 30 }, type: 'button' },
            { id: 'elem_2', text: 'Cancel', bounds: { x: 200, y: 200, width: 80, height: 30 }, type: 'button' },
            { id: 'elem_3', text: 'Search', bounds: { x: 50, y: 50, width: 200, height: 25 }, type: 'textfield' },
        ];
        
        const found = mockElements.filter(elem => {
            if (fuzzy) {
                return elem.text.toLowerCase().includes(text.toLowerCase());
            }
            return elem.text.toLowerCase() === text.toLowerCase();
        });
        
        return {
            query: text,
            found: found.length > 0,
            elements: found,
            confidence: found.length > 0 ? 0.9 : 0.0,
            timestamp: new Date().toISOString()
        };
    }

    async findClickableElements() {
        // Simulated clickable elements detection
        return {
            elements: [
                { id: 'click_1', type: 'button', bounds: { x: 100, y: 200, width: 80, height: 30 }, text: 'OK' },
                { id: 'click_2', type: 'button', bounds: { x: 200, y: 200, width: 80, height: 30 }, text: 'Cancel' },
                { id: 'click_3', type: 'link', bounds: { x: 50, y: 300, width: 100, height: 20 }, text: 'Learn More' },
            ],
            count: 3,
            timestamp: new Date().toISOString()
        };
    }

    async getElementBounds(params) {
        const { elementId } = params;
        
        // Mock element bounds lookup
        const bounds = {
            'elem_1': { x: 100, y: 200, width: 80, height: 30 },
            'elem_2': { x: 200, y: 200, width: 80, height: 30 },
            'elem_3': { x: 50, y: 50, width: 200, height: 25 },
        };
        
        return {
            elementId,
            bounds: bounds[elementId] || null,
            found: !!bounds[elementId],
            timestamp: new Date().toISOString()
        };
    }

    async highlightElement(params) {
        const { elementId, duration = 1000 } = params;
        
        return {
            elementId,
            highlighted: true,
            duration,
            message: 'Element highlighting simulated',
            timestamp: new Date().toISOString()
        };
    }
}

// Fix the class name issue and start server
if (require.main === module) {
    const server = new UiAutomationMCPServer(8081);
    server.start();
}

module.exports = UiAutomationMCPServer;
EOF

# Create Accessibility MCP Server
create_mcp_server "accessibility" 8082 "Provides accessibility tree and element information"

# Enhance Accessibility Server
cat >> "$MCP_DIR/accessibility.js" << 'EOF'

class AccessibilityMCPServer extends AccessibilityMCPServer {
    getCapabilities() {
        return [
            'ping',
            'getCapabilities',
            'getAccessibilityTree',
            'findAccessibleElements',
            'getElementAccessibilityInfo'
        ];
    }

    async handleSpecificRequest(request) {
        switch (request.method) {
            case 'getAccessibilityTree':
                return { id: request.id, result: await this.getAccessibilityTree() };
                
            case 'findAccessibleElements':
                return { id: request.id, result: await this.findAccessibleElements(request.params) };
                
            case 'getElementAccessibilityInfo':
                return { id: request.id, result: await this.getElementAccessibilityInfo(request.params) };
                
            default:
                throw new Error(`Unsupported method: ${request.method}`);
        }
    }

    async getAccessibilityTree() {
        // Simulated accessibility tree
        return {
            root: {
                role: 'window',
                name: 'Vy Automation',
                children: [
                    {
                        role: 'button',
                        name: 'OK',
                        bounds: { x: 100, y: 200, width: 80, height: 30 },
                        accessible: true
                    },
                    {
                        role: 'textfield',
                        name: 'Search',
                        bounds: { x: 50, y: 50, width: 200, height: 25 },
                        accessible: true,
                        value: ''
                    }
                ]
            },
            timestamp: new Date().toISOString()
        };
    }

    async findAccessibleElements(params) {
        const { role, name } = params;
        
        const mockElements = [
            { role: 'button', name: 'OK', bounds: { x: 100, y: 200, width: 80, height: 30 } },
            { role: 'button', name: 'Cancel', bounds: { x: 200, y: 200, width: 80, height: 30 } },
            { role: 'textfield', name: 'Search', bounds: { x: 50, y: 50, width: 200, height: 25 } },
        ];
        
        let filtered = mockElements;
        if (role) filtered = filtered.filter(el => el.role === role);
        if (name) filtered = filtered.filter(el => el.name.toLowerCase().includes(name.toLowerCase()));
        
        return {
            query: { role, name },
            elements: filtered,
            count: filtered.length,
            timestamp: new Date().toISOString()
        };
    }

    async getElementAccessibilityInfo(params) {
        const { elementId } = params;
        
        return {
            elementId,
            accessible: true,
            role: 'button',
            name: 'OK',
            description: 'Confirmation button',
            bounds: { x: 100, y: 200, width: 80, height: 30 },
            state: ['enabled', 'focusable'],
            timestamp: new Date().toISOString()
        };
    }
}

// Fix class name issue and start server
if (require.main === module) {
    const server = new AccessibilityMCPServer(8082);
    server.start();
}

module.exports = AccessibilityMCPServer;
EOF

# Create package.json for MCP servers
cat > "$MCP_DIR/package.json" << 'EOF'
{
  "name": "vy-automation-mcp-servers",
  "version": "1.0.0",
  "description": "MCP servers for Vy Automation structured screen data",
  "main": "index.js",
  "scripts": {
    "start:screen": "node screen_state.js",
    "start:ui": "node ui_automation.js", 
    "start:accessibility": "node accessibility.js",
    "start:all": "concurrently \"npm run start:screen\" \"npm run start:ui\" \"npm run start:accessibility\"",
    "dev": "npm run start:all"
  },
  "dependencies": {
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "keywords": ["mcp", "automation", "screen", "ui", "accessibility"],
  "author": "Vy Automation",
  "license": "MIT"
}
EOF

# Install dependencies for MCP servers
echo "📦 Installing MCP server dependencies..."
cd "$MCP_DIR"
npm install

# Create startup script
cat > start-mcp-servers.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting all MCP servers for Vy Automation..."

cd mcp-servers

# Start all servers in background
echo "📡 Starting Screen State server on port 8080..."
node screen_state.js &
SCREEN_PID=$!

echo "🎯 Starting UI Automation server on port 8081..."
node ui_automation.js &
UI_PID=$!

echo "♿ Starting Accessibility server on port 8082..."
node accessibility.js &
ACCESS_PID=$!

echo "✅ All MCP servers started!"
echo "📊 PIDs: Screen($SCREEN_PID), UI($UI_PID), Accessibility($ACCESS_PID)"
echo ""
echo "🔗 Server endpoints:"
echo "   - Screen State: ws://localhost:8080"
echo "   - UI Automation: ws://localhost:8081" 
echo "   - Accessibility: ws://localhost:8082"
echo ""
echo "⏹️  To stop all servers: kill $SCREEN_PID $UI_PID $ACCESS_PID"

# Keep script running and handle Ctrl+C
trap 'echo "🛑 Stopping all MCP servers..."; kill $SCREEN_PID $UI_PID $ACCESS_PID; exit' INT

# Wait for any server to exit
wait
EOF

chmod +x start-mcp-servers.sh

echo ""
echo "✅ MCP Server setup complete!"
echo ""
echo "📁 Created files:"
echo "   - ./mcp-servers/screen_state.js"
echo "   - ./mcp-servers/ui_automation.js" 
echo "   - ./mcp-servers/accessibility.js"
echo "   - ./mcp-servers/package.json"
echo "   - ./start-mcp-servers.sh"
echo ""
echo "🚀 To start all MCP servers:"
echo "   ./start-mcp-servers.sh"
echo ""
echo "🔗 MCP servers will be available at:"
echo "   - Screen State: ws://localhost:8080"
echo "   - UI Automation: ws://localhost:8081"
echo "   - Accessibility: ws://localhost:8082"
echo ""
echo "🎯 The MCP-enhanced Vy Automation will automatically connect to these servers!"
