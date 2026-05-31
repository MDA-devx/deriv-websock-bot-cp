import { calculateSMA, calculateEMA, calculateRSI, calculateBB, calculateStochastic, calculateMACD } from '../frontend/js/modules/indicators.js';
import { analyzeMultiIndicators, detectDojiSignal } from '../frontend/js/modules/multi-indicators.js';
import { CONFIG } from './config.js';

// ============================================
// State Management - Centralized State Object
// ============================================
const state = {
  // Connection state
  ws: null,
  isConnected: false,
  reconnectAttempts: 0,
  lastConnectedTime: null,
  
  // Market data
  currentSymbol: 'R_25',
  dataHistory: [],
  
  // Trade signals
  signalHistory: [],
  callCount: 0,
  putCount: 0,
  winCount: 0,
  loseCount: 0,
  pendingSignals: [],
  signalTimeouts: {},
  positionOpen: false,
  positionTimer: null,
  positionTimeLeft: 60,
  activeIndicator: null,
  activeSignalType: null,
  updateInterval: null,
};

// Legacy globals for backward compatibility
let priceChart, rsiChart, candleSeries, smaSeries, emaSeries, bbUpperSeries, bbMiddleSeries, bbLowerSeries, rsiSeries, stochSeries, macdSeries, macdSignalSeries;
let ws = null, isConnected = false, dataHistory = [];
let currentSymbol = 'R_25';

// Analysis tab globals
let currentTab = 'trading';
let estrMarks = [];
let tradingMarkers = [];
let estrMarkType = 'open';
let estrAutoSignals = [];

const chartOptions = {
    layout: { backgroundColor: '#0d1117', textColor: '#e6edf3' },
    grid: { 
        vertLines: { color: '#21262d', style: 1 }, 
        horzLines: { color: '#21262d', style: 1 },
        crossings: false
    },
    crosshair: { 
        mode: LightweightCharts.CrosshairMode.Normal, 
        vertLine: { color: '#58a6ff', width: 1, style: 0, labelBackgroundColor: '#1f6feb' }, 
        horzLine: { color: '#58a6ff', width: 1, style: 0, labelBackgroundColor: '#1f6feb' } 
    },
    rightPriceScale: { 
        borderColor: '#30363d',
        scaleMargins: { top: 0.1, bottom: 0.1 }
    },
    timeScale: { 
        borderColor: '#30363d',
        timeVisible: true, 
        secondsVisible: true, 
        visible: true,
        rightOffset: 24,
        barSpacing: 8
    },
    handleScale: { axisPressedMouseMove: true },
    handleScroll: { vertTouchDrag: false }
};

console.log('[APP] Script loaded, LightweightCharts:', typeof LightweightCharts);
console.log('[APP] calculateSMA:', typeof calculateSMA);
console.log('[APP] calculateEMA:', typeof calculateEMA);
console.log('[APP] calculateRSI:', typeof calculateRSI);
console.log('[APP] calculateBB:', typeof calculateBB);

function initCharts() {
    console.log('[CHART] initCharts() called');
    const pContainer = document.getElementById('price-chart');
    const rContainer = document.getElementById('rsi-chart');
    console.log('[CHART] Containers found, price:', !!pContainer, 'rsi:', !!rContainer);
    
    pContainer.innerHTML = `
        <div class="chart-label">${document.getElementById('symbol').value} INDEX</div>
        <div class="chart-controls">
            <button id="zoom-out">-</button>
            <button id="zoom-in">+</button>
            <button id="fit-content">⊡</button>
            <button id="toggle-results">📊</button>
        </div>`;
    rContainer.innerHTML = '<div class="chart-label">RSI / MACD</div>';

    pContainer.style.minHeight = '300px';
    rContainer.style.minHeight = '100px';

    document.getElementById('zoom-in').onclick = () => {
        const pOpts = priceChart.timeScale().options();
        const newBarSpacing = Math.min(50, (pOpts.barSpacing || 8) + 2);
        priceChart.timeScale().applyOptions({ barSpacing: newBarSpacing });
        rsiChart.timeScale().applyOptions({ barSpacing: newBarSpacing });
    };
    document.getElementById('zoom-out').onclick = () => {
        const pOpts = priceChart.timeScale().options();
        const newBarSpacing = Math.max(4, (pOpts.barSpacing || 8) - 2);
        priceChart.timeScale().applyOptions({ barSpacing: newBarSpacing });
        rsiChart.timeScale().applyOptions({ barSpacing: newBarSpacing });
    };
    document.getElementById('fit-content').onclick = () => {
        priceChart.timeScale().fitContent();
        rsiChart.timeScale().fitContent();
        const minCandles = parseInt(document.getElementById('min-candles').value) || 24;
        setTimeout(() => {
            const pOpts = priceChart.timeScale().options();
            priceChart.timeScale().applyOptions({ rightOffset: clampZoom(minCandles), barSpacing: 8 });
            rsiChart.timeScale().applyOptions({ rightOffset: clampZoom(minCandles), barSpacing: 8 });
        }, 50);
    };

    console.log('[CHART] Creating price chart...');
    priceChart = LightweightCharts.createChart(pContainer, { ...chartOptions, height: pContainer.clientHeight || 300 });
    console.log('[CHART] Price chart created:', !!priceChart);
    rsiChart = LightweightCharts.createChart(rContainer, { ...chartOptions, height: rContainer.clientHeight || 100 });
    console.log('[CHART] RSI chart created:', !!rsiChart);

    candleSeries = priceChart.addCandlestickSeries({
        upColor: '#089981', downColor: '#f23645',
        borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645',
    });
    console.log('[CHART] Candle series:', !!candleSeries);
    
    smaSeries = priceChart.addLineSeries({ color: '#2962ff', lineWidth: 1, title: 'SMA' });
    emaSeries = priceChart.addLineSeries({ color: '#f23645', lineWidth: 1, title: 'EMA' });
    bbUpperSeries = priceChart.addLineSeries({ color: '#00bcd4', lineWidth: 1, lineStyle: 0, title: 'BB Upper' });
    bbMiddleSeries = priceChart.addLineSeries({ color: 'rgba(0,188,212,0.3)', lineWidth: 1, lineStyle: 2, title: 'BB Middle' });
    bbLowerSeries = priceChart.addLineSeries({ color: '#00bcd4', lineWidth: 1, lineStyle: 0, title: 'BB Lower' });

    rsiSeries = rsiChart.addLineSeries({ color: '#ff9800', lineWidth: 1, title: 'RSI' });
    stochSeries = rsiChart.addLineSeries({ color: '#9c27b0', lineWidth: 1, title: 'Stoch' });
    macdSeries = rsiChart.addLineSeries({ color: '#2196f3', lineWidth: 1, title: 'MACD' });
    macdSignalSeries = rsiChart.addLineSeries({ color: '#ff5722', lineWidth: 1, title: 'Signal' });

    const highLevel = parseFloat(document.getElementById('rsi-high').value) || 65;
    const lowLevel = parseFloat(document.getElementById('rsi-low').value) || 35;
    
    rsiSeries.createPriceLine({ price: highLevel, color: '#f23645', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'HIGH' });
    rsiSeries.createPriceLine({ price: lowLevel, color: '#089981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'LOW' });

    setupCrosshair();
}

function setupCrosshair() {
    const tooltip = document.getElementById('tooltip');
    const showTooltip = document.getElementById('show-tooltip');
    
    priceChart.subscribeCrosshairMove(param => {
        if (!showTooltip.checked || !param.time || !param.seriesData.get(candleSeries)) {
            tooltip.style.display = 'none';
            return;
        }
        
        const data = param.seriesData.get(candleSeries);
        if (data) {
            const date = new Date(param.time * 1000);
            tooltip.querySelector('.tt-time').textContent = date.toLocaleString();
            tooltip.querySelector('.tt-open').textContent = data.open.toFixed(2);
            tooltip.querySelector('.tt-high').textContent = data.high.toFixed(2);
            tooltip.querySelector('.tt-low').textContent = data.low.toFixed(2);
            tooltip.querySelector('.tt-close').textContent = data.close.toFixed(2);
            
            const chartRect = document.getElementById('price-chart').getBoundingClientRect();
            let x = param.point.x + 15;
            let y = param.point.y + 15;
            if (x + 120 > chartRect.width) x = param.point.x - 130;
            if (y + 100 > chartRect.height) y = param.point.y - 110;
            
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
            tooltip.style.display = 'block';
        }
    });
}

function updateIndicators() {
    if (dataHistory.length < 2) return;
    try {
        const smaP = parseInt(document.getElementById('sma-period').value) || 9;
        const emaP = parseInt(document.getElementById('ema-period').value) || 10;
        const rsiP = parseInt(document.getElementById('rsi-period').value) || 7;
        const rsiHigh = parseFloat(document.getElementById('rsi-high').value) || 70;
        const rsiLow = parseFloat(document.getElementById('rsi-low').value) || 30;
        const bbP = parseInt(document.getElementById('bb-period').value) || 20;

        const smaData = document.getElementById('sma-enabled').checked ? calculateSMA(dataHistory, smaP).filter(d => d.value !== null) : [];
        const emaData = document.getElementById('ema-enabled').checked ? calculateEMA(dataHistory, emaP) : [];
        const rsiData = document.getElementById('rsi-enabled').checked ? calculateRSI(dataHistory, rsiP).filter(d => d.value !== null) : [];
        const bb = document.getElementById('bb-enabled').checked ? calculateBB(dataHistory, bbP) : { upper: [], middle: [], lower: [] };

        const stochData = calculateStochastic(dataHistory, 14);
        const macdData = calculateMACD(dataHistory, 12, 26, 9);

        if (smaSeries) smaSeries.setData(smaData);
        if (emaSeries) emaSeries.setData(emaData);
        if (bbUpperSeries) bbUpperSeries.setData(bb.upper.filter(d => d.value !== null));
        if (bbMiddleSeries) bbMiddleSeries.setData(bb.middle?.filter(d => d.value !== null) || []);
        if (bbLowerSeries) bbLowerSeries.setData(bb.lower.filter(d => d.value !== null));
        
        if (rsiSeries) {
            if (document.getElementById('rsi-enabled').checked) {
                rsiSeries.setData(rsiData);
                rsiSeries.applyOptions({ visible: true });
            } else {
                rsiSeries.applyOptions({ visible: false });
            }
        }

        if (stochSeries) {
            const stochPlot = stochData.map(d => ({ time: d.time, value: d.k }));
            stochSeries.setData(stochPlot.filter(d => d.value !== null));
        }

        if (macdSeries && macdSignalSeries) {
            const validMacd = macdData.filter(d => d.macd !== null);
            if (validMacd.length > 0) {
                const macdValues = validMacd.map(d => d.macd);
                const signalValues = validMacd.map(d => d.signal);
                const allValues = [...macdValues, ...signalValues];
                const minVal = Math.min(...allValues);
                const maxVal = Math.max(...allValues);
                const range = maxVal - minVal || 1;
                
                const normalize = (v) => ((v - minVal) / range) * 100;
                
                const macdPlot = macdData.map(d => ({ time: d.time, value: d.macd !== null ? normalize(d.macd) : null })).filter(d => d.value !== null);
                const signalPlot = macdData.map(d => ({ time: d.time, value: d.signal !== null ? normalize(d.signal) : null })).filter(d => d.value !== null);
                
                macdSeries.setData(macdPlot);
                macdSignalSeries.setData(signalPlot);
            }
        }

        const config = {
            minConfirmations: 3,
            rsiPeriod: rsiP,
            rsiHigh: rsiHigh,
            rsiLow: rsiLow,
            stochPeriod: 14,
            smaFast: smaP,
            smaSlow: 21,
            bbPeriod: bbP,
            bbStdDev: 2,
            enabled: {
                rsi: document.getElementById('rsi-enabled').checked,
                stoch: true,
                macd: true,
                sma: document.getElementById('sma-enabled').checked,
                bb: document.getElementById('bb-enabled').checked
            }
        };

        const momentumResult = analyzeMultiIndicators(dataHistory, config);
        const dojiConfig = { dojiThreshold: 0.3, rsiPeriod: rsiP, rsiLow: rsiLow, rsiHigh: rsiHigh, useBB: true, bbPeriod: bbP };
        const dojiResult = detectDojiSignal(dataHistory[dataHistory.length - 1], dataHistory, dojiConfig);
        
        if (momentumResult.signal) {
            processMultiSignals(momentumResult);
        } else if (dojiResult && dojiResult.signal) {
            processMultiSignals(dojiResult);
        } else {
            const waitReason = `M: ${momentumResult.indicators?.bullishCount || 0}/${config.minConfirmations}${dojiResult ? ' | D:esperando' : ''}`;
            addLog(waitReason);
        }
    } catch (error) { console.warn('Indicator error:', error); }
}

function processMultiSignals(result) {
    if (positionOpen) {
        return;
    }
    
    if (candleSeries && dataHistory.length > 0) {
        const lastCandle = dataHistory[dataHistory.length - 1];
        const signalTime = lastCandle.time;
        const entryPrice = lastCandle.close;
        const signalType = result.signal;
        const color = signalType === 'call' ? '#089981' : '#f23645';
        
        positionOpen = true;
        activeSignalType = signalType;
        
        activeIndicator = result.indicators?.triggerIndicator || null;
        if (activeIndicator) {
            console.log('[HIGHLIGHT] Calling for:', activeIndicator);
            highlightIndicator(activeIndicator, true);
            updateIndicatorLed(activeIndicator, signalType);
        }
        
        const signalId = Date.now();
        
        showPositionTimer(signalType, entryPrice);
        tradingMarkers.push({
            time: signalTime,
            position: 'aboveBar',
            color: color,
            shape: signalType === 'call' ? 'arrowUp' : 'arrowDown',
            text: signalType,
            labelTextColor: signalType === 'call' ? '#089981' : '#f23645',
            labelBackgroundColor: signalType === 'call' ? '#089981' : '#f23645',
        });
        candleSeries.setMarkers(tradingMarkers);
        addLog(`¡SEÑAL ${signalType.toUpperCase()}! ${result.reason}`, signalType);
        
        signalHistory.unshift({ type: signalType, time: signalTime, price: entryPrice, reason: result.reason, verified: false });
        if (signalHistory.length > 20) signalHistory.pop();
        
        if (signalType === 'call') callCount++; else putCount++;
        updateResults();
        
        pendingSignals.push({ id: signalId, type: signalType, time: signalTime, entryPrice: entryPrice });
        
        addLog(`⏱️ Verificando en 1min... (ID: ${signalId})`);
        
        signalTimeouts[signalId] = setTimeout(() => {
            verifySignal(signalId, signalType, entryPrice, signalTime);
        }, 60000);
        
        if (document.getElementById('sound-alert').checked) {
            try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU').play().catch(() => {}); } catch (e) {}
        }
    }
}

function verifySignal(signalId, signalType, entryPrice, signalTime) {
    const index = pendingSignals.findIndex(s => s.id === signalId);
    if (index === -1) return;
    
    const signal = pendingSignals[index];
    pendingSignals.splice(index, 1);
    delete signalTimeouts[signalId];
    
    if (dataHistory.length < 2) {
        addLog(`⚠️ Verificación ${signalId}: Sin datos para verificar`, 'put');
        return;
    }
    
    const currentPrice = dataHistory[dataHistory.length - 1].close;
    const priceChange = currentPrice - entryPrice;
    const priceChangePct = (priceChange / entryPrice) * 100;
    
    let success = false;
    let resultText = '';
    
    if (signalType === 'call') {
        success = currentPrice > entryPrice;
        resultText = success ? `✅ WIN (+${priceChangePct.toFixed(2)}%)` : `❌ LOSE (${priceChangePct.toFixed(2)}%)`;
    } else {
        success = currentPrice < entryPrice;
        resultText = success ? `✅ WIN (${priceChangePct.toFixed(2)}%)` : `❌ LOSE (+${priceChangePct.toFixed(2)}%)`;
    }
    
    addLog(`🔍 ${resultText} | Entry: ${entryPrice.toFixed(2)} → Exit: ${currentPrice.toFixed(2)}`, success ? 'call' : 'put');
    
    const resultColor = success ? '#089981' : '#f23645';
    const resultShape = success ? 'check' : 'cross';
    
    const markers = candleSeries.markers();
    markers.push({
        time: dataHistory[dataHistory.length - 1].time,
        position: 'aboveBar',
        color: resultColor,
        shape: resultShape,
        text: success ? '✓' : '✗'
    });
    candleSeries.setMarkers(markers);
    
    const histIndex = signalHistory.findIndex(s => s.time === signalTime && s.type === signalType);
    if (histIndex !== -1) {
        signalHistory[histIndex].verified = true;
        signalHistory[histIndex].success = success;
        signalHistory[histIndex].exitPrice = currentPrice;
        signalHistory[histIndex].result = resultText;
    }
    
    if (success) winCount++; else loseCount++;
    positionOpen = false;
    hidePositionTimer();
    updateResults();
}

document.getElementById('start-btn').addEventListener('click', () => {
    console.log('[BTN] Click detected, isConnected:', isConnected);
    if (isConnected) {
        console.log('[BTN] Calling disconnect()');
        disconnect();
    } else {
        console.log('[BTN] Calling connect()');
        connect();
    }
});

window.startBot = function() {
    if (!isConnected) connect();
};
window.disconnectBot = function() {
    if (isConnected) disconnect();
};

function connect() {
    // Input validation
    const appIdInput = document.getElementById('app-id').value;
    const tokenInput = document.getElementById('api-token').value;
    const symbolInput = document.getElementById('symbol').value;
    const timeframeInput = document.getElementById('timeframe').value;
    
    // Validate required fields
    if (!appIdInput || appIdInput.trim() === '') {
        addLog('Error: Ingrese un App ID válido', 'put');
        return;
    }
    
    if (!/^\d+$/.test(appIdInput.trim())) {
        addLog('Error: App ID debe ser numérico', 'put');
        return;
    }
    
    const appId = appIdInput.trim();
    const token = tokenInput ? tokenInput.trim() : '';
    const granularity = parseInt(timeframeInput) || 60;
    currentSymbol = symbolInput;

    console.log('[APP] connect() started - appId:', appId, 'symbol:', currentSymbol, 'granularity:', granularity);
    addLog(`Conectando a ${currentSymbol} (${appId})...`);
    
    const wsUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${appId}`;
    console.log('[WS] Creating WebSocket:', wsUrl);
    
    ws = new WebSocket(wsUrl);
    console.log('[WS] WebSocket object created, readyState:', ws.readyState);

    ws.onopen = () => {
        console.log('[WS] onopen fired, readyState:', ws.readyState);
        addLog('WebSocket abierto. Solicitando historial...');
        initCharts();
        document.getElementById('api-token').parentElement.style.display = 'none';
        document.getElementById('app-id').parentElement.style.display = 'none';
        document.getElementById('start-btn').style.display = 'none';
        
        console.log('[WS] Sending authorize or requesting history...');
        if (token) ws.send(JSON.stringify({ authorize: token }));
        else requestHistory();
    };

    ws.onmessage = (msg) => {
        console.log('[WS] onmessage received, data:', msg.data.substring(0, 200));
        try {
            const res = JSON.parse(msg.data);
            console.log('[WS] Parsed msg_type:', res.msg_type);
            
            if (res.msg_type === 'authorize') {
                console.log('[AUTH] authorize response:', res);
                if (res.error) addLog('Token error: ' + res.error.message, 'put');
                else { addLog('Autorizado.'); requestHistory(); }
            }
            if (res.msg_type === 'error') {
                console.log('[ERROR] API error:', res.error);
                addLog('API: ' + (res.error?.message || JSON.stringify(res)), 'put');
            }
            if (res.msg_type === 'candles') {
                console.log('[DATA] Received candles, count:', res.candles?.length);
                const validCandles = res.candles.map(c => ({
                    time: parseInt(c.epoch), open: parseFloat(c.open), high: parseFloat(c.high),
                    low: parseFloat(c.low), close: parseFloat(c.close)
                })).filter(c => c.time && c.open > 0 && c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close));

                console.log('[DATA] Valid candles:', validCandles.length);
                if (validCandles.length > 0) {
                    dataHistory = validCandles;
                    // Memory management: limit dataHistory to prevent unbounded growth
                    const maxCandles = CONFIG.DATA.MAX_CANDLES || 500;
                    if (dataHistory.length > maxCandles) {
                        dataHistory = dataHistory.slice(-maxCandles);
                        console.log('[DATA] Trimmed to', maxCandles, 'candles');
                    }
                    candleSeries.setData(dataHistory);
                    if (analysisChartsReady) updateAnalysisCharts();
                    applyMinCandles();
                    updateIndicators();
                    subscribeOHLC();
                    isConnected = true;
                    if (updateInterval) clearInterval(updateInterval);
                    updateInterval = setInterval(() => {
                        if (isConnected && dataHistory.length > 0) {
                            updateIndicators();
                            if (analysisChartsReady && currentTab === 'estrategia') updateAnalysisIndicators();
                        }
                    }, 1000);
                    addLog(`Cargado: ${dataHistory.length} velas`);
                    console.log('[DATA] Charts updated, connected:', isConnected);
                }
            }
            if (res.msg_type === 'ohlc') {
                console.log('[DATA] OHLC update:', res.ohlc);
                const o = res.ohlc;
                const candle = { time: parseInt(o.open_time), open: parseFloat(o.open), high: parseFloat(o.high), low: parseFloat(o.low), close: parseFloat(o.close) };
                if (candle.time && candle.open > 0) {
                    const isNewCandle = dataHistory.length === 0 || dataHistory[dataHistory.length - 1].time !== candle.time;
                    if (candleSeries) candleSeries.update(candle);
                    if (analysisChartsReady && currentTab === 'estrategia') {
                        if (estrCandleSeries) estrCandleSeries.update(candle);
                        updateAnalysisIndicators();
                    }
                    if (dataHistory.length > 0 && dataHistory[dataHistory.length - 1].time === candle.time) {
                        dataHistory[dataHistory.length - 1] = candle;
                    } else {
                        dataHistory.push(candle);
                        if (dataHistory.length > 5000) dataHistory.shift();
                    }
                    updateIndicators();
                    if (isNewCandle && document.getElementById('auto-scroll').checked) {
                        scrollToEnd();
                    }
                }
            }
        } catch (e) { console.error('[WS] Parse error:', e); }
    };

    ws.onerror = (e) => {
        console.error('[WS] onerror:', e);
        addLog('Error de conexión: ' + (e.message || 'No se pudo conectar'), 'put');
    };
    ws.onclose = (e) => {
        console.log('[WS] onclose:', e.code, e.reason);
        addLog('Desconectado (' + e.code + ')', 'put');
        isConnected = false;
        state.isConnected = false;
        if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
        
        // Auto-reconnection logic
        if (e.code !== 1000 && state.reconnectAttempts < CONFIG.WS.MAX_RECONNECT_ATTEMPTS) {
            state.reconnectAttempts++;
            const delay = CONFIG.WS.RECONNECT_DELAY * state.reconnectAttempts;
            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts}/${CONFIG.WS.MAX_RECONNECT_ATTEMPTS})`);
            addLog(`Reconectando en ${delay/1000}s... (intento ${state.reconnectAttempts})`);
            setTimeout(() => {
                const token = document.getElementById('api-token').value;
                const appId = document.getElementById('app-id').value || '1089';
                if (token && appId) connect(token, appId);
            }, delay);
        } else if (state.reconnectAttempts >= CONFIG.WS.MAX_RECONNECT_ATTEMPTS) {
            addLog('Máximo de intentos alcanzado. Recargue la página.', 'put');
        }
    };
}

function disconnect() {
    if (ws) ws.close();
    isConnected = false;
    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
}

function requestHistory() {
    const gran = parseInt(document.getElementById('timeframe').value) || 60;
    ws.send(JSON.stringify({ ticks_history: currentSymbol, end: 'latest', start: Math.floor(Date.now() / 1000) - 7200, style: 'candles', granularity: gran }));
}

function subscribeOHLC() {
    const gran = parseInt(document.getElementById('timeframe').value) || 60;
    ws.send(JSON.stringify({ forget_all: 'ohlc' }));
    ws.send(JSON.stringify({ ticks_history: currentSymbol, subscribe: 1, end: 'latest', granularity: gran, style: 'candles' }));
}

const ZOOM_LIMIT = { min: 10, max: 200 };

function clampZoom(offset) {
    return Math.max(ZOOM_LIMIT.min, Math.min(ZOOM_LIMIT.max, offset));
}

function applyMinCandles() {
    if (dataHistory.length > 0 && priceChart) {
        const minCandles = parseInt(document.getElementById('min-candles').value) || 24;
        const offset = clampZoom(minCandles);
        console.log('[ZOOM] applyMinCandles, rightOffset:', offset);
        priceChart.timeScale().applyOptions({ rightOffset: offset });
    }
}

function scrollToEnd() {
    if (dataHistory.length > 0 && priceChart) {
        const minCandles = parseInt(document.getElementById('min-candles').value) || 24;
        const offset = clampZoom(minCandles);
        priceChart.timeScale().applyOptions({ rightOffset: offset });
    }
}

function set1DayView() {
    const gran = parseInt(document.getElementById('timeframe').value) || 60;
    const candlesPerDay = Math.floor(86400 / gran);
    const offset = clampZoom(candlesPerDay);
    console.log('[1D] Setting rightOffset:', offset);
    if (priceChart) priceChart.timeScale().applyOptions({ rightOffset: offset });
}



function updateResults() {
    document.getElementById('signal-count').textContent = callCount + putCount;
    document.getElementById('call-count').textContent = callCount;
    document.getElementById('put-count').textContent = putCount;
    document.getElementById('win-count').textContent = winCount;
    document.getElementById('lose-count').textContent = loseCount;
    
    const lastVerified = signalHistory.find(s => s.verified !== undefined);
    if (lastVerified) {
        document.getElementById('last-signal').textContent = lastVerified.success ? `✓ WIN` : `✗ LOSE`;
        document.getElementById('last-signal').className = 'value ' + (lastVerified.success ? 'call' : 'put');
    } else if (signalHistory[0]) {
        document.getElementById('last-signal').textContent = signalHistory[0].type === 'call' ? '▲ CALL' : '▼ PUT';
        document.getElementById('last-signal').className = 'value ' + (signalHistory[0]?.type === 'call' ? 'call' : signalHistory[0]?.type === 'put' ? 'put' : '');
    } else {
        document.getElementById('last-signal').textContent = '--';
    }
}

document.querySelectorAll('#timeframe-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#timeframe-btns button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('timeframe').value = btn.dataset.value;
        if (isConnected) { disconnect(); connect(); }
    });
});

document.getElementById('symbol').addEventListener('change', () => {
    if (isConnected) { disconnect(); connect(); }
});

document.getElementById('view-1d').addEventListener('click', () => {
    if (priceChart) set1DayView();
});

['sma-enabled', 'ema-enabled', 'bb-enabled', 'rsi-enabled'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateIndicators);
});

['sma-period', 'ema-period', 'bb-period', 'rsi-period', 'rsi-high', 'rsi-low'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateIndicators);
});

// Keyboard sync: Home/End sync both charts
document.addEventListener('keydown', (e) => {
    if (!priceChart || !rsiChart) return;
    
    if (e.key === 'Home') {
        // Show oldest data, fit content
        priceChart.timeScale().fitContent();
        rsiChart.timeScale().fitContent();
    } else if (e.key === 'End') {
        // Show latest data
        if (dataHistory.length > 0) {
            const lastTime = dataHistory[dataHistory.length - 1].time;
            const firstTime = dataHistory[0].time;
            priceChart.timeScale().setVisibleRange({ from: firstTime, to: lastTime + 60 });
            rsiChart.timeScale().setVisibleRange({ from: firstTime, to: lastTime + 60 });
        }
    }
});

function resetUIForStrategy() {
    // Clear market data history
    dataHistory = [];
    // Clear chart series data
    candleSeries.setData([]);
    smaSeries.setData([]);
    emaSeries.setData([]);
    bbUpperSeries.setData([]);
    bbMiddleSeries.setData([]);
    bbLowerSeries.setData([]);
    rsiSeries.setData([]);
    stochSeries.setData([]);
    macdSeries.setData([]);
    macdSignalSeries.setData([]);
    // Reset indicator toggles to defaults
    document.getElementById('sma-enabled').checked = true;
    document.getElementById('ema-enabled').checked = true;
    document.getElementById('rsi-enabled').checked = true;
    document.getElementById('bb-enabled').checked = true;
    // Reset indicator parameters to defaults
    document.getElementById('sma-period').value = 9;
    document.getElementById('ema-period').value = 10;
    document.getElementById('rsi-period').value = 7;
    document.getElementById('rsi-high').value = 70;
    document.getElementById('rsi-low').value = 30;
    document.getElementById('bb-period').value = 20;
    // Refresh indicators and chart
    updateIndicators();
    priceChart.applyOptions({}); // force redraw
    rsiChart.applyOptions({});
}

window.addEventListener('load', () => {
    initCharts();
    window.dispatchEvent(new Event('resize'));
    const strategySelect = document.getElementById('strategy');
    if (strategySelect) {
        strategySelect.addEventListener('change', () => {
            console.log('[UI] Strategy changed, resetting UI components');
            resetUIForStrategy();
        });
    }
});

// Toggle results panel
document.getElementById('toggle-results')?.addEventListener('click', () => {
    const panel = document.getElementById('results-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('close-results')?.addEventListener('click', () => {
    const panel = document.getElementById('results-panel');
    if (panel) panel.style.display = 'none';
});

function showPositionTimer(signalType, entryPrice) {
    console.log('[TIMER] showPositionTimer called:', signalType, entryPrice);
    const overlay = document.getElementById('position-overlay');
    const countdownEl = document.getElementById('overlay-countdown');
    const typeEl = document.getElementById('overlay-type');
    const entryEl = document.getElementById('overlay-entry');
    const progressEl = document.getElementById('progress-fill');
    
    positionTimeLeft = 60;
    countdownEl.textContent = positionTimeLeft;
    progressEl.style.width = '100%';
    
    typeEl.textContent = signalType === 'call' ? '▲ CALL' : '▼ PUT';
    entryEl.textContent = '@ ' + entryPrice.toFixed(2);
    
    overlay.className = signalType === 'call' ? '' : 'put-mode';
    overlay.style.display = 'block';
    console.log('[TIMER] Overlay displayed, display:', overlay.style.display);
    
    if (positionTimer) clearInterval(positionTimer);
    
    positionTimer = setInterval(() => {
        positionTimeLeft--;
        countdownEl.textContent = positionTimeLeft;
        progressEl.style.width = (positionTimeLeft / 60 * 100) + '%';
        
        if (positionTimeLeft <= 0) {
            clearInterval(positionTimer);
        }
    }, 1000);
}

function highlightIndicator(name, isActive) {
    console.log('[HIGHLIGHT] Setting', name, 'to width:', isActive ? 4 : 1);
    const width = isActive ? 4 : 1;
    switch(name) {
        case 'RSI':
            if (rsiSeries) rsiSeries.applyOptions({ lineWidth: width });
            break;
        case 'Stoch':
            if (stochSeries) stochSeries.applyOptions({ lineWidth: width });
            break;
        case 'MACD':
            if (macdSeries) macdSeries.applyOptions({ lineWidth: width });
            if (macdSignalSeries) macdSignalSeries.applyOptions({ lineWidth: width });
            break;
        case 'SMA':
            if (smaSeries) smaSeries.applyOptions({ lineWidth: width });
            break;
        case 'BB':
            if (bbUpperSeries) bbUpperSeries.applyOptions({ lineWidth: width });
            if (bbMiddleSeries) bbMiddleSeries.applyOptions({ lineWidth: width });
            if (bbLowerSeries) bbLowerSeries.applyOptions({ lineWidth: width });
            break;
    }
}

function hidePositionTimer() {
    const overlay = document.getElementById('position-overlay');
    overlay.style.display = 'none';
    if (positionTimer) {
        clearInterval(positionTimer);
        positionTimer = null;
    }
    if (activeIndicator) {
        highlightIndicator(activeIndicator, false);
        activeIndicator = null;
    }
    activeSignalType = null;
    resetIndicatorLeds();
}

function updateIndicatorLed(name, signalType) {
    const ledIds = { 'RSI': 'led-rsi', 'Stoch': 'led-stoch', 'MACD': 'led-macd', 'SMA': 'led-sma', 'BB': 'led-bb' };
    const ledId = ledIds[name];
    if (!ledId) return;
    
    const led = document.getElementById(ledId);
    led.className = 'mini-led active';
    led.classList.add(signalType === 'call' ? 'active-call' : 'active-put');
}

function resetIndicatorLeds() {
    ['led-rsi', 'led-stoch', 'led-macd', 'led-sma', 'led-bb'].forEach(id => {
        const led = document.getElementById(id);
        if (led) led.className = 'mini-led';
    });
}

function addLog(message, type = '') {
    const container = document.getElementById('logs-container');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    container.appendChild(entry);
    while (container.children.length > 100) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('sidebar-trading').style.display = tab === 'trading' ? '' : 'none';
    document.getElementById('sidebar-estrategia').style.display = tab === 'estrategia' ? '' : 'none';
    document.getElementById('trading-view').style.display = tab === 'trading' ? '' : 'none';
    document.getElementById('estrategia-view').style.display = tab === 'estrategia' ? '' : 'none';

    if (tab === 'estrategia') {
        if (!analysisChartsReady) initAnalysisCharts();
        if (dataHistory.length > 0) updateAnalysisCharts();
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================
// ANALYSIS CHARTS
// ============================================
let analysisChartsReady = false;
let estrPriceChart, estrRsiChart;
let estrCandleSeries, estrSmaSeries, estrEmaSeries;
let estrBbUpperSeries, estrBbMiddleSeries, estrBbLowerSeries;
let estrRsiSeries, estrStochSeries, estrMacdSeries, estrMacdSignalSeries;

function initAnalysisCharts() {
    if (analysisChartsReady) return;
    const pContainer = document.getElementById('estr-price-chart');
    const rContainer = document.getElementById('estr-rsi-chart');
    if (!pContainer || !rContainer) return;

    pContainer.style.minHeight = '300px';
    rContainer.style.minHeight = '100px';

    document.getElementById('estr-zoom-in').onclick = () => {
        const bs = Math.min(50, (estrPriceChart.timeScale().options().barSpacing || 8) + 2);
        estrPriceChart.timeScale().applyOptions({ barSpacing: bs });
        estrRsiChart.timeScale().applyOptions({ barSpacing: bs });
    };
    document.getElementById('estr-zoom-out').onclick = () => {
        const bs = Math.max(4, (estrPriceChart.timeScale().options().barSpacing || 8) - 2);
        estrPriceChart.timeScale().applyOptions({ barSpacing: bs });
        estrRsiChart.timeScale().applyOptions({ barSpacing: bs });
    };
    document.getElementById('estr-fit-content').onclick = () => {
        estrPriceChart.timeScale().fitContent();
        estrRsiChart.timeScale().fitContent();
    };

    const estrOpts = JSON.parse(JSON.stringify(chartOptions));
    estrOpts.timeScale.rightOffset = 4;

    estrPriceChart = LightweightCharts.createChart(pContainer, { ...estrOpts, height: pContainer.clientHeight || 300 });
    estrRsiChart = LightweightCharts.createChart(rContainer, { ...estrOpts, height: rContainer.clientHeight || 100 });

    estrCandleSeries = estrPriceChart.addCandlestickSeries({
        upColor: '#089981', downColor: '#f23645',
        borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645',
    });

    estrSmaSeries = estrPriceChart.addLineSeries({ color: '#2962ff', lineWidth: 1, title: 'SMA' });
    estrEmaSeries = estrPriceChart.addLineSeries({ color: '#f23645', lineWidth: 1, title: 'EMA' });
    estrBbUpperSeries = estrPriceChart.addLineSeries({ color: '#00bcd4', lineWidth: 1, lineStyle: 0, title: 'BB Upper' });
    estrBbMiddleSeries = estrPriceChart.addLineSeries({ color: 'rgba(0,188,212,0.3)', lineWidth: 1, lineStyle: 2, title: 'BB Middle' });
    estrBbLowerSeries = estrPriceChart.addLineSeries({ color: '#00bcd4', lineWidth: 1, lineStyle: 0, title: 'BB Lower' });

    estrRsiSeries = estrRsiChart.addLineSeries({ color: '#ff9800', lineWidth: 1, title: 'RSI' });
    estrStochSeries = estrRsiChart.addLineSeries({ color: '#9c27b0', lineWidth: 1, title: 'Stoch' });
    estrMacdSeries = estrRsiChart.addLineSeries({ color: '#2196f3', lineWidth: 1, title: 'MACD' });
    estrMacdSignalSeries = estrRsiChart.addLineSeries({ color: '#ff5722', lineWidth: 1, title: 'Signal' });

    const high = parseFloat(document.getElementById('rsi-high').value) || 65;
    const low = parseFloat(document.getElementById('rsi-low').value) || 35;
    estrRsiSeries.createPriceLine({ price: high, color: '#f23645', lineWidth: 1, lineStyle: 2, title: 'HIGH' });
    estrRsiSeries.createPriceLine({ price: low, color: '#089981', lineWidth: 1, lineStyle: 2, title: 'LOW' });

    // Click to place manual marks on analysis chart
    estrPriceChart.subscribeClick(param => {
        const markMode = document.getElementById('estr-mark-mode');
        if (!markMode || !markMode.checked) return;
        if (!param.time || !dataHistory.length) return;
        const time = Number(param.time);
        if (estrMarks.some(m => m.time === time)) {
            estrAddLog('Ya existe una marca en este momento');
            return;
        }
        const candle = dataHistory.find(c => c.time === time);
        if (!candle) return;

        const ind = getIndicatorValuesAt(time);
        estrMarks.push({ time, type: estrMarkType, price: candle.close, indicators: ind });
        renderAnalysisMarksList();
        updateAnalysisMarkers();
        renderComparison();
        estrAddLog(`Marca ${estrMarkType === 'open' ? 'ABRIR' : 'CERRAR'} @ ${candle.close.toFixed(2)}`);
    });

    analysisChartsReady = true;
    if (dataHistory.length > 0) updateAnalysisCharts();
}

function getIndicatorValuesAt(time) {
    const rsiP = parseInt(document.getElementById('estr-rsi-period').value) || 7;
    const smaP = parseInt(document.getElementById('estr-sma-period').value) || 23;
    const bbP = parseInt(document.getElementById('estr-bb-period').value) || 20;
    const stochP = parseInt(document.getElementById('estr-stoch-period').value) || 14;

    const findVal = (arr) => {
        if (!arr || !arr.length) return null;
        const entry = [...arr].reverse().find(d => d.time <= time);
        return entry && entry.value !== null ? +entry.value.toFixed(2) : null;
    };

    return {
        sma: findVal(calculateSMA(dataHistory, smaP)),
        rsi: findVal(calculateRSI(dataHistory, rsiP)),
        bbUpper: findVal(calculateBB(dataHistory, bbP).upper),
        bbLower: findVal(calculateBB(dataHistory, bbP).lower),
        stoch: findVal(calculateStochastic(dataHistory, stochP).map(d => ({ time: d.time, value: d.k }))),
        macd: findVal(calculateMACD(dataHistory, 12, 26, 9).map(d => ({ time: d.time, value: d.macd }))),
    };
}

function updateAnalysisCharts() {
    if (!analysisChartsReady || !dataHistory.length) return;
    document.getElementById('estr-symbol-display').textContent = currentSymbol;
    document.getElementById('estr-data-status').textContent = 'Conectado';
    document.getElementById('estr-candle-count').style.display = '';
    document.getElementById('estr-count-num').textContent = dataHistory.length;
    estrCandleSeries.setData(dataHistory);
    updateAnalysisIndicators();
}

function updateAnalysisIndicators() {
    if (!analysisChartsReady || dataHistory.length < 2) return;

    const smaP = parseInt(document.getElementById('estr-sma-period').value) || 23;
    const emaP = parseInt(document.getElementById('estr-ema-period').value) || 10;
    const rsiP = parseInt(document.getElementById('estr-rsi-period').value) || 7;
    const bbP = parseInt(document.getElementById('estr-bb-period').value) || 20;

    const smaData = document.getElementById('estr-sma-enable').checked ? calculateSMA(dataHistory, smaP).filter(d => d.value !== null) : [];
    const emaData = document.getElementById('estr-ema-enable').checked ? calculateEMA(dataHistory, emaP) : [];
    const rsiData = document.getElementById('estr-rsi-enable').checked ? calculateRSI(dataHistory, rsiP).filter(d => d.value !== null) : [];
    const bb = document.getElementById('estr-bb-enable').checked ? calculateBB(dataHistory, bbP) : { upper: [], middle: [], lower: [] };
    const stochData = calculateStochastic(dataHistory, parseInt(document.getElementById('estr-stoch-period').value) || 14);
    const macdData = calculateMACD(dataHistory, 12, 26, 9);

    if (estrSmaSeries) estrSmaSeries.setData(smaData);
    if (estrEmaSeries) estrEmaSeries.setData(emaData);
    if (estrBbUpperSeries) estrBbUpperSeries.setData(bb.upper.filter(d => d.value !== null));
    if (estrBbMiddleSeries) estrBbMiddleSeries.setData(bb.middle?.filter(d => d.value !== null) || []);
    if (estrBbLowerSeries) estrBbLowerSeries.setData(bb.lower.filter(d => d.value !== null));

    if (estrRsiSeries) { estrRsiSeries.setData(rsiData); estrRsiSeries.applyOptions({ visible: rsiData.length > 0 }); }
    if (estrStochSeries) { const plot = stochData.map(d => ({ time: d.time, value: d.k })).filter(d => d.value !== null); estrStochSeries.setData(plot); }
    if (estrMacdSeries && estrMacdSignalSeries) {
        const valid = macdData.filter(d => d.macd !== null);
        if (valid.length > 0) {
            const all = [...valid.map(d => d.macd), ...valid.map(d => d.signal)];
            const min = Math.min(...all), max = Math.max(...all), range = max - min || 1;
            const norm = v => ((v - min) / range) * 100;
            estrMacdSeries.setData(macdData.map(d => ({ time: d.time, value: d.macd !== null ? norm(d.macd) : null })).filter(d => d.value !== null));
            estrMacdSignalSeries.setData(macdData.map(d => ({ time: d.time, value: d.signal !== null ? norm(d.signal) : null })).filter(d => d.value !== null));
        }
    }

    updateAnalysisMarkers();
}

function updateAnalysisMarkers() {
    if (!analysisChartsReady || !estrCandleSeries) return;
    const manualMarkers = estrMarks.map(m => ({
        time: m.time,
        position: m.type === 'open' ? 'aboveBar' : 'belowBar',
        color: m.type === 'open' ? '#089981' : '#f23645',
        shape: m.type === 'open' ? 'arrowUp' : 'arrowDown',
        text: m.type === 'open' ? 'ABRIR' : 'CERRAR'
    }));

    const autoMarkers = estrAutoSignals.map(s => ({
        time: s.time,
        position: s.type === 'CALL' ? 'aboveBar' : 'belowBar',
        color: s.type === 'CALL' ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)',
        shape: s.type === 'CALL' ? 'circle' : 'square',
        text: s.type
    }));

    const markers = [...manualMarkers, ...autoMarkers].sort((a, b) => a.time - b.time);
    estrCandleSeries.setMarkers(markers);
}

function normalizeManualType(type) {
    return type === 'open' ? 'CALL' : 'PUT';
}

function findAutoSignalAt(time) {
    return estrAutoSignals.find(s => s.time === time) || null;
}

function renderComparison() {
    const statsEl = document.getElementById('estr-compare-stats');
    const tableEl = document.getElementById('estr-compare-table');
    if (!statsEl || !tableEl) return;

    if (!estrAutoSignals.length) {
        statsEl.textContent = 'Aún no hay resultados';
        tableEl.textContent = 'Ejecute backtest para ver coincidencias';
        return;
    }

    let hits = 0;
    let directionMatches = 0;
    const rows = [];

    estrMarks.forEach((m) => {
        const auto = findAutoSignalAt(m.time);
        const manualType = normalizeManualType(m.type);
        const sameCandle = !!auto;
        const sameDirection = !!auto && auto.type === manualType;

        if (sameCandle) hits += 1;
        if (sameDirection) directionMatches += 1;

        rows.push({
            time: new Date(m.time * 1000).toLocaleTimeString(),
            manual: manualType,
            auto: auto ? auto.type : '—',
            match: sameDirection ? '✓' : (sameCandle ? '✗' : '∅')
        });
    });

    const omissions = Math.max(estrMarks.length - hits, 0);
    const falsePositives = Math.max(estrAutoSignals.length - hits, 0);
    statsEl.textContent = `Aciertos: ${directionMatches} · Fallos dir.: ${hits - directionMatches} · Omisiones: ${omissions} · Falsos+: ${falsePositives}`;

    if (!rows.length) {
        tableEl.textContent = 'No hay marcas manuales para comparar';
        return;
    }

    tableEl.innerHTML = rows.map(r => (
        `<div style="display:grid;grid-template-columns:1fr 52px 52px 22px;gap:4px;padding:2px 0;border-bottom:1px solid #1a1a1a;">` +
        `<span style="color:#9ca3af;">${r.time}</span>` +
        `<span>${r.manual}</span>` +
        `<span>${r.auto}</span>` +
        `<span style="text-align:center;">${r.match}</span>` +
        `</div>`
    )).join('');
}

async function runStrategyBacktest() {
    if (!dataHistory.length) {
        estrAddLog('Sin datos para backtest');
        return;
    }

    const strategyId = document.getElementById('strategy')?.value || 'multi-momentum';
    const params = {
        minConfirmations: 3,
        rsiPeriod: parseInt(document.getElementById('estr-rsi-period').value) || 7,
        rsiHigh: parseFloat(document.getElementById('rsi-high').value) || 65,
        rsiLow: parseFloat(document.getElementById('rsi-low').value) || 35,
        stochPeriod: parseInt(document.getElementById('estr-stoch-period').value) || 14,
        smaFast: parseInt(document.getElementById('estr-sma-period').value) || 23,
        smaSlow: 21,
        bbPeriod: parseInt(document.getElementById('estr-bb-period').value) || 20,
        bbStdDev: 2
    };

    estrAddLog(`Backtest ${strategyId} iniciado (${dataHistory.length} velas)`);

    try {
        const res = await fetch(`/api/strategies/${strategyId}/backtest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candles: dataHistory, params })
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
            throw new Error(result.error || `HTTP ${res.status}`);
        }

        estrAutoSignals = Array.isArray(result.signals) ? result.signals : [];
        updateAnalysisMarkers();
        renderComparison();

        const summary = document.getElementById('estr-backtest-summary');
        if (summary) {
            summary.textContent = `Señales: ${result.stats?.signalsCount || 0} (CALL ${result.stats?.callCount || 0} / PUT ${result.stats?.putCount || 0})`;
        }
        estrAddLog(`Backtest completado: ${result.stats?.signalsCount || 0} señales`);
    } catch (error) {
        estrAddLog(`Backtest error: ${error.message}`);
    }
}

function exportMarksJson() {
    const payload = {
        exportedAt: new Date().toISOString(),
        symbol: currentSymbol,
        marks: estrMarks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estr-marks-${currentSymbol}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    estrAddLog(`Marcas exportadas: ${estrMarks.length}`);
}

function importMarksJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result || '{}'));
            const srcMarks = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.marks) ? parsed.marks : []);
            const normalized = srcMarks
                .map(m => ({
                    time: Number(m.time),
                    type: m.type === 'close' ? 'close' : 'open',
                    price: Number(m.price),
                    indicators: m.indicators || {}
                }))
                .filter(m => Number.isFinite(m.time) && Number.isFinite(m.price));

            if (!normalized.length) {
                estrAddLog('Importación sin marcas válidas');
                return;
            }

            const byTime = new Map();
            [...estrMarks, ...normalized].forEach(m => byTime.set(m.time, m));
            estrMarks = Array.from(byTime.values()).sort((a, b) => a.time - b.time);
            renderAnalysisMarksList();
            updateAnalysisMarkers();
            renderComparison();
            estrAddLog(`Marcas importadas: +${normalized.length}`);
        } catch (e) {
            estrAddLog(`Error importando JSON: ${e.message}`);
        }
    };
    reader.readAsText(file);
}

function buildOptimizerParamSets() {
    const rsiMin = parseInt(document.getElementById('opt-rsi-min')?.value || '5', 10);
    const rsiMax = parseInt(document.getElementById('opt-rsi-max')?.value || '21', 10);
    const smaMin = parseInt(document.getElementById('opt-sma-min')?.value || '10', 10);
    const smaMax = parseInt(document.getElementById('opt-sma-max')?.value || '50', 10);

    const sets = [];
    for (let r = rsiMin; r <= rsiMax; r += 2) {
        for (let s = smaMin; s <= smaMax; s += 5) {
            sets.push({
                rsiPeriod: r,
                smaFast: s,
                smaSlow: Math.max(s + 8, 21)
            });
        }
    }
    return sets;
}

function scoreSignalsAgainstMarks(signals, marks) {
    const map = new Map(signals.map(s => [s.time, s]));
    let hits = 0;
    let matches = 0;
    for (const m of marks) {
        const sig = map.get(m.time);
        if (!sig) continue;
        hits += 1;
        if (sig.type === normalizeManualType(m.type)) matches += 1;
    }
    const omissions = Math.max(marks.length - hits, 0);
    const falsePositives = Math.max(signals.length - hits, 0);
    const score = (matches * 3) - ((hits - matches) * 2) - omissions - falsePositives;
    return { score, matches, hits, omissions, falsePositives };
}

async function runOptimizerScan() {
    if (!dataHistory.length) {
        estrAddLog('Sin datos para optimizar');
        return;
    }
    if (!estrMarks.length) {
        estrAddLog('Agregue/importe marcas manuales antes de optimizar');
        return;
    }

    const strategyId = document.getElementById('strategy')?.value || 'multi-momentum';
    const paramSets = buildOptimizerParamSets();
    const resultsEl = document.getElementById('estr-optimizer-results');
    const summaryEl = document.getElementById('estr-optimizer-summary');
    if (resultsEl) resultsEl.textContent = 'Escaneando parámetros...';

    const ranking = [];
    for (let i = 0; i < paramSets.length; i++) {
        const p = paramSets[i];
        const params = {
            minConfirmations: 3,
            rsiPeriod: p.rsiPeriod,
            rsiHigh: parseFloat(document.getElementById('rsi-high').value) || 65,
            rsiLow: parseFloat(document.getElementById('rsi-low').value) || 35,
            stochPeriod: parseInt(document.getElementById('estr-stoch-period').value) || 14,
            smaFast: p.smaFast,
            smaSlow: p.smaSlow,
            bbPeriod: parseInt(document.getElementById('estr-bb-period').value) || 20,
            bbStdDev: 2
        };

        try {
            const res = await fetch(`/api/strategies/${strategyId}/backtest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candles: dataHistory, params })
            });
            const result = await res.json();
            if (!res.ok || !result.success) continue;

            const scored = scoreSignalsAgainstMarks(result.signals || [], estrMarks);
            ranking.push({ params, stats: scored, signals: result.signals || [] });
        } catch (_) {
            // skip failed combo
        }

        if (i % 10 === 0) {
            estrAddLog(`Optimizando... ${i + 1}/${paramSets.length}`);
        }
    }

    ranking.sort((a, b) => b.stats.score - a.stats.score);
    const top = ranking.slice(0, 10);

    if (!top.length) {
        if (summaryEl) summaryEl.textContent = 'Sin resultados válidos';
        if (resultsEl) resultsEl.textContent = 'No se pudieron evaluar combinaciones';
        return;
    }

    const best = top[0];
    estrAutoSignals = best.signals;
    updateAnalysisMarkers();
    renderComparison();

    if (summaryEl) {
        summaryEl.textContent = `Mejor: score ${best.stats.score} · RSI ${best.params.rsiPeriod} · SMA ${best.params.smaFast}/${best.params.smaSlow}`;
    }

    if (resultsEl) {
        resultsEl.innerHTML = top.map((r, idx) => (
            `<div style="border-bottom:1px solid #1a1a1a;padding:3px 0;">` +
            `<div><strong>#${idx + 1}</strong> score ${r.stats.score} · RSI ${r.params.rsiPeriod} · SMA ${r.params.smaFast}/${r.params.smaSlow}</div>` +
            `<div style="color:#9ca3af;">Aciertos ${r.stats.matches} · Hits ${r.stats.hits} · Omis ${r.stats.omissions} · FP ${r.stats.falsePositives}</div>` +
            `</div>`
        )).join('');
    }

    estrAddLog(`Optimización completa (${ranking.length} combinaciones evaluadas)`);
}

function renderAnalysisMarksList() {
    const container = document.getElementById('estr-marks-list');
    if (!container) return;
    const countEl = document.getElementById('estr-mark-count');
    if (countEl) countEl.textContent = `(${estrMarks.length})`;

    if (estrMarks.length === 0) {
        container.innerHTML = '<div style="color:#555;padding:8px;text-align:center;">Sin marcas</div>';
        return;
    }

    container.innerHTML = estrMarks.map((m, i) => {
        const d = new Date(m.time * 1000);
        const ind = m.indicators || {};
        const parts = [];
        if (ind.rsi !== null) parts.push(`RSI ${ind.rsi}`);
        if (ind.sma !== null) parts.push(`SMA ${ind.sma}`);
        if (ind.stoch !== null) parts.push(`Stoch ${ind.stoch}`);
        if (ind.macd !== null) parts.push(`MACD ${ind.macd}`);
        if (ind.bbUpper !== null && ind.bbLower !== null) {
            const price = m.price;
            const inBand = price >= ind.bbLower && price <= ind.bbUpper;
            parts.push(`BB ${inBand ? 'dentro' : 'fuera'}`);
        }
        return `<div style="display:flex;flex-direction:column;padding:3px 4px;border-bottom:1px solid #1a1a1a;cursor:pointer;" data-idx="${i}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:${m.type === 'open' ? '#089981' : '#f23645'};font-weight:bold;">${m.type === 'open' ? '▲' : '▼'} ${m.type.toUpperCase()}</span>
                <span style="color:#888;font-size:9px;">${d.toLocaleTimeString()}</span>
                <span style="color:#aaa;">${m.price.toFixed(2)}</span>
                <span style="color:#444;font-size:9px;">✕</span>
            </div>
            <div style="font-size:8px;color:#555;margin-top:1px;display:flex;flex-wrap:wrap;gap:2px;">${parts.map(p => `<span style="background:#1a1a1a;padding:0 3px;border-radius:2px;">${p}</span>`).join('') || '<span style="color:#444;">—</span>'}</div>
        </div>`;
    }).join('');

    container.querySelectorAll('[data-idx]').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.idx);
            estrMarks.splice(idx, 1);
            renderAnalysisMarksList();
            updateAnalysisMarkers();
            renderComparison();
            estrAddLog('Marca eliminada');
        });
    });
}

function estrAddLog(message) {
    const container = document.getElementById('estr-logs');
    if (!container) return;
    const entry = document.createElement('div');
    entry.innerHTML = `<span style="color:#666;">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    container.appendChild(entry);
    while (container.children.length > 50) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
}

// Sync: analysis input → trading input
['sma-period', 'ema-period', 'bb-period', 'rsi-period', 'stoch-period'].forEach(id => {
    document.getElementById(`estr-${id}`)?.addEventListener('input', () => {
        const v = document.getElementById(`estr-${id}`).value;
        const tradingEl = document.getElementById(id);
        if (tradingEl) tradingEl.value = v;
        updateIndicators();
        updateAnalysisIndicators();
    });
});

// Analysis indicator toggle listeners
['sma', 'ema', 'bb', 'rsi', 'stoch', 'macd'].forEach(name => {
    document.getElementById(`estr-${name}-enable`)?.addEventListener('change', updateAnalysisIndicators);
});

// Analysis mark controls
document.getElementById('estr-mark-open')?.addEventListener('click', () => {
    estrMarkType = 'open';
    document.getElementById('estr-mark-open').style.opacity = '1';
    document.getElementById('estr-mark-close').style.opacity = '0.5';
});
document.getElementById('estr-mark-close')?.addEventListener('click', () => {
    estrMarkType = 'close';
    document.getElementById('estr-mark-close').style.opacity = '1';
    document.getElementById('estr-mark-open').style.opacity = '0.5';
});
document.getElementById('estr-clear-marks')?.addEventListener('click', () => {
    estrMarks = [];
    renderAnalysisMarksList();
    updateAnalysisMarkers();
    renderComparison();
    estrAddLog('Todas las marcas eliminadas');
});
document.getElementById('estr-mark-mode')?.addEventListener('change', (e) => {
    estrAddLog(e.target.checked ? 'Modo marcado activado — haga clic en el grafico' : 'Modo marcado desactivado');
});

document.getElementById('run-backtest-trading')?.addEventListener('click', () => {
    runStrategyBacktest();
});




document.getElementById('estr-export-marks')?.addEventListener('click', () => {
    exportMarksJson();
});

document.getElementById('estr-import-marks')?.addEventListener('click', () => {
    document.getElementById('estr-import-file')?.click();
});

document.getElementById('estr-import-file')?.addEventListener('change', (e) => {
    const file = e.target?.files?.[0];
    importMarksJson(file);
    e.target.value = '';
});

document.getElementById('estr-run-optimizer')?.addEventListener('click', () => {
    runOptimizerScan();
});