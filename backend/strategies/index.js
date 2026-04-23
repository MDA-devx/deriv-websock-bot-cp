import RSIStrategy from './RSIStrategy.js';
import SMAEMACrossoverStrategy from './SMAEMACrossoverStrategy.js';
import BBStrategy from './BBStrategy.js';

const strategies = {
  'rsi': RSIStrategy,
  'rsi-oversold': RSIStrategy,
  'sma-ema-crossover': SMAEMACrossoverStrategy,
  'bollinger-bands': BBStrategy,
  'bb': BBStrategy
};

const metadata = {
  'rsi': {
    name: 'RSI',
    description: 'RSI momentum strategy - Buy when oversold, Sell when overbought',
    defaultParams: { period: 7, highLevel: 65, lowLevel: 35 }
  },
  'rsi-oversold': {
    name: 'RSI (Oversold Only)',
    description: 'RSI - Only buy when oversold',
    defaultParams: { period: 7, highLevel: 80, lowLevel: 35 }
  },
  'sma-ema-crossover': {
    name: 'SMA/EMA Crossover',
    description: 'Buy when EMA crosses above SMA, Sell when EMA crosses below SMA',
    defaultParams: { smaPeriod: 23, emaPeriod: 10 }
  },
  'bollinger-bands': {
    name: 'Bollinger Bands',
    description: 'Buy when price touches lower band, Sell when touches upper band',
    defaultParams: { period: 20, stdDev: 2 }
  },
  'bb': {
    name: 'Bollinger Bands',
    description: 'Buy when price touches lower band, Sell when touches upper band',
    defaultParams: { period: 20, stdDev: 2 }
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