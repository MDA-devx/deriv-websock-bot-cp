import strategyRegistry from './index.js';

class StrategyEngine {
  constructor() {
    this.activeStrategy = null;
    this.candleData = [];
    this.listeners = new Map();
    this.isRunning = false;
    this.lastSignal = null;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('[StrategyEngine] Error in listener:', e.message);
      }
    });
  }

  setStrategy(strategyName, params = {}) {
    try {
      const strategy = strategyRegistry.getStrategy(strategyName, params);
      
      if (this.activeStrategy) {
        this.activeStrategy.deactivate();
      }
      
      this.activeStrategy = strategy;
      console.log(`[StrategyEngine] Strategy set to: ${strategyName}`);
      
      this.emit('strategy_changed', {
        name: strategyName,
        metadata: strategy.getMetadata()
      });
      
      return { success: true, metadata: strategy.getMetadata() };
    } catch (e) {
      console.error('[StrategyEngine] Error setting strategy:', e.message);
      return { success: false, error: e.message };
    }
  }

  activateStrategy() {
    if (!this.activeStrategy) {
      return { success: false, error: 'No strategy set' };
    }
    
    this.activeStrategy.activate();
    this.activeStrategy.on('signal', (signal) => {
      this.lastSignal = { ...signal, timestamp: Date.now() };
      this.emit('signal', this.lastSignal);
    });
    
    console.log('[StrategyEngine] Strategy activated');
    this.isRunning = true;
    return { success: true };
  }

  deactivateStrategy() {
    if (!this.activeStrategy) {
      return { success: false, error: 'No strategy set' };
    }
    
    this.activeStrategy.deactivate();
    console.log('[StrategyEngine] Strategy deactivated');
    this.isRunning = false;
    return { success: true };
  }

  updateParams(params) {
    if (!this.activeStrategy) {
      return { success: false, error: 'No strategy set' };
    }
    
    this.activeStrategy.setParams(params);
    return { success: true };
  }

  addCandle(candle) {
    this.candleData.push(candle);
    if (this.candleData.length > 5000) {
      this.candleData.shift();
    }
    
    this.analyze();
  }

  setHistory(candles) {
    this.candleData = [...candles];
  }

  getHistory() {
    return [...this.candleData];
  }

  analyze() {
    if (!this.activeStrategy || !this.isRunning) {
      return null;
    }
    
    if (this.candleData.length < 2) {
      return null;
    }
    
    const result = this.activeStrategy.analyze(this.candleData, {});
    return result;
  }

  getActiveStrategy() {
    return this.activeStrategy ? this.activeStrategy.getMetadata() : null;
  }

  getLastSignal() {
    return this.lastSignal;
  }

  getState() {
    return {
      isRunning: this.isRunning,
      strategy: this.getActiveStrategy(),
      lastSignal: this.lastSignal,
      dataPoints: this.candleData.length
    };
  }

  reset() {
    this.candleData = [];
    this.lastSignal = null;
    if (this.activeStrategy) {
      this.activeStrategy.reset();
    }
  }
}

export default StrategyEngine;