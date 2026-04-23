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
