import { Router } from 'express';
import configManager from '../config/ConfigManager.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(configManager.getAll());
});

router.get('/:key', (req, res) => {
  const value = configManager.get(req.params.key);
  if (value === null) {
    return res.status(404).json({ error: 'Key not found' });
  }
  res.json({ key: req.params.key, value });
});

router.post('/', (req, res) => {
  const { key, value } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value required' });
  }
  
  configManager.set(key, value);
  res.json({ success: true, key, value: configManager.get(key) });
});

router.put('/:key', (req, res) => {
  const { value } = req.body;
  
  if (value === undefined) {
    return res.status(400).json({ error: 'value required' });
  }
  
  configManager.set(req.params.key, value);
  res.json({ success: true, key: req.params.key, value: configManager.get(req.params.key) });
});

router.post('/save', (req, res) => {
  try {
    configManager.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    configManager.load();
    res.json({ success: true, config: configManager.getAll() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;