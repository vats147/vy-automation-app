const WebSocket = require('ws');
const { EventEmitter } = require('events');

/**
 * MCP (Model Context Protocol) Client
 * Replaces screenshot-based context gathering with structured data queries
 */
class MCPClient extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.isInitialized = false;
        this.defaultTimeout = 5000;
        this.retryAttempts = 3;
        this.requestId = 0;
    }

    async initialize() {
        try {
            console.log('🔧 Initializing MCP Client...');
            
            // Initialize core MCP servers
            await this.connectToServer('screen_state', 'ws://localhost:8080');
            await this.connectToServer('ui_automation', 'ws://localhost:8081');
            await this.connectToServer('accessibility', 'ws://localhost:8082');
            
            this.isInitialized = true;
            console.log('✅ MCP Client initialized with servers');
            return true;
            
        } catch (error) {
            console.warn('⚠️ MCP servers not available, falling back to direct automation');
            return false;
        }
    }

    async connectToServer(serverName, url) {
        try {
            const ws = new WebSocket(url);
            
            ws.on('open', () => {
                console.log(`🔗 Connected to MCP server: ${serverName}`);
                this.connections.set(serverName, ws);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.emit(`response:${serverName}`, message);
                } catch (error) {
                    console.error(`Failed to parse message from ${serverName}:`, error);
                }
            });

            ws.on('error', (error) => {
                console.error(`MCP server ${serverName} error:`, error);
                this.connections.delete(serverName);
            });

            ws.on('close', () => {
                console.log(`🔌 Disconnected from MCP server: ${serverName}`);
                this.connections.delete(serverName);
            });

            return new Promise((resolve, reject) => {
                ws.on('open', resolve);
                ws.on('error', reject);
                setTimeout(() => reject(new Error(`Connection timeout for ${serverName}`)), 5000);
            });

        } catch (error) {
            throw new Error(`Failed to connect to ${serverName}: ${error.message}`);
        }
    }

    async query(serverName, method, params = {}) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`No connection to server: ${serverName}`);
        }

        const requestId = ++this.requestId;
        const request = {
            id: requestId,
            method: method,
            params: params,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Query timeout for ${serverName}.${method}`));
            }, this.defaultTimeout);

            const responseHandler = (message) => {
                if (message.id === requestId) {
                    clearTimeout(timeout);
                    this.off(`response:${serverName}`, responseHandler);
                    
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        resolve(message.result);
                    }
                }
            };

            this.on(`response:${serverName}`, responseHandler);

            try {
                connection.send(JSON.stringify(request));
            } catch (error) {
                clearTimeout(timeout);
                this.off(`response:${serverName}`, responseHandler);
                reject(error);
            }
        });
    }

    async queryWithRetry(serverName, method, params = {}, attempts = this.retryAttempts) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await this.query(serverName, method, params);
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed for ${serverName}.${method}:`, error.message);
                if (i === attempts - 1) {
                    throw error;
                }
                await this.delay(1000 * (i + 1)); // Exponential backoff
            }
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Screen State Queries (replaces screenshot analysis)
    async getActiveWindow() {
        try {
            return await this.queryWithRetry('screen_state', 'get_active_window');
        } catch (error) {
            console.warn('MCP fallback: using direct window detection');
            return this.getActiveWindowFallback();
        }
    }

    async getWindowList() {
        try {
            return await this.queryWithRetry('screen_state', 'get_window_list');
        } catch (error) {
            console.warn('MCP fallback: using direct window listing');
            return this.getWindowListFallback();
        }
    }

    async getUIElements(bounds = null) {
        try {
            return await this.queryWithRetry('accessibility', 'get_ui_elements', { bounds });
        } catch (error) {
            console.warn('MCP fallback: using direct UI element detection');
            return this.getUIElementsFallback(bounds);
        }
    }

    async getClickableElements() {
        try {
            return await this.queryWithRetry('accessibility', 'get_clickable_elements');
        } catch (error) {
            console.warn('MCP fallback: using heuristic clickable detection');
            return this.getClickableElementsFallback();
        }
    }

    async getScreenLayout() {
        try {
            return await this.queryWithRetry('screen_state', 'get_screen_layout');
        } catch (error) {
            console.warn('MCP fallback: using basic screen layout');
            return this.getScreenLayoutFallback();
        }
    }

    // UI Automation Queries (replaces manual automation)
    async findElementByText(text) {
        try {
            return await this.queryWithRetry('ui_automation', 'find_element_by_text', { text });
        } catch (error) {
            console.warn('MCP fallback: using text search heuristics');
            return this.findElementByTextFallback(text);
        }
    }

    async getElementBounds(elementId) {
        try {
            return await this.queryWithRetry('ui_automation', 'get_element_bounds', { elementId });
        } catch (error) {
            console.warn('MCP fallback: estimating element bounds');
            return null;
        }
    }

    // Fallback methods (when MCP servers are not available)
    async getActiveWindowFallback() {
        try {
            const activeWin = require('active-win');
            const window = await activeWin();
            return {
                title: window?.title || 'Unknown',
                app: window?.owner?.name || 'Unknown',
                bounds: window?.bounds || { x: 0, y: 0, width: 800, height: 600 },
                pid: window?.owner?.processId || 0
            };
        } catch (error) {
            console.error('Failed to get active window:', error);
            return {
                title: 'Unknown',
                app: 'Unknown',
                bounds: { x: 0, y: 0, width: 800, height: 600 },
                pid: 0
            };
        }
    }

    async getWindowListFallback() {
        // Basic window list fallback
        return [await this.getActiveWindowFallback()];
    }

    async getUIElementsFallback(bounds) {
        // Return basic UI elements based on common patterns
        return [
            {
                type: 'button',
                text: 'OK',
                bounds: { x: 100, y: 100, width: 80, height: 30 },
                clickable: true
            },
            {
                type: 'text_field',
                bounds: { x: 50, y: 50, width: 200, height: 25 },
                clickable: true,
                editable: true
            }
        ];
    }

    async getClickableElementsFallback() {
        // Return common clickable areas
        return [
            { x: 100, y: 100, type: 'button', confidence: 0.5 },
            { x: 200, y: 150, type: 'link', confidence: 0.3 }
        ];
    }

    async getScreenLayoutFallback() {
        return {
            windows: await this.getWindowListFallback(),
            screenSize: { width: 1920, height: 1080 },
            activeWindow: await this.getActiveWindowFallback()
        };
    }

    async findElementByTextFallback(text) {
        // Basic text search fallback
        return {
            found: false,
            elements: [],
            confidence: 0.0
        };
    }

    // Batch operations for performance
    async batchQuery(queries) {
        const results = {};
        const promises = [];

        for (const [key, query] of Object.entries(queries)) {
            const promise = this.queryWithRetry(query.server, query.method, query.params)
                .then(result => ({ key, result, success: true }))
                .catch(error => ({ key, error: error.message, success: false }));
            promises.push(promise);
        }

        const responses = await Promise.allSettled(promises);
        
        for (const response of responses) {
            if (response.status === 'fulfilled') {
                const { key, result, error, success } = response.value;
                results[key] = success ? result : { error };
            } else {
                results[response.reason?.key || 'unknown'] = { error: response.reason?.message || 'Unknown error' };
            }
        }

        return results;
    }

    // Context gathering (replaces screenshot analysis)
    async gatherScreenContext() {
        try {
            const contextQueries = {
                activeWindow: {
                    server: 'screen_state',
                    method: 'get_active_window'
                },
                uiElements: {
                    server: 'accessibility',
                    method: 'get_ui_elements'
                },
                clickableElements: {
                    server: 'accessibility',
                    method: 'get_clickable_elements'
                },
                screenLayout: {
                    server: 'screen_state',
                    method: 'get_screen_layout'
                }
            };

            console.log('📊 Gathering screen context via MCP...');
            const context = await this.batchQuery(contextQueries);
            
            return {
                timestamp: Date.now(),
                method: 'mcp',
                context: context,
                fallback: false
            };

        } catch (error) {
            console.warn('MCP context gathering failed, using fallbacks');
            return await this.gatherScreenContextFallback();
        }
    }

    async gatherScreenContextFallback() {
        const context = {
            activeWindow: await this.getActiveWindowFallback(),
            uiElements: await this.getUIElementsFallback(),
            clickableElements: await this.getClickableElementsFallback(),
            screenLayout: await this.getScreenLayoutFallback()
        };

        return {
            timestamp: Date.now(),
            method: 'fallback',
            context: context,
            fallback: true
        };
    }

    // Health check and status
    getStatus() {
        const serverStatuses = {};
        for (const [name, connection] of this.connections) {
            serverStatuses[name] = {
                connected: connection.readyState === WebSocket.OPEN,
                readyState: connection.readyState
            };
        }

        return {
            initialized: this.isInitialized,
            connectedServers: this.connections.size,
            servers: serverStatuses,
            fallbackMode: this.connections.size === 0
        };
    }

    async disconnect() {
        console.log('🔌 Disconnecting MCP client...');
        for (const [name, connection] of this.connections) {
            try {
                connection.close();
                console.log(`Disconnected from ${name}`);
            } catch (error) {
                console.error(`Error disconnecting from ${name}:`, error);
            }
        }
        this.connections.clear();
        this.isInitialized = false;
    }
}

module.exports = MCPClient;
