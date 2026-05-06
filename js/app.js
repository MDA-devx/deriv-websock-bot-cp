import { calculateSMA, calculateEMA, calculateRSI, calculateBB, calculateStochastic, calculateMACD } from '../frontend/js/modules/indicators.js';
import { analyzeMultiIndicators, detectDojiSignal } from '../frontend/js/modules/multi-indicators.js';

let currentSymbol = 'R_25';
let priceChart, rsiChart, candleSeries, smaSeries, emaSeries, bbUpperSeries, bbMiddleSeries, bbLowerSeries, rsiSeries, stochSeries, macdSeries, macdSignalSeries;
let dataHistory = [];
let ws, isConnected = false;

const signalHistory = [];
let callCount = 0;
let putCount = 0;
let winCount = 0;
let loseCount = 0;
let pendingSignals = [];
let signalTimeouts = {};
let positionOpen = false;
let positionTimer = null;
let positionTimeLeft = 60;
let activeIndicator = null;
let activeSignalType = null;
let updateInterval = null;

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
        
        candleSeries.setMarkers([{ 
            time: signalTime, 
            position: 'aboveBar', 
            color: color, 
            shape: 'arrowUp', 
            text: signalType === 'call' ? 'CALL' : 'PUT'
        }]);
        
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
    const appId = document.getElementById('app-id').value || '1089';
    const token = document.getElementById('api-token').value;
    const granularity = parseInt(document.getElementById('timeframe').value) || 60;
    currentSymbol = document.getElementById('symbol').value;

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
                    candleSeries.setData(dataHistory);
                    applyMinCandles();
                    updateIndicators();
                    subscribeOHLC();
                    isConnected = true;
                    if (updateInterval) clearInterval(updateInterval);
                    updateInterval = setInterval(() => {
                        if (isConnected && dataHistory.length > 0) updateIndicators();
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
        if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
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

window.addEventListener('load', () => { initCharts(); window.dispatchEvent(new Event('resize')); });

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