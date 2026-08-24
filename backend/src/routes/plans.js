import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public: list active plans (also available to logged-in users for purchase UI)
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, price, sms_quota, daily_limit_per_number, description, features, sort_order
     FROM plans WHERE active = TRUE ORDER BY sort_order ASC`
  );
  res.json({ plans: rows });
});

// Admin: full list including inactive
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM plans ORDER BY sort_order ASC`
  );
  res.json({ plans: rows });
});

// Admin: create plan
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, slug, price, sms_quota, daily_limit_per_number, description, features, active, sort_order } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });

  try {
    const { rows } = await query(
      `INSERT INTO plans (name, slug, price, sms_quota, daily_limit_per_number, description, features, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) RETURNING *`,
      [name, slug, price || 0, sms_quota || 0, daily_limit_per_number || 0, description || '', JSON.stringify(features || []), active !== false, sort_order || 0]
    );
    res.status(201).json({ plan: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Plan slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Admin: update plan
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, slug, price, sms_quota, daily_limit_per_number, description, features, active, sort_order } = req.body;
  const { rows } = await query(
    `UPDATE plans SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       price = COALESCE($4, price),
       sms_quota = COALESCE($5, sms_quota),
       daily_limit_per_number = COALESCE($6, daily_limit_per_number),
       description = COALESCE($7, description),
       features = COALESCE($8::jsonb, features),
       active = COALESCE($9, active),
       sort_order = COALESCE($10, sort_order)
     WHERE id = $1 RETURNING *`,
    [req.params.id, name, slug, price, sms_quota, daily_limit_per_number, description, features ? JSON.stringify(features) : null, active, sort_order]
  );
  if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
  res.json({ plan: rows[0] });
});

// Admin: delete plan
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await query('DELETE FROM plans WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
  res.json({ ok: true });
});

export default router;
