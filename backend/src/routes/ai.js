import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { suggestReplies } from '../services/aiEngine.js';

const router = Router();

router.use(authenticate);

// Auto-reply rules CRUD
router.get('/rules', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM auto_reply_rules WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ rules: rows });
});

router.post('/rules', async (req, res) => {
  const { trigger_keyword, reply } = req.body;
  if (!trigger_keyword || !reply) return res.status(400).json({ error: 'trigger_keyword and reply are required' });
  const { rows } = await query(
    `INSERT INTO auto_reply_rules (user_id, trigger_keyword, reply) VALUES ($1,$2,$3) RETURNING *`,
    [req.user.id, trigger_keyword, reply]
  );
  res.status(201).json({ rule: rows[0] });
});

router.put('/rules/:id', async (req, res) => {
  const { trigger_keyword, reply, enabled } = req.body;
  const { rows } = await query(
    `UPDATE auto_reply_rules SET
       trigger_keyword = COALESCE($2, trigger_keyword),
       reply = COALESCE($3, reply),
       enabled = COALESCE($4, enabled)
     WHERE id = $1 AND user_id = $5 RETURNING *`,
    [req.params.id, trigger_keyword, reply, enabled === undefined ? null : enabled, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule: rows[0] });
});

router.delete('/rules/:id', async (req, res) => {
  const { rows } = await query(
    `DELETE FROM auto_reply_rules WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Rule not found' });
  res.json({ ok: true });
});

// Smart reply suggestions for an inbound text
router.get('/suggestions', async (req, res) => {
  const { text } = req.query;
  const suggestions = await suggestReplies(req.user.id, text || '');
  res.json({ suggestions });
});

export default router;
