import fs from 'fs';
import StrategyEngine from '../backend/strategies/Engine.js';

const candles = JSON.parse(fs.readFileSync('/home/salmarina/deriv/temp/candles_1440_R25_M1.json', 'utf8'));
const engine = new StrategyEngine();

const params = {
  minConfirmations: 3,
  rsiPeriod: 7,
  rsiHigh: 70,
  rsiLow: 30,
  stochPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  smaFast: 9,
  smaSlow: 21,
  bbPeriod: 20,
  bbStdDev: 2,
  enabled: { rsi: true, stoch: true, macd: true, sma: true, bb: true }
};

const result = engine.runBacktest('multi-momentum', candles, params);
fs.writeFileSync('/home/salmarina/deriv/temp/backtest_result_1440_R25_M1.json', JSON.stringify(result, null, 2));

const signals = Array.isArray(result.signals) ? result.signals : [];
const call = signals.filter(s => s.action === 'CALL').length;
const put = signals.filter(s => s.action === 'PUT').length;

const rows = [
  ['Symbol', 'R_25'],
  ['Granularity', '60s (1m)'],
  ['Candles', String(candles.length)],
  ['Backtest success', String(result.success)],
  ['Strategy', String(result.strategyId || '-')],
  ['Processed', String(result.processed || '-')],
  ['Signals total', String(signals.length)],
  ['CALL signals', String(call)],
  ['PUT signals', String(put)],
  ['First epoch', String(candles[0]?.time ?? '-')],
  ['Last epoch', String(candles[candles.length - 1]?.time ?? '-')],
];

const keyW = Math.max(...rows.map(r => r[0].length));
console.log('BACKTEST RESULT TABLE');
console.log('-'.repeat(keyW + 30));
for (const [k, v] of rows) {
  console.log(`${k.padEnd(keyW)} | ${v}`);
}
console.log('-'.repeat(keyW + 30));
console.log('Saved: /home/salmarina/deriv/temp/backtest_result_1440_R25_M1.json');
