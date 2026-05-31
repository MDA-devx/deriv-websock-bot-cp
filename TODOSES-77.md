# TODOSES-77 – Deep Dive Task Specification

## T2. Implement signal markers (▲ CALL / ▼ PUT) on the Lightweight‑Charts price chart

### Objective
Add clear visual markers that indicate a **CALL** (▲) or **PUT** (▼) signal directly on the price chart, enabling traders to see recommendations at a glance.

### Detailed Implementation Steps

1. **Marker Data Structure**
   - Extend the marker object to include:
     - `time`: timestamp of the signal candle.
     - `position`: `'aboveBar'` or `'belowBar'`.
     - `color`: green (`#089981`) for CALL, red (`#f23645`) for PUT.
     - `shape`: `'arrowUp'` for CALL, `'arrowDown'` for PUT.
     - `text`: `'CALL'` or `'PUT'` (can be localized later).
     - `labelTextColor` & `labelBackgroundColor` matching the marker color.
   - Example marker objects:
     ```js
     const callMarker = {
       time: signalTime,
       position: 'aboveBar',
       color: '#089981',
       shape: 'arrowUp',
       text: 'CALL',
       labelTextColor: '#089981',
       labelBackgroundColor: '#089981',
     };
     
     const putMarker = {
       time: signalTime,
       position: 'belowBar',
       color: '#f23645',
       shape: 'arrowDown',
       text: 'PUT',
       labelTextColor: '#f23645',
       labelBackgroundColor: '#f23645',
     };
     ```

2. **Signal Integration**
   - In `processMultiSignals(result)`:
     - Detect `result.signal === 'call'` or `'put'`.
     - Build the appropriate marker object using the signal’s timestamp.
     - Push the marker onto `candleSeries.markers()` via `candleSeries.setMarkers([newMarker])`.
   - Ensure the marker array is retained across calls to avoid duplicates.

3. **Persistence Across Interactions**
   - Listen to `priceChart.subscribeCrosshairMove` (or a similar event) and re‑apply stored markers if the chart is scrolled/zoomed.
   - Store markers in a dedicated array (`currentMarkers`) and call `candleSeries.setMarkers(currentMarkers)` each time the series is updated.

4. **Styling & Visual Clarity**
   - Use Lightweight‑Charts’ built‑in rendering for arrows; no extra CSS required.
   - Ensure the marker’s label is visible on both light and dark backgrounds by setting contrasting `labelTextColor`.
   - Add a subtle drop‑shadow or outline if the chart theme makes the arrow hard to see.

5. **Accessibility / Tooltips**
   - Re‑use the existing tooltip component to show additional context when hovering over a marker (e.g., strategy name, indicator values).
   - Populate tooltip fields with `result.reason` or other relevant metadata.

6. **Testing Checklist**
   - ✅ Marker appears immediately after a signal is processed.
   - ✅ Marker persists while panning/zooming the chart.
   - ✅ Separate markers for CALL and PUT are rendered with correct colors/shapes.
   - ✅ No duplicate markers are added on rapid consecutive signals.
   - ✅ Tooltip displays useful context on hover.
   - ✅ Works across different time‑frames and chart resolutions.

### Potential Improvements (Future Enhancements)

- **Animated Appearance** – Add CSS transition or Lightweight‑Charts’ animation API to fade‑in new markers.
- **Configurable Styles** – Allow users to set custom colors/shapes per strategy via the settings panel.
- **Marker History Panel** – Add a small sidebar that logs recent markers with timestamps for quick review.
- **Auto‑Scroll on New Marker** – When the “auto‑scroll” setting is enabled, automatically scroll the chart to keep the newest marker in view.
- **Customizable Text** – Expose a configuration option to replace “CALL/PUT” with user‑defined labels (e.g., “Buy”, “Sell”).
- **Export/Import Markers** – Ensure markers are included in the existing Export/Import JSON payload (linked to T4).

---

### Next Tasks (for reference)

- **T3.** Create result summary table below the chart (granularity, candles processed, success flag, signal counts, first/last epoch, etc.).
- **T4.** Add Export Marks and Import Marks buttons, hidden file input, and functions `exportMarksJson()` / `importMarksJson()` in `js/app.js`.
- **T5.** Build Parameter‑scan optimizer UI – RSI & SMA range inputs, “Escanear parámetros” button, and result panels (`estr‑optimizer‑summary`, `estr‑optimizer‑results`).
- **T6.** Implement optimizer logic in `js/app.js`: `buildOptimizerParamSets()`, `scoreSignalsAgainstMarks()`, `runOptimizerScan()` and bind button listener.
- **T7.** Add wrapper script `hermes‑here` (executable) and `.hermes‑session` file to auto‑resume the Hermes session.
- **T8.** Verify all new DOM element IDs are unique (no duplicate IDs across tabs).
- **T9.** Run low‑priority back‑test (`nice -n 5 ionice -c2 node backtest_adaptive_confluence_1440.mjs`) and refresh browser to confirm markers, table, optimizer UI.
- **T10.** Commit the changes with a concise message (e.g., “Re‑add adaptive‑confluence UI enhancements after rollback”).
