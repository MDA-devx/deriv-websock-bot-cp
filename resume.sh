#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

SESSION_ID="ses_19b864b94ffevV2BClwpNjY1W0"

echo ""
echo "  ============================================================"
echo "  Launching opencode to resume Deriv session"
echo "  Session: $SESSION_ID"
echo "  ============================================================"
echo ""

# Kill any lingering server on port 3002
lsof -ti:3002 2>/dev/null | xargs kill 2>/dev/null || true

# Generate session context and start backend
echo "  [1/2] Generating session context + starting server..."
node temp/resume_session.mjs &
SERVER_PID=$!
sleep 3

# Launch opencode forking from the session
echo ""
echo "  [2/2] Launching opencode..."
echo ""

opencode "$ROOT" \
  --session "$SESSION_ID" \
  --fork \
  --prompt "Resume the previous Deriv trading bot session. Read .hermes/SESSION_CONTEXT.md and .hermes/plans/ to understand current state. Continue where I left off." \
  --agent general
