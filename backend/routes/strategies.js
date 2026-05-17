import { Router } from 'express';
import strategyRegistry from '../strategies/index.js';
import StrategyEngine from '../strategies/Engine.js';

const router = Router();
const engine = new StrategyEngine();

router.get('/', (req, res) => {
  const strategies = strategyRegistry.listStrategies();
  res.json(strategies);
});

// Keep static routes before dynamic /:name
router.get('/state', (req, res) => {
  res.json(engine.getState());
});

router.get('/state/history', (req, res) => {
  res.json(engine.getHistory());
});

router.post('/state/reset', (req, res) => {
  engine.reset();
  res.json({ success: true });
});

router.get('/:name', (req, res) => {
  const metadata = strategyRegistry.getStrategyMetadata(req.params.name);
  if (!metadata) {
    return res.status(404).json({ error: 'Strategy not found' });
  }
  res.json(metadata);
});

router.post('/:name/activate', (req, res) => {
  const { name } = req.params;
  const params = req.body.params || {};

  const result = engine.setStrategy(name, params);
  if (!result.success) {
    return res.status(400).json(result);
  }

  engine.activateStrategy();
  res.json({ success: true, ...result });
});

router.post('/:name/deactivate', (req, res) => {
  const result = engine.deactivateStrategy();
  res.json(result);
});

router.post('/:name/backtest', (req, res) => {
  const { name } = req.params;
  const { candles = [], params = {} } = req.body || {};

  const exists = strategyRegistry.getStrategyMetadata(name);
  if (!exists) {
    return res.status(404).json({ success: false, error: 'Strategy not found' });
  }

  const result = engine.runBacktest(name, candles, params);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

engine.on('signal', (signal) => {
  console.log('[StrategyEngine] Signal:', signal);
});

export default router;
