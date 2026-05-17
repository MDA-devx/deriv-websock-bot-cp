import fs from 'fs';

const candles = JSON.parse(fs.readFileSync('/home/salmarina/deriv/temp/candles_1440_R25_M1.json', 'utf8'));
const backtest = JSON.parse(fs.readFileSync('/home/salmarina/deriv/temp/backtest_result_adaptive_confluence_1440_R25_M1.json', 'utf8'));

const horizon = 5; // candles ahead for proxy outcome
const candleByTime = new Map(candles.map(c => [Number(c.time), c]));
const indexByTime = new Map(candles.map((c, i) => [Number(c.time), i]));

const signals = Array.isArray(backtest.signals) ? backtest.signals : [];

let evaluated = 0;
let wins = 0;
let losses = 0;
let flats = 0;
let skipped = 0;
let callCount = 0;
let putCount = 0;

const perSignal = [];

for (const s of signals) {
  const t = Number(s.time);
  const idx = indexByTime.get(t);
  if (idx === undefined) { skipped++; continue; }
  const entry = candles[idx]?.close;
  const future = candles[idx + horizon]?.close;
  if (!Number.isFinite(entry) || !Number.isFinite(future)) { skipped++; continue; }

  const dir = String(s.type || '').toUpperCase();
  if (dir === 'CALL') callCount++;
  if (dir === 'PUT') putCount++;

  const delta = future - entry;
  let outcome = 'flat';

  if (Math.abs(delta) < 1e-12) {
    flats++;
  } else if ((dir === 'CALL' && delta > 0) || (dir === 'PUT' && delta < 0)) {
    outcome = 'win';
    wins++;
  } else {
    outcome = 'loss';
    losses++;
  }

  evaluated++;
  perSignal.push({
    time: t,
    type: dir,
    entry,
    future,
    horizon,
    delta,
    outcome
  });
}

const winRate = evaluated > 0 ? (wins / evaluated) : 0;
const lossRate = evaluated > 0 ? (losses / evaluated) : 0;

const report = {
  strategy: 'adaptive-confluence',
  dataset: 'candles_1440_R25_M1',
  timeframe: '1m',
  horizonCandles: horizon,
  totals: {
    signals: signals.length,
    evaluated,
    skipped,
    callCount,
    putCount,
    wins,
    losses,
    flats,
    winRate,
    lossRate
  },
  notes: 'Proxy quality metric: compares entry close vs close after N candles. Not a full PnL model (no spread/slippage/expiry modeling).',
  perSignal
};

const out = '/home/salmarina/deriv/temp/quality_report_adaptive_confluence_1440_R25_M1.json';
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out, totals: report.totals }, null, 2));
