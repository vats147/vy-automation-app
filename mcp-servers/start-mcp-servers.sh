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
