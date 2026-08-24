import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendSmsWithFailover } from '../services/providerService.js';

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
    `SELECT id, direction, body, status, cost, created_at AS time
     FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ messages: rows });
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

// Send SMS — the core send endpoint with daily limit + cost deduction + failover
router.post('/send', async (req, res) => {
  const { to, fromNumberId, body } = req.body;
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

    const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [numberId]);
    const number = numberRows[0];

    // --- Daily per-number limit check ---
    const limitConfig = await getDailyLimit(req.user, number);
    if (limitConfig) {
      const today = new Date().toISOString().slice(0, 10);
      const { rows: usageRows } = await query(
        `SELECT count FROM daily_limits WHERE number_id = $1 AND send_date = $2`,
        [numberId, today]
      );
      const used = usageRows.length ? usageRows[0].count : 0;
      if (used >= limitConfig) {
        return res.status(429).json({
          error: 'Daily send limit reached for this number',
          limit: limitConfig,
          used,
          resetIn: '24 hours',
        });
      }
    }

    // --- Cost & balance check ---
    const smsRate = await getSmsRate();
    const cost = smsRate * 1;
    if (req.user.billing_mode === 'prepaid') {
      if (Number(req.user.balance) < cost) {
        return res.status(402).json({ error: 'Insufficient balance', cost });
      }
    } else {
      // subscription: check quota
      const { rows: sub } = await query(
        `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
        [req.user.id]
      );
      if (sub.length && sub[0].sms_used >= sub[0].sms_quota) {
        const billingSettings = await getBillingSettings();
        if (billingSettings.quotaExhausted === 'block') {
          return res.status(402).json({ error: 'Monthly SMS quota exhausted' });
        }
      }
    }

    // --- Insert message as pending ---
    const { rows: msg } = await query(
      `INSERT INTO messages (conversation_id, direction, body, status, cost)
       VALUES ($1, 'out', $2, 'pending', $3) RETURNING id`,
      [conversationId, body, cost]
    );

    // --- Send via provider with failover ---
    const fromNumber = number.number;
    const result = await sendSmsWithFailover({ from: fromNumber, to: contactNumber, body });

    // --- Update message + conversation ---
    await query(
      `UPDATE messages SET status = 'sent', provider_id = $2, message_sid = $3 WHERE id = $1`,
      [msg[0].id, result.providerId, result.sid]
    );
    await query(
      `UPDATE conversations SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [conversationId, body]
    );

    // --- Deduct cost for prepaid ---
    if (req.user.billing_mode === 'prepaid') {
      await deductBalance(req.user.id, cost, msg[0].id);
    } else {
      const { rows: sub } = await query(
        `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
        [req.user.id]
      );
      if (sub.length) {
        await query('UPDATE subscriptions SET sms_used = sms_used + 1 WHERE id = $1', [sub[0].id]);
      }
    }

    // --- Increment daily counter ---
    await incrementDailyCount(numberId);

    res.json({
      messageId: msg[0].id,
      sid: result.sid,
      provider: result.providerName,
      cost,
      status: 'sent',
    });
  } catch (err) {
    console.error('Send SMS error:', err);
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

async function getDailyLimit(user, number) {
  const { rows: settings } = await query(
    `SELECT value FROM settings WHERE key = 'billing'`
  );
  const billing = settings[0]?.value || {};

  // Per-user override first
  if (user.daily_limit_override) return Number(user.daily_limit_override);

  // Then subscription plan limit
  const { rows: sub } = await query(
    `SELECT s.*, p.daily_limit_per_number FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1`,
    [user.id]
  );
  if (sub.length && sub[0].daily_limit_per_number) {
    return Number(sub[0].daily_limit_per_number);
  }

  // Pay-per-sms default (admin configurable)
  const { rows: pp } = await query(`SELECT value FROM settings WHERE key = 'pay_per_sms_limit'`);
  if (pp.length && pp[0].value.daily) return Number(pp[0].value.daily);

  return 50; // safe default
}

async function getSmsRate() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'sms_rate'`);
  if (rows.length && rows[0].value.rate) return Number(rows[0].value.rate);
  return 0.0079; // default ~Twilio rate
}

async function getBillingSettings() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'billing'`);
  return rows[0]?.value || {};
}

async function deductBalance(userId, cost, messageId) {
  await query(
    `UPDATE users SET balance = balance - $2 WHERE id = $1`,
    [userId, cost]
  );
  const { rows } = await query('SELECT balance FROM users WHERE id = $1', [userId]);
  await query(
    `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
     VALUES ($1, 'sms_cost', $2, $3, $4, 'completed')`,
    [userId, -cost, rows[0].balance, messageId]
  );
}

async function incrementDailyCount(numberId) {
  const today = new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO daily_limits (number_id, send_date, count) VALUES ($1, $2, 1)
     ON CONFLICT (number_id, send_date) DO UPDATE SET count = daily_limits.count + 1`,
    [numberId, today]
  );
}

export default router;
