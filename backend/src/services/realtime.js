import { query } from '../models/db.js';

/**
 * In-memory realtime hub.
 *
 * A single-node SSE pub/sub: each user holds a Set of open SSE responses.
 * Used by the /api/realtime/events stream so connected dashboards receive
 * inbound messages, delivery-status changes and newly-created messages
 * immediately instead of waiting for the next poll.
 *
 * NOTE: In-memory only — if the app ever runs multiple instances, replace
 * this module with a Redis pub/sub without changing the call sites.
 */

const subscribers = new Map(); // userId -> Set<res>

export function subscribeRealtime(userId, res) {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set());
  const set = subscribers.get(userId);
  set.add(res);
  res.on('close', () => {
    set.delete(res);
    if (!set.size) subscribers.delete(userId);
  });
}

export function unsubscribeRealtime(userId, res) {
  const set = subscribers.get(userId);
  if (!set) return;
  set.delete(res);
  if (!set.size) subscribers.delete(userId);
}

export function publishRealtime(userId, event) {
  if (!userId) return;
  const set = subscribers.get(userId);
  if (!set || !set.size) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    try {
      res.write(data);
    } catch {
      unsubscribeRealtime(userId, res);
    }
  }
}

/**
 * Publish an inbound-message event with the full conversation context
 * the frontend needs to place the message even if it does not have the
 * conversation cached yet.
 */
export async function publishInboundMessage({ userId, conversationId, from, to, messageId, body, category, createdAt }) {
  const { rows } = await query(
    `SELECT id, last_message, unread_count, updated_at FROM conversations WHERE id = $1`,
    [conversationId]
  );
  const conv = rows[0];
  publishRealtime(userId, {
    type: 'message.new',
    conversationId,
    contactNumber: from,
    assignedNumber: to,
    unread: conv ? conv.unread_count : 1,
    lastMessage: body,
    message: {
      id: messageId,
      direction: 'in',
      body,
      status: 'received',
      category: category || null,
      created_at: createdAt,
    },
  });
}
