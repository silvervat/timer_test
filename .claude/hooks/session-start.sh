#!/bin/bash
set -euo pipefail

# Only run in remote (web) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies
npm install

# Start dev server in background
nohup npm run dev > /tmp/vite-dev.log 2>&1 &

echo "Dev server starting on port 3000..."
