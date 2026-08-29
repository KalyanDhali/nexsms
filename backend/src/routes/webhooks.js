import { Router } from 'express';
import { query } from '../models/db.js';
import { getProviderAdapter } from '../adapters/index.js';
import { categorizeMessage, findAutoReply } from '../services/aiEngine.js';
import { fireWebhook } from '../services/webhookDelivery.js';
import { publishRealtime, publishInboundMessage } from '../services/realtime.js';
import { notifyOnInbound } from '../services/notificationService.js';

const router = Router();

// POST /api/webhooks/:providerType — inbound SMS + delivery status from providers
router.post('/:providerType', async (req, res) => {
  const providerType = req.params.providerType;

  // Look up the provider by type. If multiple, use the first matching one.
  const { rows: providers } = await query(
    'SELECT * FROM providers WHERE type = $1 ORDER BY priority ASC LIMIT 1',
    [providerType]
  );
  if (!providers.length) {
    return res.status(404).json({ error: 'No provider configured for this type' });
  }
  const providerRow = providers[0];

  try {
    const adapter = await getProviderAdapter(providerRow);

    // Try inbound message parse first
    const inbound = await adapter.parseInbound(req);
    if (inbound) {
      const { to, from, body, sid } = inbound;
      await handleInboundMessage({ providerId: providerRow.id, to, from, body, sid });
      return res.status(200).json({ ok: true, type: 'inbound' });
    }

    // Then try delivery status parse
    const status = await adapter.parseStatus(req);
    if (status) {
      await handleStatusUpdate({ sid: status.sid, status: status.status, error: status.error });
      return res.status(200).json({ ok: true, type: 'status' });
    }

    // Unknown webhook payload
    return res.status(200).json({ ok: true, type: 'ignored' });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

async function handleInboundMessage({ providerId, to, from, body, sid }) {
  // to = our assigned number, from = contact who messaged us
  const { rows: numbers } = await query(
    'SELECT id, assigned_user_id FROM numbers WHERE number = $1',
    [to]
  );
  if (!numbers.length || !numbers[0].assigned_user_id) {
    console.error(`[inbound] no assigned number found for ${to}`);
    return;
  }
  const number = numbers[0];

  // Find or create conversation
  const { rows: convRows } = await query(
    `SELECT id FROM conversations
     WHERE user_id = $1 AND number_id = $2 AND contact_number = $3`,
    [number.assigned_user_id, number.id, from]
  );
  let conversationId;
  if (convRows.length) {
    conversationId = convRows[0].id;
  } else {
    const { rows: created } = await query(
      `INSERT INTO conversations (user_id, number_id, contact_number)
       VALUES ($1, $2, $3) RETURNING id`,
      [number.assigned_user_id, number.id, from]
    );
    conversationId = created[0].id;
  }

  const category = categorizeMessage(body);
  const { rows: msgRows } = await query(
    `INSERT INTO messages (conversation_id, direction, body, status, provider_id, message_sid, category)
     VALUES ($1, 'in', $2, 'received', $3, $4, $5)
     RETURNING id, created_at`,
    [conversationId, body, providerId, sid, category]
  );

  await query(
    `UPDATE conversations SET last_message = $2, last_message_at = NOW(), unread_count = unread_count + 1, updated_at = NOW() WHERE id = $1`,
    [conversationId, body]
  );

  // Notify the user's webhook subscribers of the inbound message
  fireWebhook(number.assigned_user_id, 'inbound', {
    number: to,
    from,
    body,
    conversationId,
    messageSid: sid,
  });

  // Push the inbound message to connected dashboards in real time
  publishInboundMessage({
    userId: number.assigned_user_id,
    conversationId,
    from,
    to,
    messageId: msgRows[0].id,
    body,
    category,
    createdAt: msgRows[0].created_at,
  });

  // In-app notification for the inbound SMS
  await notifyOnInbound(number.assigned_user_id, from, body);

  // Read receipt: when the contact replies, our previous outbound
  // messages in this thread count as read.
  const { rows: readRows } = await query(
    `UPDATE messages SET read_at = NOW()
     WHERE conversation_id = $1 AND direction = 'out' AND read_at IS NULL
       AND status IN ('sent','delivered')
     RETURNING id`,
    [conversationId]
  );
  if (readRows.length) {
    publishRealtime(number.assigned_user_id, {
      type: 'messages.read',
      conversationId,
      messageIds: readRows.map((r) => r.id),
    });
  }

  // Smart auto-reply (config-driven, gated by ai_features toggle)
  const reply = await findAutoReply(number.assigned_user_id, body, number.id);
  if (reply) {
    try {
      const { rows: msg } = await query(
        `INSERT INTO messages (conversation_id, direction, body, status, cost)
         SELECT $1, 'out', $2, 'pending', COALESCE((SELECT (value->>'rate')::numeric FROM settings WHERE key = 'sms_rate'), 0.0079)
         RETURNING id`,
        [conversationId, reply]
      );
      const { sendNow } = await import('../services/messageService.js');
      await sendNow({
        userId: number.assigned_user_id,
        numberId: number.id,
        conversationId,
        contactNumber: from,
        body: reply,
        messageId: msg[0].id,
      });
      console.log(`[auto-reply] replied to ${from}`);
    } catch (err) {
      console.error('[auto-reply] failed:', err.message);
      await query(
        `UPDATE messages SET status = 'failed', error = $2
         WHERE conversation_id = $1 AND direction = 'out' AND status = 'pending'`,
        [conversationId, err.message]
      );
    }
  }
}

async function handleStatusUpdate({ sid, status, error }) {
  if (!sid) return;
  const statusMap = {
    sent: 'sent',
    delivered: 'delivered',
    delivered_to_handset: 'delivered',
    failed: 'failed',
    undelivered: 'failed',
  };
  const mapped = statusMap[status] || status;
  const { rows: updated } = await query(
    `UPDATE messages SET status = $2, delivered_at = CASE WHEN $2 = 'delivered' THEN NOW() ELSE delivered_at END, error = $3 WHERE message_sid = $1 RETURNING id, conversation_id`,
    [sid, mapped, error || null]
  );
  if (mapped === 'delivered') {
    // mark conversation as no longer unread for outbound delivered (optional future)
  }
  if (updated.length) {
    const { rows: conv } = await query(
      `SELECT user_id FROM conversations WHERE id = $1`,
      [updated[0].conversation_id]
    );
    if (conv.length) {
      fireWebhook(conv[0].user_id, mapped, { sid, messageId: updated[0].id, status: mapped, error: error || null });
      publishRealtime(conv[0].user_id, {
        type: 'message.updated',
        conversationId: updated[0].conversation_id,
        message: {
          id: updated[0].id,
          status: mapped,
          delivered_at: mapped === 'delivered' ? new Date().toISOString() : undefined,
          error: mapped === 'failed' ? (error || null) : undefined,
        },
      });
    }
  }
}

export default router;
