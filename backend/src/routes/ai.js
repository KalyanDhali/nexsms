import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { suggestReplies } from '../services/aiEngine.js';

const router = Router();

router.use(authenticate);

// Auto-reply rules CRUD
router.get('/rules', async (req, res) => {
  const numberId = req.query.numberId || null;
  const params = [req.user.id];
  let sql = `SELECT r.*, n.number AS assigned_number
             FROM auto_reply_rules r
             LEFT JOIN numbers n ON n.id = r.number_id
             WHERE r.user_id = $1`;
  if (numberId) {
    params.push(numberId);
    sql += ` AND r.number_id = $2`;
  }
  sql += ` ORDER BY r.created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ rules: rows });
});

router.post('/rules', async (req, res) => {
  const { trigger_keyword, reply, numberId } = req.body;
  if (!trigger_keyword || !reply) return res.status(400).json({ error: 'trigger_keyword and reply are required' });
  if (numberId) {
    const { rows: owned } = await query(
      'SELECT id FROM numbers WHERE id = $1 AND assigned_user_id = $2',
      [numberId, req.user.id]
    );
    if (!owned.length) return res.status(400).json({ error: 'Number not assigned to you' });
  }
  const { rows } = await query(
    `INSERT INTO auto_reply_rules (user_id, trigger_keyword, reply, number_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, trigger_keyword, reply, numberId || null]
  );
  res.status(201).json({ rule: rows[0] });
});

router.put('/rules/:id', async (req, res) => {
  const { trigger_keyword, reply, enabled, numberId } = req.body;
  const setNumber = req.body.numberId !== undefined;
  const numberIdVal = setNumber ? (numberId || null) : null;
  if (setNumber && numberId) {
    const { rows: owned } = await query(
      'SELECT id FROM numbers WHERE id = $1 AND assigned_user_id = $2',
      [numberId, req.user.id]
    );
    if (!owned.length) return res.status(400).json({ error: 'Number not assigned to you' });
  }
  const { rows } = await query(
    `UPDATE auto_reply_rules SET
       trigger_keyword = COALESCE($2, trigger_keyword),
       reply = COALESCE($3, reply),
       enabled = COALESCE($4, enabled),
       number_id = CASE WHEN $5 THEN $6 ELSE number_id END
     WHERE id = $1 AND user_id = $7 RETURNING *`,
    [req.params.id, trigger_keyword, reply, enabled === undefined ? null : enabled, setNumber, numberIdVal, req.user.id]
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
