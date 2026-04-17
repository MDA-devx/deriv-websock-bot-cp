# Deriv Trading Bot Agent Guide

## Essential Commands
- **View UI**: Open any HTML file directly in browser (no build step)
- **Update UI**: Edit HTML/JS/CSS files → refresh browser
- **Test**: Manually verify in browser via Deriv WebSocket connection
- **Backend**: Implement WebSocket/server logic in `backend/server.js`

## Critical Files
- `free-index.html` - Recommended working UI (includes fixes)
- `index-old.html` - Original version with known issues (reference only)
- `frontend/js/app.js` - Frontend trading logic & indicator calculations
- `frontend/css/style.css` - UI styling
- `backend/server.js` - Empty placeholder for backend implementation

## Key Technical Details
- **WebSocket**: Connects to `wss://ws.binaryws.com/websockets/v3` for real-time data
- **Charting**: Uses Lightweight Charts library (loaded from CDN)
- **Inputs**: UI controls API token, App ID, timeframe, indicator periods
- **Signals**: Visual markers ▲ (CALL) or ▼ (PUT) on price chart
- **No Build System**: Pure HTML/JS/CSS - no npm, webpack, or transpilation needed

## Common Pitfalls to Avoid
- Don't look for build scripts or package.json (none exist)
- Don't modify index.html directly - use free-index.html for working version
- Backend currently empty - all logic runs in frontend WebSocket connection
- Indicator calculations (SMA, EMA, RSI, BB) are in frontend JavaScript