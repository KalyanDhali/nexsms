import { query } from '../models/db.js';

/**
 * IP protection — blocklist backed by DB, gated by the 'ip_blocklist'
 * feature toggle so admins can turn the whole guard on/off without code.
 */

export async function isIpBlocked(ip) {
  if (!ip) return false;
  const { rows: toggle } = await query(
    `SELECT enabled FROM feature_toggles WHERE key = 'ip_blocklist'`
  );
  const enabled = toggle.length ? toggle[0].enabled : false;
  if (!enabled) return false;

  const { rows } = await query('SELECT reason FROM ip_blocklist WHERE ip = $1', [ip]);
  return rows.length ? { blocked: true, reason: rows[0].reason } : { blocked: false };
}

export async function blockIp(ip, reason = null, adminId = null) {
  await query(
    `INSERT INTO ip_blocklist (ip, reason, blocked_by) VALUES ($1, $2, $3)
     ON CONFLICT (ip) DO UPDATE SET reason = COALESCE(EXCLUDED.reason, ip_blocklist.reason)`,
    [ip, reason, adminId]
  );
}

export async function unblockIp(ip) {
  await query('DELETE FROM ip_blocklist WHERE ip = $1', [ip]);
}

export async function listBlocklist() {
  const { rows } = await query(
    `SELECT b.ip, b.reason, b.created_at, u.email AS blocked_by_email
     FROM ip_blocklist b LEFT JOIN users u ON u.id = b.blocked_by
     ORDER BY b.created_at DESC`
  );
  return rows;
}

/**
 * Record a user's IP on login for risk context.
 */
export async function recordLoginIp(userId, ip) {
  if (!ip) return;
  await query(
    `INSERT INTO user_ips (user_id, ip, seen_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, ip) DO UPDATE SET seen_at = NOW()`,
    [userId, ip]
  );
}

/**
 * Recent deposit velocity from a given IP (flash-deposit / carding signal).
 */
export async function getIpVelocity(ip, minutes = 10) {
  if (!ip) return 0;
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM payment_orders
     WHERE ip = $1 AND created_at > NOW() - make_interval(mins => $2)`,
    [ip, minutes]
  );
  return rows[0].count;
}
