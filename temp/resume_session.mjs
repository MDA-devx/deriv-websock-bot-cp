import fs from 'fs';
import { execSync, spawn } from 'child_process';

const ROOT = '/home/salmarina/deriv';
const TEMP = ROOT + '/temp';
const HERMES = ROOT + '/.hermes';
const CANDLES_FILE = TEMP + '/candles_1440_R25_M1.json';
const SESSION_CONTEXT = HERMES + '/SESSION_CONTEXT.md';

function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 30000 }).trim(); }
  catch (e) { return '[ERROR] ' + e.message; }
}

const startedAt = new Date().toISOString();

console.log('');
console.log('  ' + '='.repeat(60));
console.log('  DERIV - Resume Session');
console.log('  ' + startedAt);
console.log('  ' + '='.repeat(60));
console.log('');

// 1. Git
console.log('[1/6] Git state');
const gitLog    = sh('git log --oneline -10');
const gitStatus = sh('git status --short');
const gitBranch = sh('git rev-parse --abbrev-ref HEAD');
const gitCommit = sh('git rev-parse HEAD');
console.log('  Branch: ' + gitBranch);
console.log('  HEAD:   ' + gitCommit);

// 2. Candle data
console.log('\n[2/6] Candle data');
const candleInfo = (function() {
  try {
    const c = JSON.parse(fs.readFileSync(CANDLES_FILE, 'utf8'));
    return c.length + ' candles, ' + new Date(c[0]?.time * 1000).toISOString() + ' -> ' + new Date(c[c.length-1]?.time * 1000).toISOString();
  } catch { return '(not found)'; }
})();
console.log('  ' + candleInfo);

// 3. Hermes plans
console.log('\n[3/6] Hermes plans');
const plans = fs.readdirSync(HERMES + '/plans').filter(f => f.endsWith('.md'));
plans.forEach(p => console.log('  - ' + p));

// 4. Run backtests
console.log('\n[4/6] Re-run backtests');
const backtestDefs = [
  ['Multi-Momentum',      TEMP + '/run_backtest_1440.mjs',       TEMP + '/backtest_result_1440_R25_M1.json'],
  ['Adaptive-Confluence', TEMP + '/backtest_adaptive_confluence_1440.mjs', TEMP + '/backtest_result_adaptive_confluence_1440_R25_M1.json'],
];
const btResults = [];
for (const [label, script, outFile] of backtestDefs) {
  if (!fs.existsSync(script)) { console.log('  [SKIP] ' + script); continue; }
  try {
    execSync('node ' + script, { cwd: ROOT, timeout: 60000, encoding: 'utf8', stdio: 'pipe' });
    const r = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const s = r.stats || {};
    btResults.push([label, s.signalsCount || 0, s.callCount || 0, s.putCount || 0]);
    console.log('  [OK] ' + label + ': ' + (s.signalsCount || 0) + ' signals');
  } catch (e) {
    btResults.push([label, 'ERR', '-', '-']);
    console.log('  [FAIL] ' + label + ': ' + e.message);
  }
}

// Quality report
let qualityStr = '(not available)';
try {
  execSync('node ' + TEMP + '/quality_report_adaptive_confluence.mjs', { cwd: ROOT, timeout: 30000, encoding: 'utf8', stdio: 'pipe' });
  const q = JSON.parse(fs.readFileSync(TEMP + '/quality_report_adaptive_confluence_1440_R25_M1.json', 'utf8'));
  const t = q.totals || {};
  qualityStr = 'Win rate ' + (t.winRate * 100).toFixed(1) + '% (' + t.wins + '/' + t.evaluated + ')';
  console.log('  [OK] Quality: ' + qualityStr);
} catch (e) {
  console.log('  [FAIL] Quality: ' + e.message);
}

// 5. Write session context
console.log('\n[5/6] Writing session context');

const planSummaries = plans.map(p => {
  const c = fs.readFileSync(HERMES + '/plans/' + p, 'utf8');
  const title = c.split('\n')[0].replace(/^#\s*/, '');
  return '- **' + p + '**: ' + title;
}).join('\n');

const btTable = btResults.map(r =>
  '| ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + r[3] + ' |'
).join('\n');

const ctxLines = [
  '# Session Context - Generated ' + startedAt,
  '',
  '## Current State',
  '- **Branch:** ' + gitBranch,
  '- **HEAD:** ' + gitCommit,
  '- **Recent commits:**',
  gitLog.split('\n').map(l => '  - ' + l).join('\n'),
  '',
  '## Backtest Results',
  '| Strategy | Signals | CALL | PUT |',
  '|---|---|---|---|',
  btTable,
  '',
  '## Quality (Adaptive-Confluence)',
  qualityStr,
  '',
  '## Hermes Plans',
  planSummaries,
  '',
  '## Progress (from 2dos-global plan)',
  '- **Phase 0 (Prep):** Complete - inventory, signal contract, bridge decision',
  '- **Phase 1 (Backtest):** Partial - endpoint works, scripts run, UI pending',
  '- **Phase 2-6:** Not started',
  '',
  '## Resume Work',
  'Run `node temp/resume_session.mjs` to regenerate this context and start the server.',
  'Open http://localhost:3002/ for the dashboard.',
];

fs.mkdirSync(HERMES, { recursive: true });
fs.writeFileSync(SESSION_CONTEXT, ctxLines.join('\n'));
console.log('  [OK] ' + SESSION_CONTEXT);

// 6. Start server
console.log('\n[6/6] Starting server on port 3002\n');

const server = spawn('node', ['backend/server.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3002' }
});

console.log('  PID: ' + server.pid);
console.log('  URL: http://localhost:3002/');
console.log('  Context: ' + SESSION_CONTEXT);
console.log('');

process.on('SIGINT', () => { server.kill(); process.exit(0); });
process.on('SIGTERM', () => { server.kill(); process.exit(0); });
