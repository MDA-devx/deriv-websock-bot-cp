# Plan de Mejoras - Deriv Trading Bot

## 1. Procesos del Servidor (Backend)

### 1.1 WebSocket
- Gestionar conexiones WebSocket con Deriv API
- Reconexión automática en caso de desconexión
- Manejo de heartbeats/keep-alive
- Buffer de mensajes salientes

### 1.2 Conexión
- Autenticación con API token
- Validación de App ID
- Manejo de errores de conexión
- Control de estado de conexión (connected, disconnected, connecting, error)

### 1.3 WebServer
- Servir archivos estáticos (index.html)
- API REST para configuración
- Endpoints para estrategias
- Logging de solicitudes

### 1.4 Estrategias
- Clasebase Strategy con métodos abstractos
- Estrategia RSI (actual - ya implementada parcialmente)
- Estrategia SMA/EMA crossover
- Estrategia Bollinger Bands breakout
- Estrategia multi-indicador (combinación)
- Interfaz para agregar nuevas estrategias

### 1.5 Config
- Archivo de configuración (config.json)
- Parámetros configurables:
  - App ID
  - Timeframe por defecto
  - Períodos de indicadores
  - Niveles RSI (high/low)
  - symbols disponibles

---

## 2. Procesos del Frontend

### 2.1 Render
- Gráfico de precios (lightweight-charts)
- Gráfico RSI (panel inferior)
- Indicadores visuales (SMA, EMA, BB)
- Marcadores de señales (▲ CALL, ▼ PUT)
- Tooltip con información de vela

### 2.2 Input
- Panel lateral con configuración
- API Token (campo password)
- App ID (texto)
- Timeframe (dropdown)
- Períodos de indicadores (SMA, EMA, RSI, BB)
- Habilitar/deshabilitar indicadores (checkboxes)
- Niveles RSI high/low

### 2.3 StrategiesUI
- Lista de estrategias disponibles
- Selector de estrategia activa
- Parámetros específicos por estrategia
- Panel de resultados/señales
- Historial de trades

---

## 3. Addons (Mejoras Adicionales)

### 3.1 Scroll Automático al Final
- Auto-scroll cuando llega nueva vela
- Opción para habilitar/deshabilitar
- Botón manual "Ir al final"

### 3.2 Espacio al Final
- Añadir padding/espacio visible después de última vela
- Configurar cantidad de velas visibles a la derecha
- Mantener последняя vela centrada o al final

### 3.3 Zoom Limit
- Establecer zoom mínimo y máximo
- Evitar zoom excesivo (muy cerca/lejos)
- Zoom por defecto óptimo (ej: 50-200 velas)

### 3.4 Min 24 Candles on Screen
- Forzar mínimo de velas visibles
- Si hay menos de 24 velas, hacer zoom out automático
- Validar al cargar historial y al recibir nuevas velas

### 3.5 Scroll Bars
- Mostrar scrollbar horizontal en el gráfico
- Arrastrar para navegar en el tiempo
- Click en scrollbar para saltar secciones

### 3.6 1D View (Vista de 1 Día)
- Botón para view de 1 día
- Calcular timeframe necesario para 1 día visible
- Ajustar automáticamente granularity

### 3.7 Zoom In/Out
- Botones +/- para zoom
- Ctrl + scroll del mouse
- Atajos de teclado (Plus/Minus)

### 3.8 Split View
- Dividir pantalla en 2 paneles
- Cada panel con su propio timeframe
- Comparar diferentes temporalidades
- Sincronización de time scales (opcional)

---

## 4. Orden de Implementación Sugerida

### Fase 1: Backend (Fundamentos)
1. Configuración centralizada
2. WebServer con API REST
3. Gestión de estrategias en backend

### Fase 2: Frontend Core (MejorasUI)
1. Zoom limits y min candles
2. Scrollbars
3. Space al final

### Fase 3: Frontend Advanced
1. Split view
2. 1D view
3. Zoom in/out buttons

### Fase 4: Integración
1. Conectar frontend con backend API
2. Estrategias configurables desde UI
3. Guardar/cargar configuración

---

## 5. Notas Técnicas

### lightweight-charts API
- `chart.timeScale().setVisibleRange({ from, to })` - establecer rango visible
- `chart.timeScale().getVisibleRange()` - obtener rango actual
- `chart.timeScale().fitContent()` - ajustar contenido
- `chart.timeScale().options` - opciones de timeScale

### Deriv WebSocket
- `ticks_history` para historial
- `ohlc` para actualizaciones en tiempo real
- `granularity` : 1, 5, 15, 60, 300, 900, etc.
- `subscribe: 1` para suscripción continua

### Estado Inicial
- Frontend ya tiene implementaciones parciales en index.html
- Backend ya tiene servidor Express básico
- Indicators en frontend/js/modules/indicators.js