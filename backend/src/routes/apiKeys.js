import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../utils/apiKey.js';

const router = Router();

router.use(authenticate);

// List my API keys
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, prefix, active, last_used_at, created_at
     FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ keys: rows });
});

// Generate a new API key (raw key returned once)
router.post('/', async (req, res) => {
  const { name } = req.body;

  const { rows: toggle } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'user_api'`);
  const enabled = toggle.length ? toggle[0].enabled : false;
  if (!enabled) {
    return res.status(403).json({ error: 'API access is disabled by admin' });
  }

  const { key, prefix } = generateApiKey();
  const { rows } = await query(
    `INSERT INTO api_keys (user_id, name, key_hash, prefix)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [req.user.id, name || 'Default', hashApiKey(key), prefix]
  );
  res.status(201).json({ key: { id: rows[0].id, name: name || 'Default', prefix }, rawKey: key });
});

// Revoke a key
router.post('/:id/revoke', async (req, res) => {
  const { rows } = await query(
    `UPDATE api_keys SET active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'API key not found' });
  res.json({ ok: true });
});

export default router;
