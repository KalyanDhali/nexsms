import { Router } from 'express';
import { query } from '../models/db.js';
import { apiKeyAuth } from '../middleware/apiKey.js';
import { sendNow, scheduleMessage, getDailyLimit, getDailyUsage } from '../services/messageService.js';
import { getActiveSubscription } from '../services/billingService.js';

const router = Router();

router.use(apiKeyAuth);

// POST /api/v1/sms/send — send an SMS from one of the user's numbers
router.post('/sms/send', async (req, res) => {
  const { to, from, fromNumberId, body, scheduledAt } = req.body;

  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });
  if (!to) return res.status(400).json({ error: 'to is required' });

  let numberRow;
  let conversationId;
  try {
    if (fromNumberId) {
      const { rows } = await query(
        'SELECT * FROM numbers WHERE id = $1 AND assigned_user_id = $2 AND status = $3',
        [fromNumberId, req.user.id, 'assigned']
      );
      numberRow = rows[0];
    } else if (from) {
      const { rows } = await query(
        `SELECT * FROM numbers WHERE number = $1 AND assigned_user_id = $2 AND status = 'assigned'`,
        [from, req.user.id]
      );
      numberRow = rows[0];
    } else {
      // Default to user's primary number
      const { rows } = await query(
        `SELECT * FROM numbers WHERE assigned_user_id = $1 AND status = 'assigned'
         ORDER BY primary_number DESC LIMIT 1`,
        [req.user.id]
      );
      numberRow = rows[0];
    }
    if (!numberRow) {
      return res.status(400).json({ error: 'No assigned number matches `from`' });
    }

    // Resolve or create conversation
    const { rows: conv } = await query(
      `INSERT INTO conversations (user_id, number_id, contact_number)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, number_id, contact_number) DO UPDATE SET archived = FALSE, updated_at = NOW()
       RETURNING id`,
      [req.user.id, numberRow.id, to]
    );
    conversationId = conv[0].id;

    // Scheduled send
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);      if (isNaN(scheduledDate.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });
      if (scheduledDate.getTime() <= Date.now()) return res.status(400).json({ error: 'scheduledAt must be in the future' });
      const messageId = await scheduleMessage({
        userId: req.user.id, conversationId, body, scheduledAt: scheduledDate.toISOString(),
      });
      return res.status(201).json({ messageId, status: 'scheduled', scheduledAt: scheduledDate.toISOString() });
    }

    // Immediate send
    const { rows: msg } = await query(
      `INSERT INTO messages (conversation_id, direction, body, status, cost)
       SELECT $1, 'out', $2, 'pending', COALESCE((SELECT (value->>'rate')::numeric FROM settings WHERE key = 'sms_rate'), 0.0079)
       RETURNING id`,
      [conversationId, body]
    );

    const result = await sendNow({
      userId: req.user.id,
      numberId: numberRow.id,
      conversationId,
      contactNumber: to,
      body,
      messageId: msg[0].id,
    });

    res.json({
      messageId: result.messageId,
      status: result.status,
      provider: result.providerName,
      cost: result.cost,
      payFrom: result.payFrom,
      sid: result.sid,
    });
  } catch (err) {
    console.error('[api v1] send error:', err);
    if (err.code === 'LIMIT_REACHED') {
      const limitConfig = await getDailyLimit(req.user, numberRow);
      const used = await getDailyUsage(numberRow.id);
      return res.status(429).json({ error: err.message, limit: limitConfig, used, resetIn: '24 hours' });
    }
    if (err.code === 'INSUFFICIENT_BALANCE') return res.status(402).json({ error: err.message, cost: err.cost });
    if (err.code === 'QUOTA_EXHAUSTED' || err.code === 'NO_SUBSCRIPTION') return res.status(402).json({ error: err.message });

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

// GET /api/v1/sms/:messageId — delivery status
router.get('/sms/:messageId', async (req, res) => {
  const { rows } = await query(
    `SELECT m.id AS messageId, m.status, m.message_sid AS sid, m.delivered_at, m.scheduled_at, m.error, m.cost,
            p.name AS provider
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE m.id = $1 AND c.user_id = $2`,
    [req.params.messageId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: rows[0] });
});

// GET /api/v1/balance — current balance + subscription usage
router.get('/balance', async (req, res) => {
  const sub = await getActiveSubscription(req.user.id);
  res.json({
    balance: Number(req.user.balance),
    currency: req.user.currency,
    billing_mode: req.user.billing_mode,
    subscription: sub
      ? { plan: sub.plan_name, sms_used: sub.sms_used, sms_quota: sub.sms_quota, renews_at: sub.renews_at }
      : null,
  });
});

export default router;
