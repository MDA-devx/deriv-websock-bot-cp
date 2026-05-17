# Instrucciones de uso de la app (Deriv Trading Bot)

## 1) Requisitos
- Node.js 18+ recomendado
- Conexión a internet (la app consume datos en tiempo real de Deriv por WebSocket)
- (Opcional) Token API de Deriv para funciones autenticadas

## 2) Instalación
Desde la raíz del proyecto:

```bash
npm install
```

## 3) Cómo iniciar la app
Opciones disponibles:

1. Inicio normal:
```bash
npm start
```

2. Modo desarrollo:
```bash
npm run dev
```

3. Dashboard en host personalizado:
```bash
npm run dashboard
```
Esto levanta el servidor en `http://dashboard.deriv:3002/` (si tienes hosts configurado).

## 4) Abrir la interfaz
- Local: `http://localhost:3002/`
- Dashboard: `http://dashboard.deriv:3002/index.html`

## 5) Flujo rápido recomendado
1. Selecciona **Símbolo** (por defecto `R_25`, Jump 25 Index).
2. (Opcional) Ingresa tu **API Token** o cárgalo con el ícono 📁.
3. Revisa **App ID** (por defecto `1089`).
4. Haz clic en **CONECTAR**.
5. Elige **Temporalidad** (1s, 1m, 5m, 15m, 1D).
6. Ajusta **estrategia e indicadores**.
7. Revisa señales en gráfico y logs.

## 6) Indicadores y configuración
Indicadores principales:
- SMA (periodo configurable)
- EMA (periodo configurable)
- BB (Bandas de Bollinger, periodo configurable)
- RSI (periodo + niveles high/low)
- Stochastic (en panel estrategia)
- MACD (en panel estrategia)

Configuraciones útiles:
- Auto-scroll
- Tooltip OHLC
- Sonido
- Min velas visibles

## 7) Panel ESTRATEGIA (mejoras recientes)
En la pestaña **ESTRATEGIA** ahora tienes:

1. Marcado manual de operaciones:
   - Modo marcado
   - Botones ABRIR / CERRAR
   - Limpieza de marcas

2. Backtest integrado:
   - Botón **Ejecutar backtest**
   - Resumen de resultados (trades, win rate, etc.)
   - Señales automáticas dibujadas para comparación

3. Exportar / importar marcas JSON:
   - **Exportar marcas** para guardar dataset manual
   - **Importar marcas** para volver a cargar sesiones de análisis

4. Optimizador de parámetros:
   - Escaneo RSI min/max
   - Escaneo SMA min/max
   - Ranking de resultados
   - Selección automática de mejor combinación detectada

5. Comparativa Auto vs Manual:
   - Coincidencias
   - Falsos positivos
   - Señales manuales no detectadas

## 8) API backend disponible
Con el servidor encendido:
- `GET /api/config` → leer configuración
- `POST /api/config` → actualizar configuración
- `GET /api/strategies` → listar estrategias
- `GET /api/strategies/:name` → metadata de estrategia
- `POST /api/strategies/:name/activate` → activar estrategia
- `POST /api/strategies/:name/deactivate` → desactivar estrategia
- `POST /api/strategies/:name/backtest` → ejecutar backtest por lote
- `GET /api/strategies/state` → estado del motor de estrategia
- `GET /api/strategies/state/history` → historial del motor
- `POST /api/strategies/state/reset` → reset de estado
- `GET /api/symbols` → listar símbolos
- `GET /api/status` → estado del servidor

Ejemplo:
- `http://localhost:3002/api/status`
- `http://localhost:3002/api/strategies`

## 9) Solución de problemas
1. No abre la app
   - Verifica que el servidor esté corriendo en puerto `3002`.
   - Revisa conflictos de puerto.

2. No llegan datos del mercado
   - Confirma internet.
   - Cambia símbolo o temporalidad.
   - Reconecta con el botón CONECTAR.

3. Token/API no funciona
   - Valida token vigente.
   - Revisa App ID.

4. `dashboard.deriv` no resuelve
   - Usa `http://localhost:3002/` o configura hosts.

5. Backtest/optimizador sin resultados
   - Asegúrate de tener velas cargadas.
   - Para optimizador, agrega o importa marcas manuales.

## 10) Recomendación de uso
Comienza con la configuración por defecto (R_25, 1m), ejecuta un backtest base, marca manualmente un conjunto pequeño y luego usa el optimizador para iterar parámetros con criterio.