#!/bin/bash

# Set PATH to include Homebrew bin for node/npm
export PATH="/opt/homebrew/bin:$PATH"

# Kill any lingering ports (including new agents)
echo "🧹 Cleaning up ports..."
# Ports: 
# 3000 (Main), 3001 (Grader), 3002 (Design), 3003 (Teachable), 
# 3004 (Knowledge), 3006 (Analytics), 3010 (ATAS), 8000 (Gateway), 5173 (Frontend)
lsof -t -i:3000 -i:3001 -i:3002 -i:3003 -i:3004 -i:3006 -i:3010 -i:8000 -i:5173 | xargs kill -9 2>/dev/null

# 1. Main Server (3000)
echo "🚀 Starting Main Server (3000)..."
cd nala-server
export DATABASE_URL=postgresql://localhost:5432/nala_db
nohup node server.js > logs/server_output_main.log 2>&1 &
cd ..

# 2. ATAS Agent (3010)
echo "🚀 Starting ATAS Agent (3010)..."
cd nala-agents/atas
export DATABASE_URL=postgresql://localhost:5432/atas_db
nohup node server.js > logs/server_output_atas.log 2>&1 &
cd ../..

# 3. AI Grader (3001)
echo "🚀 Starting AI Grader (3001)..."
cd nala-agents/ai-grader
export DATABASE_URL=postgresql://localhost:5432/ai_grader
# Ensure Environment loads correctly
nohup node server.js > logs/server_output_grader.log 2>&1 &
cd ../..

# 4. Design Thinker Agent (3002)
echo "🚀 Starting Design Thinker Agent (3002)..."
cd nala-agents/design-thinker
nohup node server.js > logs/server_output_design.log 2>&1 &
cd ../..

# 5. Teachable Agent (3003)
echo "🚀 Starting Teachable Agent (3003)..."
cd nala-agents/teachable-agent
nohup node server.js > logs/server_output_teachable.log 2>&1 &
cd ../..

# 6. Knowledge Forum Agent (3004)
echo "🚀 Starting Knowledge Forum Agent (3004)..."
cd nala-agents/knowledge-forum
nohup node server.js > logs/server_output_knowledge.log 2>&1 &
cd ../..

# 7. Analytics Agent (3006)
echo "🚀 Starting Analytics Agent (3006)..."
cd nala-agents/analytics
nohup node server.js > logs/server_output_analytics.log 2>&1 &
cd ../..

# 8. Gateway (8000)
echo "🚀 Starting Gateway (8000)..."
cd nala-gateway
nohup node gateway.js > logs/gateway_output.log 2>&1 &
cd ..

# 9. Frontend (5173) - Production Preview Mode
echo "🚀 Starting Frontend (5173)..."
cd nala-app
# Build first to ensure latest changes
# npm run build  # Re-enable if needed
npm run build
nohup npm run preview -- --port 5173 --host 127.0.0.1 > logs/frontend_output.log 2>&1 &
cd ..

echo "✅ All services started!"
echo "Parsed Output Logs:"
echo "  - nala-server/logs/server_output_main.log"
echo "  - nala-agents/atas/logs/server_output_atas.log"
echo "  - nala-agents/ai-grader/logs/server_output_grader.log"
echo "  - nala-agents/design-thinker/logs/server_output_design.log"
echo "  - nala-agents/teachable-agent/logs/server_output_teachable.log"
echo "  - nala-agents/knowledge-forum/logs/server_output_knowledge.log"
echo "  - nala-agents/analytics/logs/server_output_analytics.log"
echo "  - nala-gateway/logs/gateway_output.log"
echo "  - nala-app/logs/frontend_output.log"
echo ""
echo "🌍 Access NALA at: http://localhost:8000"
