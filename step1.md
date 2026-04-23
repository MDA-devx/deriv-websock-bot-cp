# Step 1: Server Processes Development

## Current State Analysis
- **Backend**: Basic Express server (`backend/server.js`) serving static files only
- **WebSocket**: Currently handled in frontend (`index.html` lines 361-482)
- **Strategies**: RSI logic embedded in frontend script
- **Config**: No centralized configuration exists

---

## 1.1 WebSocket Module

**File to create**: `backend/websocket/WebSocketManager.js`

### Steps:

1. **Install dependency**:
   ```bash
   npm install ws
   ```

2. **Create WebSocketManager class** with:
   - Constructor accepting `appId`, `token`, `symbol`, `granularity`
   - Method `connect()` - establishes WebSocket to `wss://ws.binaryws.com/websockets/v3?app_id=${appId}`
   - Method `disconnect()` - graceful shutdown
   - Method `send(message)` - sends JSON message with error handling
   - Method `subscribeOHLC()` - subscribes to candle updates
   - Method `requestHistory()` - fetches historical candles

3. **Implement reconnection logic**:
   - Exponential backoff (1s, 2s, 4s, 8s... max 30s)
   - Maximum retry attempts (3)
   - Emit 'reconnecting' and 'reconnected' events

4. **Implement heartbeat**:
   - Ping every 30 seconds
   - Track pong responses
   - Reconnect if no pong within 10 seconds

5. **Message buffer**:
   - Queue messages when disconnected
   - Flush buffer on reconnect (optional, configurable max size)

6. **EventEmitter**: Extend EventEmitter to emit:
   - `open`, `close`, `error`, `message`, `candle`, `history`

7. **Export**: `export default WebSocketManager`

---

## 1.2 Connection Module

**File to create**: `backend/connection/ConnectionManager.js`

### Steps:

1. **Create ConnectionManager class** with state machine:
   - States: `disconnected`, `connecting`, `connected`, `authorized`, `error`
   - Current state property with getter

2. **Token validation**:
   - Method `validateToken(token)` - regex check for format
   - Store token securely (memory only, never log)

3. **App ID validation**:
   - Method `validateAppId(appId)` - must be numeric
   - Default to '1089' if invalid

4. **Connection flow**:
   - `connect(appId, token)` → transitions to `connecting`
   - On WebSocket `open` → transitions to `connected`
   - If token provided → send `authorize` → transitions to `authorized`
   - On error → transitions to `error` with error details

5. **Error handling**:
   - Network errors (emit `connection_error`)
   - Auth errors (emit `auth_error`, disconnect)
   - API errors (emit `api_error` with details)

6. **EventEmitter**: Emit state changes:
   - `state_change(oldState, newState)`
   - `authorized`, `unauthorized`

7. **Export**: `export default ConnectionManager`

---

## 1.3 WebServer Enhancement

**File to modify**: `backend/server.js`
**Files to create**: `backend/routes/*.js`

### Steps:

1. **Create API routes directory**: `backend/routes/`

2. **Config route** (`backend/routes/config.js`):
   - `GET /api/config` - returns current configuration
   - `POST /api/config` - updates configuration (validates input)

3. **Strategies route** (`backend/routes/strategies.js`):
   - `GET /api/strategies` - list available strategies
   - `GET /api/strategies/:name` - get strategy details/params
   - `POST /api/strategies/:name/activate` - activate strategy
   - `POST /api/strategies/:name/deactivate` - deactivate strategy

4. **Symbols route** (`backend/routes/symbols.js`):
   - `GET /api/symbols` - list available markets/symbols
   - Cache responses (symbols don't change often)

5. **Status route** (`backend/routes/status.js`):
   - `GET /api/status` - connection status, uptime, stats

6. **Middleware**:
   - Request logging (already exists, enhance with response time)
   - Error handling middleware (catch all errors, return JSON)
   - CORS enhancement (allow specific origins in production)

7. **Integrate routes** in `server.js`:
   ```javascript
   import configRoutes from './routes/config.js';
   app.use('/api/config', configRoutes);
   // ... etc
   ```

8. **Export server instance** for testing

---

## 1.4 Strategies Module

**Files to create**: `backend/strategies/*.js`

### Steps:

1. **Base Strategy** (`backend/strategies/StrategyBase.js`):
   ```javascript
   export default class StrategyBase {
     constructor(name, params = {}) {
       this.name = name;
       this.params = params;
       this.isActive = false;
       this.lastSignal = null;
     }
     
     activate() { this.isActive = true; }
     deactivate() { this.isActive = false; }
     
     // Override in subclasses
     analyze(candleData, indicators) {
       throw new Error('analyze() must be implemented');
     }
     
     // Returns: { signal: 'call'|'put'|null, reason: string }
   }
   ```

2. **RSI Strategy** (`backend/strategies/RSIStrategy.js`):
   - Port logic from frontend (`index.html` lines 523-557)
   - Parameters: `period`, `highLevel`, `lowLevel`
   - Method `calculate(data)` - compute RSI
   - Method `analyze(data)` - return signal if conditions met

3. **SMA/EMA Crossover Strategy** (`backend/strategies/SMAEMACrossoverStrategy.js`):
   - Parameters: `smaPeriod`, `emaPeriod`
   - Signal when EMA crosses above (call) or below (put) SMA

4. **Bollinger Bands Strategy** (`backend/strategies/BBStrategy.js`):
   - Parameters: `period`, `stdDev`
   - Signal on price touching upper/lower band

5. **Strategy Registry** (`backend/strategies/index.js`):
   - Map of available strategies
   - Method `getStrategy(name)` - returns instance
   - Method `listStrategies()` - returns all with metadata

6. **Strategy Engine** (`backend/strategies/Engine.js`):
   - Holds active strategy instance
   - On new candle → run `analyze()`
   - Emit `signal` event with result
   - Log signal to database/file (optional)

---

## 1.5 Configuration Module

**Files to create**: `backend/config/ConfigManager.js`, `config/default.json`

### Steps:

1. **Default config** (`config/default.json`):
   ```json
   {
     "appId": "1089",
     "defaultTimeframe": 60,
     "symbols": ["R_25"],
     "indicators": {
       "sma": { "enabled": true, "period": 23 },
       "ema": { "enabled": true, "period": 10 },
       "rsi": { "enabled": true, "period": 7, "high": 65, "low": 35 },
       "bb": { "enabled": true, "period": 20 }
     },
     "websocket": {
       "reconnect": true,
       "maxRetries": 10,
       "heartbeatInterval": 30000
     },
     "server": {
       "port": 3002,
       "hostname": "0.0.0.0"
     }
   }
   ```

2. **Local config** (`config/local.json`):
   - Gitignored file for local overrides
   - Create `.gitignore` entry if not exists

3. **ConfigManager class** (`backend/config/ConfigManager.js`):
   - Method `load()` - reads default.json, merges with local.json
   - Method `get(key)` - returns config value (supports dot notation)
   - Method `set(key, value)` - updates config in memory
   - Method `save()` - persists to local.json (optional)
   - Method `validate()` - ensures required fields exist

4. **Environment variable override**:
   - Support `DERIV_APP_ID`, `DERIV_API_TOKEN`, `PORT`, etc.
   - Override config values with env vars at load time

5. **Export singleton**: `export default new ConfigManager()`

---

## Implementation Order (within Server Processes)

1. **Config** (1.5) - needed by all other modules
2. **WebSocket** (1.1) - core communication
3. **Connection** (1.2) - wraps WebSocket with state management
4. **Strategies** (1.4) - business logic
5. **WebServer** (1.3) - expose everything via API

---

## Files to Create/Modify

### New Files:
- `config/default.json`
- `config/local.json` (gitignored)
- `backend/websocket/WebSocketManager.js`
- `backend/connection/ConnectionManager.js`
- `backend/strategies/StrategyBase.js`
- `backend/strategies/RSIStrategy.js`
- `backend/strategies/SMAEMACrossoverStrategy.js`
- `backend/strategies/BBStrategy.js`
- `backend/strategies/index.js`
- `backend/strategies/Engine.js`
- `backend/config/ConfigManager.js`
- `backend/routes/config.js`
- `backend/routes/strategies.js`
- `backend/routes/symbols.js`
- `backend/routes/status.js`

### Modify:
- `backend/server.js` - integrate new routes and modules
- `.gitignore` - add `config/local.json`

### Install:
- `ws` package for WebSocket support in Node.js
