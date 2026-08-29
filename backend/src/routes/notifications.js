import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const [list, counts] = await Promise.all([
    query(
      `SELECT id, type, title, body, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 60`,
      [req.user.id]
    ),
    query(
      `SELECT COUNT(*)::int AS unread
       FROM notifications
       WHERE user_id = $1 AND read = FALSE`,
      [req.user.id]
    ),
  ]);
  res.json({ notifications: list.rows, unread: counts.rows[0].unread });
});

router.post('/read-all', async (req, res) => {
  await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
    [req.user.id]
  );
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  const { rows } = await query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
});

export default router;
