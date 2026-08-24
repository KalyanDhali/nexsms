import crypto from 'crypto';
import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

const VALID_EVENTS = ['sent', 'delivered', 'failed', 'inbound'];

function makeSecret() {
  return crypto.randomBytes(16).toString('hex');
}

// List my webhooks
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT id, url, events, secret, active, created_at FROM user_webhooks WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ webhooks: rows });
});

// Create
router.post('/', async (req, res) => {
  const { url, events } = req.body;
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Valid url required' });
  const evs = Array.isArray(events) && events.length
    ? events.filter((e) => VALID_EVENTS.includes(e))
    : ['delivered'];
  if (!evs.length) return res.status(400).json({ error: 'No valid events' });
  const { rows } = await query(
    `INSERT INTO user_webhooks (user_id, url, events, secret) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, url, JSON.stringify(evs), makeSecret()]
  );
  res.status(201).json({ webhook: rows[0] });
});

// Update (url / events / active)
router.put('/:id', async (req, res) => {
  const { url, events, active } = req.body;
  const evs = Array.isArray(events) ? events.filter((e) => VALID_EVENTS.includes(e)) : undefined;
  const { rows } = await query(
    `UPDATE user_webhooks SET
       url = COALESCE($2, url),
       events = COALESCE($3, events),
       active = COALESCE($4, active)
     WHERE id = $1 AND user_id = $5 RETURNING *`,
    [req.params.id, url || null, evs ? JSON.stringify(evs) : null, active === undefined ? null : active, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ webhook: rows[0] });
});

// Delete
router.delete('/:id', async (req, res) => {
  const { rows } = await query(
    `DELETE FROM user_webhooks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ ok: true });
});

export default router;
