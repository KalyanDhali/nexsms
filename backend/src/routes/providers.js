import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { runHealthCheck, healthCheckAll } from '../services/providerService.js';
import { getProviderAdapter } from '../adapters/index.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// List all providers (never return raw credentials)
router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id, name, type, active, priority, health, country_routing, created_at FROM providers ORDER BY priority ASC');
  res.json({ providers: rows });
});

// Get single provider (masked credentials)
router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Provider not found' });
  const p = rows[0];
  const masked = {};
  for (const [k, v] of Object.entries(p.credentials || {})) {
    masked[k] = v ? '••••••••' : '';
  }
  res.json({ ...p, credentials: masked });
});

// Create provider
router.post('/', async (req, res) => {
  const { name, type, credentials, priority = 0, country_routing = {} } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const { rows } = await query(
    `INSERT INTO providers (name, type, credentials, priority, country_routing)
     VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
     RETURNING id, name, type, active, priority, health`,
    [name, type, JSON.stringify(credentials || {}), priority, JSON.stringify(country_routing)]
  );
  res.status(201).json({ provider: rows[0] });
});

// Update provider
router.put('/:id', async (req, res) => {
  const { name, type, credentials, active, priority, country_routing } = req.body;
  const { rows } = await query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Provider not found' });
  const cur = rows[0];

  // Merge credentials: only overwrite fields that are not masked
  const mergedCreds = { ...(cur.credentials || {}) };
  if (credentials) {
    for (const [k, v] of Object.entries(credentials)) {
      if (v && v !== '••••••••') mergedCreds[k] = v;
    }
  }

  const { rows: updated } = await query(
    `UPDATE providers SET
       name = COALESCE($2, name),
       type = COALESCE($3, type),
       credentials = $4::jsonb,
       active = COALESCE($5, active),
       priority = COALESCE($6, priority),
       country_routing = COALESCE($7::jsonb, country_routing),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, type, active, priority, health`,
    [
      req.params.id,
      name || null,
      type || null,
      JSON.stringify(mergedCreds),
      active === undefined ? null : active,
      priority === undefined ? null : priority,
      country_routing === undefined ? null : JSON.stringify(country_routing),
    ]
  );
  res.json({ provider: updated[0] });
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  const { rows } = await query('SELECT active FROM providers WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Provider not found' });
  const newActive = !rows[0].active;
  await query('UPDATE providers SET active = $2, updated_at = NOW() WHERE id = $1', [req.params.id, newActive]);
  res.json({ active: newActive });
});

// Health check one provider
router.post('/:id/health', async (req, res) => {
  const result = await runHealthCheck(req.params.id);
  res.json(result);
});

// Health check all providers
router.post('/health-check-all', async (req, res) => {
  const results = await healthCheckAll();
  res.json({ results });
});

// Test connection with current credentials (from body, not saved)
router.post('/test-connection', async (req, res) => {
  const { type, credentials } = req.body;
  if (!type || !credentials) return res.status(400).json({ error: 'type and credentials required' });
  try {
    const mod = await import(new URL(`../adapters/${type}.js`, import.meta.url));
    const adapter = new mod.default({ id: null, name: 'test', type, credentials });
    const ok = await adapter.healthCheck();
    res.json({ ok, message: ok ? 'Connection successful' : 'Connection failed' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// Delete provider
router.delete('/:id', async (req, res) => {
  await query('DELETE FROM providers WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
