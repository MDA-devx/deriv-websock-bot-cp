#!/bin/bash
# kill-server.sh - Stop the Deriv Trading Bot server and related processes

echo "Stopping Deriv Trading Bot server..."

# Kill the backend server (node backend/server.js)
pkill -f "node backend/server.js"

# Kill the dashboard server (npm run dashboard)
pkill -f "npm run dashboard"

# Optional: Also kill any node processes that might be left over (if any)
# pkill -f "node.*server"

# Wait a moment for processes to terminate
sleep 1

# Check if port 3002 is still in use and try to free it if necessary
if lsof -ti:3002 > /dev/null; then
    echo "Port 3002 is still in use. Attempting to free it..."
    # Try to kill any process using port 3002
    fuser -k 3002/tcp 2>/dev/null || true
    sleep 1
    if lsof -ti:3002 > /dev/null; then
        echo "Warning: Could not free port 3002. You may need to manually kill the process."
    else
        echo "Port 3002 is now free."
    fi
else
    echo "Port 3002 is already free."
fi

echo "Server stop command issued."