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
