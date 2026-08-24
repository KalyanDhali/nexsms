import { query } from '../models/db.js';
import { hashApiKey } from '../utils/apiKey.js';

/**
 * Authenticate a request using a NexSMS API key.
 * Header: Authorization: Bearer nex_live_...
 * Gates on the 'user_api' feature toggle. Marks last_used_at.
 */
export async function apiKeyAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!key) {
    return res.status(401).json({ error: 'API key required (Authorization: Bearer <key>)' });
  }

  // Feature toggle gate
  const { rows: toggle } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'user_api'`);
  const enabled = toggle.length ? toggle[0].enabled : false;
  if (!enabled) {
    return res.status(403).json({ error: 'API access is disabled by admin' });
  }

  const hash = hashApiKey(key);
  const { rows } = await query(
    `SELECT k.id AS key_id, k.name AS key_name, u.id, u.email, u.status, u.billing_mode,
            u.balance, u.currency, u.daily_limit_override
     FROM api_keys k JOIN users u ON u.id = k.user_id
     WHERE k.key_hash = $1 AND k.active = TRUE`,
    [hash]
  );
  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const user = rows[0];
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account is disabled' });
  }

  await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [user.key_id]);

  req.user = user;
  req.apiKeyId = user.key_id;
  next();
}
