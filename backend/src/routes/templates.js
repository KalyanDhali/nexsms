import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// List templates: system (user_id NULL) + my own
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, category, body, user_id, created_at
     FROM templates WHERE user_id IS NULL OR user_id = $1
     ORDER BY user_id NULLS FIRST, created_at DESC`,
    [req.user.id]
  );
  res.json({ templates: rows });
});

// Create a template (user) or system template (admin)
router.post('/', async (req, res) => {
  const { name, category, body } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'name and body are required' });
  const isAdmin = req.user.role === 'admin';
  const { rows } = await query(
    `INSERT INTO templates (name, category, body, user_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, category || 'general', body, isAdmin ? null : req.user.id]
  );
  res.status(201).json({ template: rows[0] });
});

// Update — only if owner or system template (admin)
router.put('/:id', async (req, res) => {
  const { name, category, body } = req.body;
  const { rows } = await query(
    `UPDATE templates SET name = COALESCE($2, name), category = COALESCE($3, category), body = COALESCE($4, body)
     WHERE id = $1 AND (user_id = $5 OR (user_id IS NULL AND $6)) RETURNING *`,
    [req.params.id, name, category, body, req.user.id, req.user.role === 'admin']
  );
  if (!rows.length) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: rows[0] });
});

// Delete — owner or admin
router.delete('/:id', async (req, res) => {
  const { rows } = await query(
    `DELETE FROM templates WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $3)) RETURNING id`,
    [req.params.id, req.user.id, req.user.role === 'admin']
  );
  if (!rows.length) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
});

// Admin: full list including inactive / all users' templates
router.get('/all', authorize('admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, u.email AS user_email FROM templates t
     LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`
  );
  res.json({ templates: rows });
});

export default router;
