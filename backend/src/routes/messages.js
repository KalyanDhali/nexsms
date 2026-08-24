import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  sendNow,
  scheduleMessage,
  getDailyLimit,
  getDailyUsage,
  getBurstLimit,
} from '../services/messageService.js';
import { checkBurst } from '../services/burstLimit.js';

const router = Router();

router.use(authenticate);

// GET conversation list for current user
router.get('/conversations', async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, n.number AS assigned_number
     FROM conversations c
     JOIN numbers n ON n.id = c.number_id
     WHERE c.user_id = $1 AND c.archived = FALSE
     ORDER BY c.updated_at DESC`,
    [req.user.id]
  );
  res.json({ conversations: rows });
});

// GET messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  const { rows: conv } = await query(
    'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!conv.length) return res.status(404).json({ error: 'Conversation not found' });

  await query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [req.params.id]);

  const { rows } = await query(
    `SELECT id, direction, body, status, cost, scheduled_at, delivered_at, error, created_at AS time
     FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ messages: rows });
});

// GET delivery status of a single message
router.get('/messages/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.status, m.message_sid, m.delivered_at, m.scheduled_at, m.error, m.cost,
            p.name AS provider_name
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE m.id = $1 AND c.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: rows[0] });
});

// List scheduled messages for current user
router.get('/scheduled', async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.body, m.scheduled_at, m.status, n.number AS from_number, c.contact_number AS to_number
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN numbers n ON n.id = c.number_id
     WHERE c.user_id = $1 AND m.status = 'scheduled'
     ORDER BY m.scheduled_at ASC`,
    [req.user.id]
  );
  res.json({ messages: rows });
});

// Cancel a scheduled message
router.post('/scheduled/:id/cancel', async (req, res) => {
  const { rows } = await query(
    `UPDATE messages m SET status = 'cancelled'
     FROM conversations c
     WHERE m.id = $1 AND c.id = m.conversation_id AND c.user_id = $2 AND m.status = 'scheduled'
     RETURNING m.id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Scheduled message not found' });
  res.json({ ok: true });
});

// Create conversation
router.post('/conversations', async (req, res) => {
  const { numberId, contactNumber } = req.body;
  if (!numberId || !contactNumber) return res.status(400).json({ error: 'numberId and contactNumber required' });

  const { rows: numberRows } = await query(
    'SELECT id FROM numbers WHERE id = $1 AND assigned_user_id = $2',
    [numberId, req.user.id]
  );
  if (!numberRows.length) return res.status(400).json({ error: 'Number not assigned to you' });

  const { rows } = await query(
    `INSERT INTO conversations (user_id, number_id, contact_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, number_id, contact_number) DO UPDATE SET archived = FALSE, updated_at = NOW()
     RETURNING id`,
    [req.user.id, numberId, contactNumber]
  );
  res.status(201).json({ conversationId: rows[0].id });
});

// Send SMS — supports immediate send or scheduled (scheduledAt in future)
router.post('/send', async (req, res) => {
  const { to, fromNumberId, body, scheduledAt } = req.body;
  let conversationId = req.body.conversationId;
  let numberId = fromNumberId;
  let contactNumber = to;

  if (!body || !body.trim()) return res.status(400).json({ error: 'Message body required' });

  try {
    // Resolve or create conversation
    if (conversationId) {
      const { rows } = await query(
        'SELECT c.*, n.number FROM conversations c JOIN numbers n ON n.id = c.number_id WHERE c.id = $1 AND c.user_id = $2',
        [conversationId, req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Conversation not found' });
      numberId = rows[0].number_id;
      contactNumber = rows[0].contact_number;
    } else {
      if (!numberId || !to) return res.status(400).json({ error: 'numberId and to required' });
      const { rows } = await query(
        'SELECT id, number FROM numbers WHERE id = $1 AND assigned_user_id = $2',
        [numberId, req.user.id]
      );
      if (!rows.length) return res.status(400).json({ error: 'Number not assigned to you' });

      const { rows: conv } = await query(
        `INSERT INTO conversations (user_id, number_id, contact_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, number_id, contact_number) DO UPDATE SET archived = FALSE, updated_at = NOW()
         RETURNING id`,
        [req.user.id, numberId, to]
      );
      conversationId = conv[0].id;
    }

    // --- Scheduled send ---
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduledAt' });
      }
      if (scheduledDate.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'scheduledAt must be in the future' });
      }
      const messageId = await scheduleMessage({
        userId: req.user.id,
        conversationId,
        body,
        scheduledAt: scheduledDate.toISOString(),
      });
      return res.status(201).json({ messageId, status: 'scheduled', scheduledAt: scheduledDate.toISOString() });
    }

    // --- Immediate send ---

    // Burst rate limit (per-user sliding window)
    const burstLimit = await getBurstLimit();
    const burst = checkBurst(req.user.id, burstLimit);
    if (!burst.allowed) {
      return res.status(429).json({
        error: 'Too many messages, slow down',
        retryAfterMs: Math.max(burst.retryAfterMs, 100),
      });
    }

    // Insert message as pending first so it exists for accounting/tracking
    const { rows: msg } = await query(
      `INSERT INTO messages (conversation_id, direction, body, status, cost)
       SELECT $1, 'out', $2, 'pending', COALESCE((SELECT (value->>'rate')::numeric FROM settings WHERE key = 'sms_rate'), 0.0079)
       RETURNING id`,
      [conversationId, body]
    );

    const result = await sendNow({
      userId: req.user.id,
      numberId,
      conversationId,
      contactNumber,
      body,
      messageId: msg[0].id,
    });

    res.json(result);
  } catch (err) {
    console.error('Send SMS error:', err);

    if (err.code === 'LIMIT_REACHED') {
      const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [numberId]);
      const limitConfig = await getDailyLimit(req.user, numberRows[0]);
      const used = await getDailyUsage(numberId);
      return res.status(429).json({ error: err.message, limit: limitConfig, used, resetIn: '24 hours' });
    }
    if (err.code === 'INSUFFICIENT_BALANCE') {
      return res.status(402).json({ error: err.message, cost: err.cost });
    }
    if (err.code === 'QUOTA_EXHAUSTED' || err.code === 'NO_SUBSCRIPTION') {
      return res.status(402).json({ error: err.message });
    }
    if (err.code === 'KYC_REQUIRED') {
      return res.status(403).json({ error: err.message, code: err.code });
    }

    if (conversationId && body) {
      await query(
        `UPDATE messages SET status = 'failed', error = $2
         WHERE conversation_id = $1 AND direction = 'out' AND status = 'pending'`,
        [conversationId, err.message]
      );
    }
    res.status(500).json({ error: err.message || 'Failed to send SMS' });
  }
});

export default router;
