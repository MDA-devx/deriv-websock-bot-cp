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


---

# Step 2: Frontend Processes Development

## 2.1 Render

### Current State
- Lightweight charts already implemented in `index.html`
- Price chart and RSI chart panels exist
- Indicators (SMA, EMA, BB) are calculated in frontend
- Markers for signals are drawn using `createPriceLine()`

### Steps:

1. **Chart Enhancement - Tooltip with candle info**
   - Create tooltip showing: Open, High, Low, Close, Volume
   - Show on hover/drag over candles
   - Position tooltip near cursor
   - Style with semi-transparent background, on-off set in config

2. **Chart Enhancement - Crosshair info**
   - Show OHLC values in crosshair label
   - Display time in human-readable format
   - Show RSI value when hovering RSI chart

3. **Chart Enhancement - Price line labels**
   - Show current price on right axis
   - Show SMA/EMA values when hovering lines
   - Style indicator values in their colors

---

## 2.2 Input

### Current State
- Sidebar with API Token, App ID, Timeframe already exists
- Indicator periods (SMA, EMA, RSI, BB) with checkboxes exist
- RSI high/low thresholds exist
- Connect button exists

### Steps:

1. **Input Group - Symbols**
   - Add dropdown to select symbol (R_10, R_25, R_50, R_75, R_100)
   - Fetch available symbols from `/api/symbols`
   - Cache symbols list

2. **Input Group - Timeframe Presets**
   - Add quick buttons: 1s, 5s, 15s, 1m, 5m, 15m
   - Visual indicator of current timeframe
   - Highlight active timeframe

3. **Input Group - Strategy Selector**
   - Dropdown to select trading strategy
   - Load params from `/api/strategies/:name`
   - Show strategy description

4. **Input Group - Trade Parameters** (relyes on strategy})
   - Stake amount input
   - Martingale options (multiplier, max iterations)
   - TP/SS (Take Profit / Stop Loss) levels

 
5. **Settings Panel** (not changeable)
   - Auto-scroll toggle
   - Min candles setting (default 24)
   - Zoom limits
   - Space at end setting

6. **Input Validation**
   - Validate App ID format
   - Validate API token format
   - Show error messages inline
   - Disable connect until valid

---

## 2.3 StrategiesUI

### Current State
- Signals are logged in `#logs-container`
- Markers are drawn on chart
- No explicit strategy selection UI

### Steps:

1. **Strategy Panel - Active Strategy Display**
   - Show current strategy name
   - Show strategy parameters
   - Show status (active/inactive)
   - Activate/deactivate button
   - Import strategy

2. **Strategy Panel - Results**
   - Show last signal (CALL/PUT)
   - Show signal reason
   - Show timestamp
   - Show win/loss streak

3. **Strategy Panel - Signal History**
   - Table of recent signals
   - Timestamp, type, price, result
   - Filter by date
   - Export to CSV

4. **Strategy Panel - Statistics**
   - Total signals today
   - Win rate (last N signals)
   - Average signal duration
   - Best/worst streak

5. **Strategy Panel - Alerts**
   - Browser notifications for signals
   - Sound alert option
   - Visual flash on signal

---

## Files to Modify

### Modify:
- `index.html` - Add input groups, strategy panel, tooltips
- `frontend/js/app.js` - Move/update indicator calculations
- `frontend/css/style.css` - Add styles for new UI elements

### Create:
- `frontend/js/charts/TooltipManager.js` - Handle chart tooltips
- `frontend/js/ui/InputPanel.js` - Input panel logic
- `frontend/js/ui/StrategyPanel.js` - Strategy results UI

---

## Implementation Order

1. **Render** - Tooltips and crosshair info
2. **Input** - Symbol selector, strategy selector, trade params
3. **StrategiesUI** - Results panel, statistics

---

## Notes

### Lightweight Charts API for Tooltip
```javascript
chart.subscribeCrosshairMove(param => {
  // param.point.x, param.point.y
  // param.time - current time
  // param.seriesData - data at position
});
```

### Timeframe Options
- tick: 1
- 15s: 15
- 1m: 60
- 5m: 300
- 15m: 900
- 1h: 3600
- 4h: 14400


---

# Step 3: Addons Development

## Current State Analysis
- **3.1 Scroll Auto** - Disabled (removed), needs option in settings
- **3.2 Space at End** - Implemented via rightOffset
- **3.3 Zoom Limit** - Need to implement min/max
- **3.4 Min 24 Candles** - Implemented
- **3.5 Scroll Bars** - Built-in to lightweight-charts
- **3.6 1D View** - Not implemented
- **3.7 Zoom In/Out** - Buttons exist
- **3.8 Split View** - Not implemented

---

## 3.1 Scroll Automático al Final (Enable/Disable)

### Steps:
1. Add setting checkbox for auto-scroll (already exists in HTML)
2. Re-enable the auto-scroll on new candle
3. Add manual "Go to end" button

### Code Changes:
```javascript
// Enable auto-scroll on new candle (when checkbox checked)
if (document.getElementById('auto-scroll').checked) {
    scrollToEnd();
}
```

---

## 3.2 Espacio al Final

Already implemented via rightOffset - no changes needed.

---

## 3.3 Zoom Limit

### Steps:
1. Add min/max zoom level configuration
2. Prevent excessive zoom in/out
3. Add indicator showing current zoom level

### Code:
```javascript
const ZOOM_LIMIT = { min: 10, max: 200 };

function clampZoom(offset) {
    return Math.max(ZOOM_LIMIT.min, Math.min(ZOOM_LIMIT.max, offset));
}
```

---

## 3.4 Min 24 Candles on Screen

Already implemented - no changes needed.

---

## 3.5 Scroll Bars

Built-in to lightweight-charts - no changes needed.

---

## 3.6 1D View (Vista de 1 Día)

### Steps:
1. Add button/v option for 1 day view
2. Calculate required candles for 1 day at current timeframe
3. Set zoom to show exactly 1 day

### Code:
```javascript
function set1DayView() {
    const gran = parseInt(document.getElementById('timeframe').value) || 60;
    const secondsPerDay = 86400;
    const candlesNeeded = secondsPerDay / gran;
    priceChart.timeScale().applyOptions({ rightOffset: candlesNeeded });
}
```

---

## 3.7 Zoom In/Out

Buttons already exist - they use rightOffset. No changes needed.

---imp	

## 3.8 Split View

### Steps:
1. Add "Split View" toggle button
2. Create second chart container
3. Allow different timeframe per panel
4. Sync time scales option

### Files to Modify:
- `index.html` - Add split view HTML and button
- Add new chart initialization logic

---

## Implementation Order

1. **Zoom Limit** - Prevent extreme zoom
2. **1D View** - Quick time navigation  
3. **Re-enable Auto-scroll** - Optional feature
4. **Split View** - Advanced feature (optional)

---

## Files to Modify

- `index.html` - Add zoom limits, 1Day(1D) view button, split view toggle


---

# 2DOS Global — Deriv Trading Bot

> Formato reconocible por agentes: `- [ ]` = pendiente, `- [x]` = completado.
> Tags: `@area`, `@priority`, `@depends`, `@effort`

---

## Fase 1 — Backtest automatizado

- [ ] **Integrar estrategias en pestaña ESTRATEGIA**
  @area:backend+frontend @priority:high @effort:medium
  Conectar el motor de estrategias (Multi-Momentum, RSI, BB, SMA/EMA Crossover) con la vista de análisis para ejecutar backtest sobre datos históricos. Las señales generadas deben superponerse en el gráfico de análisis como markers, comparables con las marcas manuales.

- [ ] **Botón "Ejecutar backtest" en toolbar ESTRATEGIA**
  @area:frontend @priority:high @effort:small
  Añadir botón que ejecute la estrategia seleccionada sobre todo el `dataHistory` y dibuje sus señales (CALL/PUT) como markers translúcidos en el chart de análisis.

- [ ] **Comparativa: señales automáticas vs marcas manuales**
  @area:frontend @priority:medium @effort:medium
  Mostrar tabla comparativa: para cada marca manual, indicar si la estrategia generó señal en esa misma vela y si coincidió en dirección (CALL/PUT). Métricas: aciertos, fallos, omisiones, falsos positivos.

---

## Fase 2 — Optimización de parámetros

- [ ] **Optimizador de parámetros scan**
  @area:frontend @priority:high @effort:large
  Dado un conjunto de marcas manuales (ground truth), iterar sobre rangos de parámetros de indicadores (ej. RSI periodo 5-21, SMA 10-50) para encontrar la configuración que maximice aciertos. Mostrar resultados en heatmap o tabla.

- [ ] **Exportar/Importar marcas manuales (JSON)**
  @area:frontend @priority:medium @effort:small
  Botones para descargar `estrMarks` como JSON y recargarlos después. Preserva: time, type, price, indicator values.

---

## Fase 3 — Carga de datos externos

- [ ] **Cargar CSV en pestaña ESTRATEGIA**
  @area:frontend @priority:medium @effort:medium
  Botón para cargar archivos CSV con velas históricas (formato: time,open,high,low,close). Los datos cargados reemplazan `dataHistory` en la vista de análisis. Permite backtest sin conexión WebSocket.

- [ ] **Cargar datos desde WebSocket offline (cache)**
  @area:frontend @priority:low @effort:medium
  Persistir `dataHistory` en localStorage o IndexedDB al desconectar, para poder analizar datos de sesiones anteriores.

---

## Fase 4 — Métricas de rendimiento

- [ ] **Dashboard de métricas**
  @area:frontend @priority:medium @effort:medium
  Panel con: win rate, profit factor, ratio reward/risk, Sharpe ratio, drawdown máximo, número de operaciones. Calculado sobre marcas manuales y/o señales automáticas.

- [ ] **Gráfico de equity curve**
  @area:frontend @priority:low @effort:small
  Línea de equity acumulada basada en resultados de marcas manuales (asumiendo riesgo fijo por operación).

---

## Fase 5 — UX / Calidad de vida

- [ ] **Deshacer marca individual**
  @area:frontend @priority:low @effort:small
  Click en marca del gráfico para eliminar (ya implementado en lista del sidebar, extender al marker del chart).

- [ ] **Tooltip en análisis con valores de indicadores**
  @area:frontend @priority:low @effort:small
  Mostrar tooltip al hacer hover en el chart de análisis con valores de todos los indicadores en ese punto (similar al tooltip de trading pero con datos extra).

- [ ] **Sincronizar zoom/scroll entre trading y análisis**
  @area:frontend @priority:low @effort:small
  Botón opcional para que ambos charts compartan la misma vista (time range y zoom).

---

## Notas técnicas

- `estrMarks` se almacena en memoria (array global). No hay persistencia aún.
- Los indicadores se calculan desde cero en cada llamada a `updateAnalysisIndicators()` — considerar memoización si hay problemas de performance con muchos datos.
- Las estrategias del backend (`backend/strategies/`) no están conectadas a la UI de frontend. Requiere puente vía WebSocket o API REST.

---

*Generado: 2026-05-16. Última revisión: —*

---

# Re‑implement Adaptive‑Confluence UI Enhancements

The previous commit introduced several UI components for the *adaptive‑confluence* strategy that were lost after a rollback.  Below is a **task‑first execution plan** that can be fed directly into the `todo` tool (or simply followed manually) to recreate the missing pieces.

---

## Task list
| ID | Task | Status |
|----|------|--------|
| T1 | Add **Back‑test launch button** to `index.html` and wire it to a new JS handler in `frontend/js/app.js`. | pending |
| T2 | Implement **signal markers** (▲ CALL / ▼ PUT) on the Lightweight‑Charts price chart. | pending |
| T3 | Create a **result summary table** below the chart that displays granularity, candles processed, success flag, signal counts, first/last epoch, etc. | pending |
| T4 | Add **Export Marks** and **Import Marks** buttons, hidden file input, and corresponding functions `exportMarksJson()` / `importMarksJson()` in `js/app.js`. | pending |
| T5 | Build the **Parameter‑scan optimizer UI** – input fields for RSI & SMA ranges, “Escanear parámetros” button, and result panels (`estr‑optimizer‑summary`, `estr‑optimizer‑results`). | pending |
| T6 | Implement optimizer logic in `js/app.js`: functions `buildOptimizerParamSets()`, `scoreSignalsAgainstMarks()`, `runOptimizerScan()` and bind the button click listener. | pending |
| T7 | Add the **wrapper script** `hermes‑here` (executable) and the hidden file `.hermes‑session` so that running `./hermes‑here` automatically resumes the current Hermes session. | pending |
| T8 | Verify all new DOM element IDs are unique and that event listeners are correctly attached (search for duplicate IDs). | pending |
| T9 | Run a low‑priority back‑test (`nice -n 5 ionice -c2 node backtest_adaptive_confluence_1440.mjs`) and refresh the browser to confirm markers, table, and optimizer UI appear as expected. | pending |
| T10 | Commit the changes (if using git) with a concise message: "Re‑add adaptive‑confluence UI enhancements after rollback". | pending |

---

## Execution notes
- **Low‑priority execution**: for any long‑running command (e.g., the back‑test script) honor the user’s preference by prefixing with `nice -n 5 ionice -c2`.
- **File locations**:
  - UI markup lives in `/home/salmarina/deriv/index.html`.
  - JavaScript logic lives in `/home/salmarina/deriv/frontend/js/app.js`.
  - The wrapper script should be created at `/home/salmarina/deriv/hermes‑here` (make executable with `chmod +x`).
  - The session‑ID file is `/home/salmarina/deriv/.hermes‑session`.
- **Testing**: after completing T1‑T6, open the app in a browser, hit the back‑test button, and ensure the chart displays the ▲/▼ markers and the summary table. Then use the Export/Import buttons to save and reload manual marks, and finally run the optimizer to see the top‑10 parameter combos.

---


