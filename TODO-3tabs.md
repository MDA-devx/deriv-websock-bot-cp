# TODO - 3 Tabs Implementation

> Status legend: ~~done~~ | in progress | pending

---

## STEP 1: Fix Critical Bugs

### 1.1 Fix `switchTab()` element IDs
- [ ] Update `app.js:1006-1019` — change `sidebar-trading` → `sidebar-trade`, `sidebar-estrategia` → `sidebar-strategy`, `trading-view` → `trade-view`, `estrategia-view` → `strategy-view`
- [ ] Also toggle `sidebar-analysis`, `sidebar-log-config`, `analysis-view`, `log-config-view` visibility
- [ ] Test: clicking each tab button shows correct sidebar and view

### 1.2 Fix analysis chart init element IDs
- [ ] Update `app.js:1036-1037` — change `estr-price-chart` → `analysis-price-chart`, `estr-rsi-chart` → `analysis-rsi-chart`
- [ ] Update all analysis chart reference IDs (`estr-symbol-display`, `estr-data-status`, `estr-candle-count`, `estr-count-num`, `estr-zoom-in`, `estr-zoom-out`, `estr-fit-content`, `estr-mark-mode`, `estr-mark-open`, `estr-mark-close`, `estr-clear-marks`, `estr-compare-stats`, `estr-compare-table`, `estr-backtest-summary`, `estr-logs`, `estr-marks-list`, `estr-mark-count`, `estr-optimizer-results`, `estr-optimizer-summary`, `estr-export-marks`, `estr-import-marks`, `estr-import-file`, `estr-run-optimizer`)
- [ ] Update HTML to add missing element IDs referenced by analysis JS code
- [ ] Test: switching to ANALYSIS tab initializes charts

### 1.3 Fix strategy selector ID in `updateIndicators()`
- [ ] Update `app.js:256` — change `document.getElementById('strategy')` → `document.getElementById('strategy-trade')`
- [ ] Search for all other references to `document.getElementById('strategy')` in app.js and update to correct ID per tab context
- [ ] Fix `evaluateTickAgainstLastCandle()` at `app.js:610` — same issue

### 1.4 Fix `syncRunningStrategyParams()` strategy selector
- [ ] Update `app.js:754` — change `document.getElementById('strategy')` to `document.getElementById('strategy-trade')`

### 1.5 Fix strategy load on page init
- [ ] Update `app.js:821-822` — change `document.getElementById('strategy')` to `document.getElementById('strategy-trade')`

### 1.6 Update analysis backtest strategy selector
- [ ] Update `runStrategyBacktest()` at `app.js:1266` — use `document.getElementById('strategy-analysis')` instead of `document.getElementById('strategy')`

### 1.7 Update optimizer strategy selector
- [ ] Update `runOptimizerScan()` at `app.js:1405` — use `document.getElementById('strategy-analysis')`

### 1.8 Add missing HTML IDs for analysis tab
- [ ] Add `estr-symbol-display`, `estr-data-status`, `estr-candle-count`, `estr-count-num` elements to `#analysis-view`
- [ ] Add zoom control buttons with IDs to analysis chart section
- [ ] Add backtest summary, optimizer results, optimizer summary, marks list, compare stats, compare table, logs containers to analysis view
- [ ] Add export/import marks buttons and hidden file input
- [ ] Add analysis indicator enable checkboxes (`estr-sma-enable`, `estr-ema-enable`, `estr-bb-enable`, `estr-rsi-enable`, `estr-stoch-enable`, `estr-macd-enable`)
- [ ] Add analysis indicator period inputs (`estr-sma-period`, `estr-ema-period`, `estr-bb-period`, `estr-rsi-period`, `estr-stoch-period`, `estr-rsi-high`, `estr-rsi-low`)
- [ ] Add optimizer range inputs (`opt-rsi-min`, `opt-rsi-max`, `opt-sma-min`, `opt-sma-max`)

---

## STEP 2: Fix ANALYSIS Tab Charts + Backtest

### 2.1 Make analysis charts fully functional
- [ ] Verify `initAnalysisCharts()` runs when ANALYSIS tab is selected
- [ ] Verify candle data displays on analysis chart
- [ ] Verify indicators display on analysis sub-chart
- [ ] Verify manual marks can be placed via chart clicks

### 2.2 Implement backtest duration slicing
- [ ] Before calling `/api/strategies/:name/backtest`, slice `dataHistory` to last N candles based on `#backtest-duration` value (30, 60, 360, 1440 minutes)
- [ ] Calculate N = duration / granularity (from `#timeframe` value)
- [ ] Pass sliced candles to backtest API call

### 2.3 Rename manual marks "open/close" → "up/down"
- [ ] Update mark type values from `'open'`/`'close'` to `'up'`/`'down'`
- [ ] Update `normalizeManualType()` function
- [ ] Update button text in HTML: "UP" and "DOWN" (already correct in HTML at lines 174-176)
- [ ] Update all mark-related logic to use new type names
- [ ] Re-export marks will use new format

### 2.4 Add read-only parameters display for ANALYSIS tab
- [ ] In HTML `#sidebar-analysis`, add a read-only indicators section (similar to TRADE tab)
- [ ] Show current analysis strategy params: SMA period, EMA period, RSI period + high/low, BB period
- [ ] These update when strategy changes but are not directly editable
- [ ] Use `#analysis-indicators-display` container with `<span>` elements

---

## STEP 3: Implement STRATEGY Tab Features

### 3.1 Add 15-minute snapshot mechanism
- [ ] Create snapshot state: `strategySnapshot = { data: [], timestamp: null }`
- [ ] Add `takeSnapshot()` function: copies current `dataHistory` + timestamp
- [ ] Start snapshot timer when connection established (every 15 min = 900000ms)
- [ ] Clear snapshot when disconnected or symbol changes
- [ ] Show last snapshot time in STRATEGY view

### 3.2 Build static strategy chart in STRATEGY view
- [ ] In HTML `#strategy-view`, create chart container with:
  - Price chart (`#strategy-price-chart`)
  - Sub-chart for RSI/STOCH/MACD (`#strategy-rsi-chart`)
  - Chart controls (zoom in/out, fit content)
- [ ] Create `initStrategyCharts()` function: creates candlestick series + indicator series (SMA, EMA, BB upper/mid/lower, RSI, Stoch, MACD, Signal)
- [ ] Create `updateStrategyCharts(snapshotData, signals)` function:
  - Set candle data from snapshot
  - Run indicator calculations on snapshot data
  - Display all indicator lines
  - Place CALL/PUT signal markers from backtest results

### 3.3 Run strategy on snapshot when STRATEGY tab opens
- [ ] On switching to STRATEGY tab:
  - Check if snapshot exists
  - Call backend `/api/strategies/:name/backtest` with snapshot data and strategy params from STRATEGY tab
  - Display results on the static chart
  - Show signal summary (total CALLs, PUTs, win/lose if applicable)

### 3.4 Strategy save/load with full params
- [ ] Enhance save: include all indicator params + enabled toggles + notes in exported JSON
- [ ] Enhance load: parse JSON and apply all params to form fields, redraw chart

---

## STEP 4: Implement ANALYSIS Tab Advanced Features

### 4.1 Manual marks analysis — find indicator similarities
- [ ] Implement `analyzeMarks()` function:
  - Group marks by type (up vs down)
  - For each group, collect indicator snapshots (RSI value, SMA value, BB position, Stoch, MACD)
  - Calculate min/max/mean for each indicator per group
  - Identify indicator ranges where up-marks cluster vs down-marks cluster
  - Generate a proposed strategy config with these indicator ranges as thresholds
- [ ] Display analysis results in a new section in ANALYSIS sidebar
- [ ] Add "Apply as New Strategy" button that fills STRATEGY tab params from analysis

### 4.2 Improve strategy — incremental optimization
- [ ] Implement `improveStrategy()` function:
  - Start from current strategy params (from `#strategy-analysis` or STRATEGY tab)
  - Generate variations: for each numeric param, try ±1, ±2 (small adjustments)
  - For each variation, run backtest via backend API
  - Score signals against existing manual marks
  - Track best-performing variation
  - Return top 5 improvements with their scores and param diffs
- [ ] Display results showing: original params → improved params, win rate change
- [ ] Add "Apply Improvement" button to update strategy params

### 4.3 Connect "ANALIZAR MARCAS" and "MEJORAR ESTRATEGIA" buttons
- [ ] Wire `#analyze-marks-btn` to `analyzeMarks()`
- [ ] Wire `#improve-strategy-btn` to `improveStrategy()`
- [ ] Add result display containers in HTML

---

## STEP 5: Polish and Cleanup

### 5.1 Ensure log isolation
- [ ] Verify TRADE/STRATEGY tabs don't have embedded log containers
- [ ] All logging goes to LOG-CONFIG tab only

### 5.2 Fix STRATEGY tab save/load strategy buttons
- [ ] Verify `#save-strategy-btn` exports all params (indicator periods, enabled toggles, notes)
- [ ] Verify `#load-strategy-btn` opens file picker and applies settings

### 5.3 Verify TRADE tab correctness
- [ ] Default strategy is multi-momentum preselected
- [ ] Indicators display is read-only
- [ ] CONNECT button enables START button
- [ ] START/STOP buttons toggle correctly
- [ ] Config section is NOT visible in TRADE sidebar

### 5.4 Test full flow
- [ ] Load page → TRADE tab visible
- [ ] Enter API token / App ID → Connect → candles load
- [ ] Switch to STRATEGY tab → static chart shows snapshot with indicators + signals
- [ ] Edit indicator params → visual updates
- [ ] Save strategy → load strategy → params restore
- [ ] Switch to ANALYSIS tab → charts initialize with candle data
- [ ] Place manual marks (up/down) on chart
- [ ] Run backtest → signals display on chart
- [ ] Run marks analysis → new strategy proposed
- [ ] Run strategy improvement → top variations displayed
- [ ] Switch to LOG-CONFIG → log entries visible, config toggles work

---

## File Change Summary

| File | Changes |
|---|---|
| `index.html` | Add missing analysis tab HTML elements (IDs for containers, inputs, buttons) |
| `index.html` | Add strategy chart containers |
| `index.html` | Add analysis read-only params display |
| `js/app.js` | Fix switchTab(), analysis chart IDs, strategy selector references |
| `js/app.js` | Add 15-min snapshot timer, takeSnapshot() |
| `js/app.js` | Add initStrategyCharts(), updateStrategyCharts() |
| `js/app.js` | Add analyzeMarks(), improveStrategy() |
| `js/app.js` | Fix backtest duration slicing |
| `js/app.js` | Rename open/close → up/down |
| `js/config.js` | Potentially add snapshot interval constant |
| `css/style.css` | Potentially add styles for new UI elements |
