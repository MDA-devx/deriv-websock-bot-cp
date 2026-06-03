# Implementation Plan

## Critical Bugs to Fix First

1. **`switchTab()` uses wrong element IDs** (`app.js:1006-1019`) — references Spanish IDs (`sidebar-trading`, `trading-view`) that don't exist in HTML (uses English: `sidebar-trade`, `trade-view`). Tab switching is broken.

2. **Analysis chart init uses wrong element IDs** (`app.js:1036-1037`) — references `estr-price-chart`, `estr-rsi-chart`, but HTML uses `analysis-price-chart`, `analysis-rsi-chart`. Analysis charts never initialize.

3. **`updateIndicators()` reads wrong strategy selector** (`app.js:256`) — reads `document.getElementById('strategy')` but trade tab selector is `#strategy-trade`.

## TRADE TAB — Most requirements already met
- Strategy selector (`#strategy-trade`) with 3 strategies ✅
- Read-only indicators display ✅
- Config hidden (in STRATEGY tab) ✅
- Log only in LOG-CONFIG tab ✅
- Need: default strategy combobox should initialize with multi-momentum selected and load its default params on page load

## STRATEGY TAB — Two features missing

| # | Requirement | Status |
|---|---|---|
| 1 | Same/mirrored strategy selector | ✅ Done |
| 2 | Editable indicators w/ toggles | ✅ Done |
| 3 | **Chart snapshot every 15min, data used for backtest** | ❌ Missing |
| 4 | **Strategy applied on static graph showing indicators + CALL/PUT signals** | ❌ Missing |
| 5 | Save strategy | ✅ Done |
| 6 | Load external strategy | ✅ Done |
| 7 | Strategy notes | ✅ Done |

**Work required:**
- **15-min snapshot**: Add a periodic timer (every 15min) that captures the current `dataHistory` snapshot and stores it for strategy view usage
- **Static strategy chart**: The STRATEGY view chart (`#strategy-chart`) currently empty. Need to:
  - Create chart series (candles + indicators)
  - Load the snapshot data
  - Run the selected strategy over the snapshot data (using backend `/api/strategies/:name/backtest`)
  - Display indicator lines + CALL/PUT signal markers on the static chart

## ANALYSIS TAB — Three features missing/need work

| # | Requirement | Status |
|---|---|---|
| 1 | Strategy loaded from STRATEGY tab, locally changeable | ⚠️ Partially done |
| 2 | Parameters read-only (like TRADE tab but with strategy params) | ❌ Missing |
| 3 | Backtest current tab strategy | ✅ Done (needs chart fix) |
| 4 | Backtest duration: 30m, 1h, 6h, 24h | ⚠️ UI exists but backtest uses all `dataHistory`, not sliced by duration |
| 5 | Timeframe candle same as trade | ✅ Done |
| 6 | Backtest save | ✅ Done |
| 7 | Backtest load | ✅ Done |
| 8 | Load signals on graph | ⚠️ Partially (blocked by analysis chart init bug) |
| 9 | Manual marks (up/down) | ⚠️ Uses "open/close" instead of "up/down" |
| 10 | **Manual marks analysis: find indicator similarities, create new strategy** | ❌ Missing |
| 11 | **Improve strategy: modify indicator values for better win/loss** | ❌ Missing |

**Work required:**
- **Fix analysis charts** (blocked by ID bug above)
- **Backtest duration slicing**: Before calling backend backtest, slice `dataHistory` to only the last N candles based on selected duration
- **Read-only params display**: Show strategy parameters (from current analysis strategy) as read-only values in the sidebar
- **Rename "open/close" → "up/down"** for manual marks
- **Manual marks analysis (feature 10)**: Build a function that:
  - Groups marks by type (up vs down)
  - For each group, finds common indicator value ranges (RSI range, SMA trend, BB position, etc.)
  - Generates a new strategy config from those ranges
  - Displays the proposed strategy to the user
- **Improve strategy (feature 11)**: Extend the existing optimizer to:
  - Start from current strategy params
  - Make small incremental adjustments (±1 to periods, ±2 to thresholds)
  - Run backtest for each variation
  - Score against manual marks
  - Return the best-performing variation

## LOG-CONFIG TAB — Mostly done
- Log container ✅ (needs to ensure it stays clean and doesn't get logs from other places)
- Config section ✅

## Summary of Implementation Order

| Step | Area | Effort |
|---|---|---|
| 1 | Fix critical bugs (switchTab, analysis chart IDs, strategy selector) | Small |
| 2 | Fix analysis charts init + duration slicing for backtest | Medium |
| 3 | Implement STRATEGY tab: 15-min snapshot + static chart with signals | Medium |
| 4 | Implement ANALYSIS tab: manual marks "up/down", marks analysis, strategy improvement | Large |
| 5 | Polish: read-only params display, rename open/close to up/down | Small |
