#!/bin/bash

# Claude-Style Computer Agent Setup Script
# This script sets up everything needed to run the computer automation agent

echo "🤖 Claude-Style Computer Agent Setup"
echo "===================================="
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 14+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt "14" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 14+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check if .env file exists
echo ""
echo "🔧 Checking configuration..."
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "💡 Edit .env file to add your Gemini API key for AI features"
else
    echo "✅ .env file exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Dependency installation failed"
    exit 1
fi

# Set up MCP servers for enhanced performance
echo ""
echo "⚡ Setting up MCP servers for 5-10x performance boost..."
chmod +x setup-mcp-servers.sh
./setup-mcp-servers.sh
if [ $? -eq 0 ]; then
    echo "✅ MCP servers set up successfully"
else
    echo "⚠️ MCP server setup had issues (you can still use basic features)"
fi

# Create quick start script
echo ""
echo "🚀 Creating quick start scripts..."

# Create start-agent.sh
cat > start-agent.sh << 'EOF'
#!/bin/bash
echo "🤖 Starting Claude-Style Computer Agent..."
echo "======================================="
echo ""
echo "🎯 Available commands:"
echo "   • Natural language: 'open calculator and compute 15 * 23'"
echo "   • System commands: /screenshot, /elements, /text <query>"
echo "   • Info commands: status, demo, help"
echo "   • Exit: quit, exit, or Ctrl+C"
echo ""

# Start MCP servers in background
if [ -f "./start-mcp-servers.sh" ]; then
    echo "⚡ Starting MCP servers for enhanced performance..."
    ./start-mcp-servers.sh &
    MCP_PID=$!
    
    # Give servers time to start
    sleep 3
    
    # Cleanup function
    cleanup() {
        echo ""
        echo "🛑 Stopping MCP servers..."
        kill $MCP_PID 2>/dev/null
        exit 0
    }
    
    # Set up cleanup on exit
    trap cleanup SIGINT SIGTERM
fi

# Start the agent
node claude-agent.js

# Cleanup on exit
if [ ! -z "$MCP_PID" ]; then
    kill $MCP_PID 2>/dev/null
fi
EOF

chmod +x start-agent.sh

# Create demo script
cat > demo-agent.sh << 'EOF'
#!/bin/bash
echo "🎪 Claude-Style Computer Agent Demo"
echo "==================================="
echo ""
echo "This demo will show you the agent's capabilities without taking real actions."
echo ""

# Start agent in demo mode
echo "demo" | node claude-agent.js
EOF

chmod +x demo-agent.sh

echo "✅ Quick start scripts created"

# Final setup verification
echo ""
echo "🔍 Verifying setup..."

# Test basic Node.js execution
if node -e "console.log('Node.js test: OK')" &>/dev/null; then
    echo "✅ Node.js execution test passed"
else
    echo "❌ Node.js execution test failed"
fi

# Check if agent file exists and is valid
if [ -f "claude-agent.js" ]; then
    echo "✅ Computer agent files present"
else
    echo "❌ Computer agent files missing"
fi

# Check MCP servers
if [ -d "mcp-servers" ] && [ -f "mcp-servers/package.json" ]; then
    echo "✅ MCP servers configured"
else
    echo "⚠️ MCP servers not fully configured (basic features still work)"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🚀 Quick Start Options:"
echo ""
echo "1. Basic Start (works immediately):"
echo "   npm run claude"
echo ""
echo "2. Enhanced Start (with MCP servers):"
echo "   ./start-agent.sh"
echo ""
echo "3. Demo Mode (safe exploration):"
echo "   ./demo-agent.sh"
echo ""
echo "4. Full Development Mode:"
echo "   npm run claude:setup"
echo ""
echo "💡 Pro Tips:"
echo "   • Add your Gemini API key to .env for AI features"
echo "   • Use 'help' command in the agent for full command list"
echo "   • Try 'demo' first to see capabilities safely"
echo "   • Use /screenshot to analyze your current screen"
echo ""
echo "📚 Documentation:"
echo "   • README: CLAUDE-AGENT-README.md"
echo "   • MCP Guide: MCP-MIGRATION-GUIDE.md"
echo ""
echo "🎯 Example Commands:"
echo "   🤖 Computer Agent > open calculator and compute 15 * 23"
echo "   🤖 Computer Agent > take a screenshot and analyze it"
echo "   🤖 Computer Agent > find all clickable elements on screen"
echo ""
echo "Ready to automate your computer like Claude! 🚀"
