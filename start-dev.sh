#!/bin/bash

# Vy Automation - Development Start Script
# This script sets up and runs the Electron application in development mode

set -e

echo "🚀 Starting Vy Automation in Development Mode"
echo "=============================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set development environment
export NODE_ENV=development

# Check if React development server is needed
# (For this Electron app, we're bundling React directly, so no separate dev server needed)

echo "🔧 Building React components..."
# In a production setup, you might want to use webpack or similar for React

echo "⚡ Starting Electron application..."

# Start Electron with development flags
npx electron src/main.js --inspect=9229 --remote-debugging-port=9222

echo "✅ Application closed"
