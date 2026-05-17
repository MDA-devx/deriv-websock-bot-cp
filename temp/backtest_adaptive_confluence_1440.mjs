import fs from 'fs';
import StrategyEngine from '../backend/strategies/Engine.js';

const candlesPath = '/home/salmarina/deriv/temp/candles_1440_R25_M1.json';
const candles = JSON.parse(fs.readFileSync(candlesPath, 'utf8'));

const params = {
  emaFast: 20,
  emaSlow: 50,
  rsiPeriod: 14,
  rsiBullMin: 45,
  rsiBullMax: 70,
  rsiBearMin: 30,
  rsiBearMax: 55,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  bbPeriod: 20,
  bbStdDev: 2,
  minScore: 3,
  coolDownCandles: 8
};

const engine = new StrategyEngine();
const result = engine.runBacktest('adaptive-confluence', candles, params);

const outPath = '/home/salmarina/deriv/temp/backtest_result_adaptive_confluence_1440_R25_M1.json';
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

const signals = Array.isArray(result.signals) ? result.signals : [];
const call = signals.filter(s => s.type === 'CALL').length;
const put = signals.filter(s => s.type === 'PUT').length;

const summary = {
  strategy: 'adaptive-confluence',
  symbol: 'R_25',
  timeframe: '1m',
  candles: candles.length,
  success: result.success,
  processed: result.processed,
  signalsTotal: signals.length,
  callSignals: call,
  putSignals: put,
  firstEpoch: candles[0]?.time ?? null,
  lastEpoch: candles[candles.length - 1]?.time ?? null,
  outputJson: outPath
};

const summaryPath = '/home/salmarina/deriv/temp/backtest_summary_adaptive_confluence_1440_R25_M1.json';
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
