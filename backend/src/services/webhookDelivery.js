import crypto from 'crypto';
import { query } from '../models/db.js';

/**
 * Fire a user webhook. Every active webhook subscribed to the event
 * receives a POST with an optional HMAC-SHA256 signature header so the
 * user can verify authenticity. Fire-and-forget: delivery failures are
 * logged, not retried (keeps the send pipeline simple).
 */
export async function fireWebhook(userId, event, payload) {
  try {
    const { rows } = await query(
      `SELECT * FROM user_webhooks WHERE user_id = $1 AND active = TRUE AND events @> $2::jsonb`,
      [userId, JSON.stringify([event])]
    );
    for (const w of rows) {
      const body = JSON.stringify({ event, ts: new Date().toISOString(), data: payload });
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'NexSMS-Webhook/1.0' };
      if (w.secret) {
        headers['X-NexSMS-Signature'] = crypto.createHmac('sha256', w.secret).update(body).digest('hex');
      }
      fetch(w.url, { method: 'POST', headers, body })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
        .catch((err) => console.error(`[webhook] delivery to ${w.url} failed (${event}):`, err.message));
    }
  } catch (err) {
    console.error('[webhook] fireWebhook error:', err.message);
  }
}
