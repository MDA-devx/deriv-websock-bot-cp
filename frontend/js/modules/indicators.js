// Indicator calculation functions
export function calculateSMA(data, period) {
    return data.map((d, i) => {
        if (i < period - 1) return { time: d.time, value: null };
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        return { time: d.time, value: sum / period };
    });
}

export function calculateEMA(data, period) {
    if (data.length === 0) return [];
    let k = 2 / (period + 1);
    let ema = data[0].close;
    return data.map(d => {
        ema = (d.close - ema) * k + ema;
        return { time: d.time, value: ema };
    });
}

export function calculateRSI(data, period) {
    let res = [];
    if (data.length < period + 1) return data.map(d => ({ time: d.time, value: null }));
    
    for (let i = 0; i < data.length; i++) {
        if (i < period) { res.push({ time: data[i].time, value: null }); continue; }
        let gains = 0, losses = 0;
        for (let j = i - period + 1; j <= i; j++) {
            let diff = data[j].close - data[j - 1].close;
            diff >= 0 ? gains += diff : losses -= diff;
        }
        let rs = gains / (losses || 1);
        res.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
    }
    return res;
}

export function calculateBB(data, period) {
    let upper = [], lower = [];
    data.forEach((d, i) => {
        if (i < period - 1) { upper.push({ time: d.time, value: null }); lower.push({ time: d.time, value: null }); return; }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        let avg = sum / period;
        let sqSum = 0;
        for (let j = 0; j < period; j++) sqSum += Math.pow(data[i - j].close - avg, 2);
        let sd = Math.sqrt(sqSum / period);
        upper.push({ time: d.time, value: avg + sd * 2 });
        lower.push({ time: d.time, value: avg - sd * 2 });
    });
    return { upper, lower };
}