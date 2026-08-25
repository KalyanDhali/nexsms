import { Router } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { query } from '../models/db.js';
import { subscribeRealtime, unsubscribeRealtime } from '../services/realtime.js';

const router = Router();

// GET /api/realtime/events — Server-Sent Events stream.
// EventSource cannot send Authorization headers, so the access token is
// accepted via ?token= query param (same JWT the api client uses).
router.get('/events', async (req, res) => {
  const header = req.headers.authorization;
  const token = req.query.token || (header && header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let userId;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { rows } = await query('SELECT id, status FROM users WHERE id = $1', [userId]);
  if (!rows.length) return res.status(401).json({ error: 'User not found' });
  if (rows[0].status !== 'active') return res.status(403).json({ error: 'Account is disabled' });

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.setTimeout(0);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, userId })}\n\n`);

  subscribeRealtime(rows[0].id, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribeRealtime(rows[0].id, res);
  });
});

export default router;
