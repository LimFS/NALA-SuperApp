#!/bin/bash

# Kill any lingering ports (just in case)
echo "🧹 Cleaning up ports..."
lsof -t -i:3000 -i:3001 -i:3010 -i:8000 -i:5173 | xargs kill -9 2>/dev/null

# 1. Main Server (3000)
echo "🚀 Starting Main Server (3000)..."
cd nala-server
export DATABASE_URL=postgresql://localhost:5432/ai_grader
nohup node server.js > ../server_output_main.log 2>&1 &
cd ..

# 2. ATAS Agent (3010)
echo "🚀 Starting ATAS Agent (3010)..."
cd nala-agents/atas
export DATABASE_URL=postgresql://localhost:5432/ai_grader
nohup node server.js > ../../server_output_atas.log 2>&1 &
cd ../..

# 3. AI Grader (3001)
echo "🚀 Starting AI Grader (3001)..."
cd nala-agents/ai-grader
export DATABASE_URL=postgresql://localhost:5432/ai_grader
# Ensure Environment loads correctly
nohup node server.js > ../../server_output_grader.log 2>&1 &
cd ../..

# 4. Gateway (8000)
echo "🚀 Starting Gateway (8000)..."
cd nala-gateway
nohup node gateway.js > ../gateway_output.log 2>&1 &
cd ..

# 5. Frontend (5173) - Production Preview Mode
echo "🚀 Starting Frontend (5173)..."
cd nala-app
# Build first to ensure latest changes
npm run build
nohup npm run preview -- --port 5173 --host 127.0.0.1 > ../frontend_output.log 2>&1 &
cd ..

echo "✅ All services started!"
echo "Parsed Output Logs:"
echo "  - server_output_main.log"
echo "  - server_output_atas.log"
echo "  - server_output_grader.log"
echo "  - gateway_output.log"
echo "  - frontend_output.log"
echo ""
echo "🌍 Access NALA at: http://localhost:8000"
