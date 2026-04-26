import { calculateSMA, calculateEMA, calculateRSI, calculateBB } from '../frontend/js/modules/indicators.js';

let currentSymbol = 'R_25';
let priceChart, rsiChart, candleSeries, smaSeries, emaSeries, bbUpperSeries, bbLowerSeries, rsiSeries;
let dataHistory = [];
let ws, isConnected = false;

const signalHistory = [];
let callCount = 0;
let putCount = 0;

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
        </div>`;
    rContainer.innerHTML = '<div class="chart-label">RSI</div>';

    pContainer.style.minHeight = '300px';
    rContainer.style.minHeight = '120px';

    document.getElementById('zoom-in').onclick = () => {
        const opts = priceChart.timeScale().options();
        priceChart.timeScale().applyOptions({ rightOffset: clampZoom(opts.rightOffset + 5), barSpacing: Math.max(4, (opts.barSpacing || 8) - 1) });
    };
    document.getElementById('zoom-out').onclick = () => {
        const opts = priceChart.timeScale().options();
        priceChart.timeScale().applyOptions({ rightOffset: clampZoom(opts.rightOffset - 5), barSpacing: (opts.barSpacing || 8) + 1 });
    };
    document.getElementById('fit-content').onclick = () => {
        priceChart.timeScale().fitContent();
        const minCandles = parseInt(document.getElementById('min-candles').value) || 24;
        setTimeout(() => priceChart.timeScale().applyOptions({ rightOffset: clampZoom(minCandles) }), 50);
    };

    console.log('[CHART] Creating price chart...');
    priceChart = LightweightCharts.createChart(pContainer, { ...chartOptions, height: pContainer.clientHeight || 300 });
    console.log('[CHART] Price chart created:', !!priceChart);
    rsiChart = LightweightCharts.createChart(rContainer, { ...chartOptions, height: rContainer.clientHeight || 120 });
    console.log('[CHART] RSI chart created:', !!rsiChart);

    candleSeries = priceChart.addCandlestickSeries({
        upColor: '#089981', downColor: '#f23645',
        borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645',
    });
    console.log('[CHART] Candle series:', !!candleSeries);
    
    smaSeries = priceChart.addLineSeries({ color: '#2962ff', lineWidth: 2, title: 'SMA' });
    emaSeries = priceChart.addLineSeries({ color: '#f23645', lineWidth: 1, title: 'EMA' });
    bbUpperSeries = priceChart.addLineSeries({ color: 'rgba(255,255,255,0.15)', lineWidth: 1, lineStyle: 2 });
    bbLowerSeries = priceChart.addLineSeries({ color: 'rgba(255,255,255,0.15)', lineWidth: 1, lineStyle: 2 });

    rsiSeries = rsiChart.addLineSeries({ color: '#ff9800', lineWidth: 2, title: 'RSI' });

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
        const smaP = parseInt(document.getElementById('sma-period').value) || 23;
        const emaP = parseInt(document.getElementById('ema-period').value) || 10;
        const rsiP = parseInt(document.getElementById('rsi-period').value) || 7;
        const bbP = parseInt(document.getElementById('bb-period').value) || 20;

        const smaData = document.getElementById('sma-enabled').checked ? calculateSMA(dataHistory, smaP).filter(d => d.value !== null) : [];
        const emaData = document.getElementById('ema-enabled').checked ? calculateEMA(dataHistory, emaP) : [];
        const rsiData = document.getElementById('rsi-enabled').checked ? calculateRSI(dataHistory, rsiP).filter(d => d.value !== null) : [];
        const bb = document.getElementById('bb-enabled').checked ? calculateBB(dataHistory, bbP) : { upper: [], lower: [] };

        if (smaSeries) smaSeries.setData(smaData);
        if (emaSeries) emaSeries.setData(emaData);
        if (bbUpperSeries) bbUpperSeries.setData(bb.upper.filter(d => d.value !== null));
        if (bbLowerSeries) bbLowerSeries.setData(bb.lower.filter(d => d.value !== null));
        
        if (rsiSeries) {
            if (document.getElementById('rsi-enabled').checked) {
                rsiSeries.setData(rsiData);
                rsiSeries.applyOptions({ visible: true });
            } else {
                rsiSeries.applyOptions({ visible: false });
            }
        }

        if (rsiData.length >= 2) {
            const currentRsi = rsiData[rsiData.length - 1].value;
            const prevRsi = rsiData[rsiData.length - 2].value;
            if (currentRsi !== null && prevRsi !== null) processSignals(currentRsi, prevRsi);
        }
    } catch (error) { console.warn('Indicator error:', error); }
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
    };
}

function disconnect() {
    if (ws) ws.close();
    isConnected = false;
}

function requestHistory() {
    const gran = parseInt(document.getElementById('timeframe').value) || 60;
    ws.send(JSON.stringify({ ticks_history: currentSymbol, end: 'latest', start: Math.floor(Date.now() / 1000) - 28800, style: 'candles', granularity: gran }));
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

function processSignals(currentRsi, prevRsi) {
    const rsiHigh = parseFloat(document.getElementById('rsi-high').value) || 65;
    const rsiLow = parseFloat(document.getElementById('rsi-low').value) || 35;
    let signal = null;
    let trend = '';

    if (currentRsi > rsiHigh && currentRsi > prevRsi) { signal = 'call'; trend = 'RSI > ' + rsiHigh; }
    else if (currentRsi < rsiLow && currentRsi < prevRsi) { signal = 'put'; trend = 'RSI < ' + rsiLow; }

    addLog(`RSI: ${currentRsi.toFixed(1)} | Prev: ${prevRsi.toFixed(1)} | ${trend || 'neutral'}`);
    
    if (signal && candleSeries && dataHistory.length > 0) {
        const lastCandle = dataHistory[dataHistory.length - 1];
        const color = signal === 'call' ? '#089981' : '#f23645';
        const icon = signal === 'call' ? '▲' : '▼';
        
        candleSeries.setMarkers([{ time: lastCandle.time, position: 'aboveBar', color: color, shape: 'arrowUp', text: signal === 'call' ? 'A' : 'V' }]);
        addLog(`¡SEÑAL ${signal.toUpperCase()}!`, signal);
        
        signalHistory.unshift({ type: signal, time: lastCandle.time, price: lastCandle.close });
        if (signalHistory.length > 20) signalHistory.pop();
        
        if (signal === 'call') callCount++; else putCount++;
        updateResults();
        
        if (document.getElementById('sound-alert').checked) {
            try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU').play().catch(() => {}); } catch (e) {}
        }
    }
}

function updateResults() {
    document.getElementById('signal-count').textContent = callCount + putCount;
    document.getElementById('call-count').textContent = callCount;
    document.getElementById('put-count').textContent = putCount;
    document.getElementById('last-signal').textContent = signalHistory[0] ? (signalHistory[0].type === 'call' ? '▲ CALL' : '▼ PUT') : '--';
    document.getElementById('last-signal').className = 'value ' + (signalHistory[0]?.type === 'call' ? 'call' : signalHistory[0]?.type === 'put' ? 'put' : '');
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

window.addEventListener('load', () => { initCharts(); window.dispatchEvent(new Event('resize')); });

function addLog(message, type = '') {
    const container = document.getElementById('logs-container');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    container.appendChild(entry);
    while (container.children.length > 100) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
}