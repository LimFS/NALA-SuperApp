#!/bin/bash

# Utility script to build ATAS Agent with correct PATH
# Usage: ./build_atas.sh

# 1. Set PATH for Homebrew (Apple Silicon)
export PATH="/opt/homebrew/bin:$PATH"

echo "🛠️  Building ATAS Agent Frontend..."
cd nala-agents/atas

# 2. Check if npm exists
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm could not be found. Is Node.js installed?"
    exit 1
fi

# 3. Install dependencies if missing (optional, safety check)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 4. Build
npm run build:ui

if [ $? -eq 0 ]; then
    echo "✅ Build Successful!"
else
    echo "❌ Build Failed."
    exit 1
fi
