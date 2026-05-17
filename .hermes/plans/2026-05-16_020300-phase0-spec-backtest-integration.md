# Fase 0 completada — Preparación técnica

## 1) Inventario del estado actual

### Frontend (activo)
- UI principal: `index.html`
  - Vista ESTRATEGIA existe (`#estrategia-view`) con chart de análisis y controles de indicadores.
  - Sidebar ESTRATEGIA incluye marcado manual (`ABRIR/CERRAR`), listado de marcas y botón limpiar.
- Lógica principal: `js/app.js`
  - Dataset único en memoria: `dataHistory` (velas `{time,open,high,low,close}` con `time` en epoch segundos).
  - Marcas manuales: `estrMarks` con estructura:
    - `{ time, type, price, indicators }`
    - `type` actual: `'open' | 'close'`
  - Render de markers manuales en chart análisis:
    - `updateAnalysisMarkers()` → `estrCandleSeries.setMarkers(...)`
    - visual: open=arrowUp, close=arrowDown
  - Indicadores de análisis:
    - `updateAnalysisIndicators()` recalcula SMA/EMA/RSI/BB/Stoch/MACD sobre todo `dataHistory`.
  - Captura de marcas manuales por click:
    - `estrPriceChart.subscribeClick(...)` + `getIndicatorValuesAt(time)`.

### Backend (parcial, ya existe base útil)
- Servidor Express: `backend/server.js`
  - API montada en `/api/strategies` (ya disponible).
- Rutas de estrategia: `backend/routes/strategies.js`
  - `GET /api/strategies` lista estrategias
  - `GET /api/strategies/:name` metadata
  - endpoints de activar/desactivar/estado pensados para tiempo real
- Engine: `backend/strategies/Engine.js`
  - soporta `setHistory(candles)` y `analyze()`
  - actualmente orientado a análisis incremental, no a backtest batch con salida por vela
- Registro: `backend/strategies/index.js`
  - actualmente solo `multi-momentum` registrado (aunque existen archivos RSI/BB/SMA-EMA)

## 2) Contrato unificado de señales (propuesto)

Objetivo: mismo formato para señales automáticas en frontend/backend y comparativa con marcas manuales.

```json
{
  "time": 1715823000,
  "type": "CALL",
  "price": 1234.56,
  "strategyId": "multi-momentum",
  "params": {"rsiPeriod": 7, "smaFast": 9, "smaSlow": 21},
  "source": "backend-backtest",
  "reason": "CALL (3/5): RSI<30, MACD↑, BB-Bottom",
  "confidence": 0.6,
  "meta": {
    "barIndex": 152,
    "indicatorSnapshot": {
      "rsi": 28.7,
      "stochK": 17.4,
      "macdHist": 0.03
    }
  }
}
```

### Normalización de campos
- `time`: integer epoch en segundos (UTC) obligatorio.
- `type`: `CALL | PUT` (mapear `call/put` internos a mayúsculas en borde API).
- `price`: normalmente `close` de la vela donde dispara.
- `strategyId`: id técnico (`multi-momentum`, `rsi`, `bb`, `sma-ema-crossover`).
- `source`: `backend-backtest | frontend-backtest | manual`.

### Compatibilidad con marcas manuales
- Mantener `estrMarks` actual para no romper UI.
- Añadir normalización en comparador:
  - `open -> CALL`
  - `close -> PUT`

## 3) Puente frontend-backend (decisión técnica para Fase 1)

### Recomendado
Agregar endpoint REST de backtest batch:
- `POST /api/strategies/:name/backtest`

Request:
```json
{
  "candles": [{"time":1715820000,"open":1,"high":2,"low":0.5,"close":1.5}],
  "params": {"minConfirmations":3}
}
```

Response:
```json
{
  "strategyId": "multi-momentum",
  "processed": 500,
  "signals": [
    {"time":1715823000,"type":"CALL","price":1234.56,"strategyId":"multi-momentum","source":"backend-backtest"}
  ],
  "stats": {
    "signalsCount": 42
  }
}
```

### Por qué esta opción
- Evita duplicar lógica compleja de estrategias en frontend.
- Fuente única de verdad para señales automáticas.
- Facilita optimizador de parámetros (Fase 2) reusando endpoint.

## 4) Checklist de timestamps / alineación temporal

Checklist obligatorio antes de comparar señales vs marcas:

1. Unidad temporal única
- [ ] Confirmar que todo usa epoch segundos (`number`).
- [ ] Rechazar milisegundos en payload (`time > 1e12` → normalizar/dividir).

2. Integridad de velas
- [ ] Orden ascendente por `time`.
- [ ] Sin duplicados por `time`.
- [ ] Consistencia OHLC (`high>=max(open,close)` y `low<=min(open,close)`).

3. Alineación entre fuentes
- [ ] WS histórico y ticks convertidos al mismo timeframe.
- [ ] CSV importado normalizado al mismo timezone/base epoch.
- [ ] Cache restaurada sin desplazar `time`.

4. Política de matching (comparativa)
- [ ] Match estricto por vela: `signal.time === mark.time`.
- [ ] Modo tolerante opcional: ±1 vela configurable.
- [ ] Reportar explícitamente qué modo se usó en métricas.

5. Render
- [ ] Markers automáticos y manuales usan el mismo `time` final.
- [ ] Verificar visually en puntos borde (primera/última vela).

## 5) Archivos a tocar en Fase 1 (pre-identificados)
- `backend/routes/strategies.js` (nuevo endpoint `/backtest`)
- `backend/strategies/Engine.js` (método batch para recorrer historial)
- `backend/strategies/index.js` (exponer más estrategias si aplica)
- `index.html` (botón “Ejecutar backtest”, área comparativa)
- `js/app.js` (invocación API, render markers automáticos, comparativa)

## 6) Criterios de salida de Fase 0 (cumplidos)
- [x] Inventario técnico realizado
- [x] Contrato de señal definido
- [x] Decisión de puente frontend-backend tomada
- [x] Checklist de timestamps documentado
