import { query } from '../models/db.js';

export async function createNotification({ userId, type, title, body }) {
  try {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, type, title, body || null]
    );
    return rows[0];
  } catch {
    return null;
  }
}

export async function notifyOnInbound(userId, from, body) {
  await createNotification({
    userId,
    type: 'inbound',
    title: 'New SMS received',
    body: `${from}: ${String(body || '').slice(0, 80)}`,
  });
}
