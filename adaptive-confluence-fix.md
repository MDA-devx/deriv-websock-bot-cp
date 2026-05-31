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

*When you are ready, you can load this file into the `todo` tool to track progress automatically, or simply follow the list manually.*