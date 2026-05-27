# Organized TODOSES‑88 Tasks

## 1. UI Enhancements
- [ ] T2. Implement signal markers (▲ CALL / ▼ PUT) on the Lightweight‑Charts price chart (pending)
- [ ] T3. Create result summary table below the chart (granularity, candles processed, success flag, signal counts, first/last epoch, etc.) (pending)
- [ ] T4. Add Export Marks and Import Marks buttons, hidden file input, and functions `exportMarksJson()` / `importMarksJson()` in `js/app.js` (pending)

## 2. Parameter‑Scan Optimizer
- [ ] T5. Build Parameter‑scan optimizer UI – RSI & SMA range inputs, “Escanear parámetros” button, and result panels (`estr‑optimizer‑summary`, `estr‑optimizer‑results`) (pending)
- [ ] T6. Implement optimizer logic in `js/app.js`: `buildOptimizerParamSets()`, `scoreSignalsAgainstMarks()`, `runOptimizerScan()` and bind button listener (pending)

## 3. Testing & Validation
- [ ] T9. Run low‑priority back‑test (`nice -n 5 ionice -c2 node backtest_adaptive_confluence_1440.mjs`) and refresh browser to confirm markers, table, optimizer UI (pending)

## 4. Wrap‑Up & Deployment
- [ ] T7. Add wrapper script `hermes‑here` (executable) and `.hermes‑session` file to auto‑resume the Hermes session (pending)
- [ ] T8. Verify all new DOM element IDs are unique (no duplicate IDs across tabs) (pending)
- [ ] T10. Commit the changes with a concise message (e.g., “Re‑add adaptive‑confluence UI enhancements after rollback”) (pending)

*Legend:* `[x]` = completed (verified), `[ ]` = pending/not yet implemented.