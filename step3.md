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

---

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

- `index.html` - Add zoom limits, 1D view button, split view toggle