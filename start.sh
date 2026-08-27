#!/bin/bash

export PATH="$HOME/.local/opt/node22/bin:$PATH"

echo "=== Turkish Iraq Gate - Starting All Services ==="

# Kill any existing processes on our ports
kill $(lsof -t -i:3000) 2>/dev/null
kill $(lsof -t -i:5678) 2>/dev/null

# Start n8n (if installed)
if command -v n8n &>/dev/null; then
  echo "Starting n8n (http://localhost:5678)..."
  nohup n8n start > /tmp/n8n.log 2>&1 &
  echo "  n8n PID: $!"
else
  echo "n8n not installed - skipping (n8n-workflow.json exists but n8n is unavailable)"
fi

# Start Next.js dev server
echo "Starting Next.js (http://localhost:3000)..."
cd "$(dirname "$0")"
nohup npm run dev > /tmp/nextjs.log 2>&1 &
echo "  Next.js PID: $!"

echo ""
echo "=== Services Ready ==="
echo "  Website:  http://localhost:3000"
echo "  n8n UI:   http://localhost:5678"
echo ""
echo "To import the automation workflow:"
echo "  1. Open http://localhost:5678"
echo "  2. Login with your n8n admin credentials (set separately)"
echo "  3. Go to Workflows > Import from File"
echo "  4. Select n8n-workflow.json"
echo "  5. Configure the WhatsApp and Calendar nodes"
echo "  6. Activate the workflow"
echo ""
echo "To stop all services: kill $(lsof -t -i:3000) $(lsof -t -i:5678)"
