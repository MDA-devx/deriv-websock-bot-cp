import MultiMomentumStrategy from './MultiMomentumStrategy.js';

const strategies = {
  'multi-momentum': MultiMomentumStrategy
};

const metadata = {
  'multi-momentum': {
    name: 'Multi-Momentum',
    description: 'Estrategia multi-indicador: RSI + Stochastic + MACD + SMA + BB para alto volumen',
    defaultParams: {
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
      enabled: {
        rsi: true,
        stoch: true,
        macd: true,
        sma: true,
        bb: true
      }
    }
  }
};

function getStrategy(name, params = {}) {
  const StrategyClass = strategies[name.toLowerCase()];
  if (!StrategyClass) {
    throw new Error(`Strategy '${name}' not found`);
  }
  return new StrategyClass(params);
}

function listStrategies() {
  return Object.keys(metadata).map(key => ({
    id: key,
    ...metadata[key]
  }));
}

function getStrategyMetadata(name) {
  return metadata[name.toLowerCase()] || null;
}

function getAvailableNames() {
  return Object.keys(strategies);
}

export default {
  getStrategy,
  listStrategies,
  getStrategyMetadata,
  getAvailableNames
};