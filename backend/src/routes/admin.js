import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import { confirmPaymentOrder, failPaymentOrder } from '../services/billingService.js';
import { blockIp, unblockIp, listBlocklist, isIpWhitelisted, addWhitelistIp, removeWhitelistIp, listWhitelist } from '../services/ipGuard.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// Admin IP whitelist gate (enabled via admin_ip_whitelist toggle)
router.use(async (req, res, next) => {
  // Always allow toggle management so the gate itself can be disabled (kill switch)
  if (req.path.startsWith('/toggles')) return next();
  const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').replace(/^::ffff:/, '');
  const allowed = await isIpWhitelisted(ip);
  if (!allowed) {
    return res.status(403).json({ error: 'Admin access restricted to whitelisted IPs' });
  }
  next();
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  const [users, numbers, providers, messages, pendingDeposits, revenue, activeSubs] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'user'`),
    query(`SELECT status, COUNT(*)::int AS count FROM numbers GROUP BY status`),
    query(`SELECT type, COUNT(*)::int AS count FROM providers GROUP BY type`),
    query(`SELECT COUNT(*)::int AS total FROM messages`),
    query(`SELECT COUNT(*)::int AS total FROM payment_orders WHERE status = 'pending'`),
    query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM transactions WHERE type = 'deposit' AND status = 'completed'`),
    query(`SELECT COUNT(*)::int AS total FROM subscriptions WHERE status = 'active'`),
  ]);
  res.json({
    stats: {
      users: users.rows[0].total,
      numbers: numbers.rows.reduce((a, r) => a + r.count, 0),
      providers: providers.rows.length,
      messages: messages.rows[0].total,
      pendingDeposits: pendingDeposits.rows[0].total,
      revenue: Number(revenue.rows[0].total),
      activeSubscriptions: activeSubs.rows[0].total,
    },
  });
});

// List users with filters
router.get('/users', async (req, res) => {
  const { search, status } = req.query;
  const conditions = [`role = 'user'`];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `SELECT id, email, name, phone, role, status, balance, currency, billing_mode,
            daily_limit_override, kyc_status, created_at
     FROM users WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    params
  );
  res.json({ users: rows });
});

// Update user (admin)
router.put('/users/:id', async (req, res) => {
  const { name, email, status, balance, billing_mode, daily_limit_override, phone, password } = req.body;
  const updates = [];
  const params = [req.params.id];
  const push = (sql, val) => { if (val !== undefined) { params.push(val); updates.push(sql.replace('?', `$${params.length}`)); } };
  push('name = ?', name);
  push('email = ?', email);
  push('status = ?', status);
  push('billing_mode = ?', billing_mode);
  push('phone = ?', phone);
  if (balance !== undefined) { params.push(balance); updates.push(`balance = $${params.length}`); }
  if (daily_limit_override !== undefined) { params.push(daily_limit_override); updates.push(`daily_limit_override = $${params.length}`); }
  if (password) {
    const hashed = await hashPassword(password);
    params.push(hashed);
    updates.push(`password = $${params.length}`);
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING id, email, name, status, balance, billing_mode, daily_limit_override`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ user: rows[0] });
});

// All deposits (admin)
router.get('/deposits', async (req, res) => {
  const { status } = req.query;
  const cond = status ? 'WHERE o.status = $1' : '';
  const params = status ? [status] : [];
  const { rows } = await query(
    `SELECT o.id, o.amount, o.currency, o.status, o.txid, o.confirmations, o.risk_score, o.risk_flags, o.created_at,
            u.email AS user_email, g.name AS gateway_name, g.slug AS gateway_slug
     FROM payment_orders o
     JOIN users u ON u.id = o.user_id
     JOIN payment_gateways g ON g.id = o.gateway_id
     ${cond} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json({ deposits: rows });
});

// Feature toggles
router.get('/toggles', async (req, res) => {
  const { rows } = await query('SELECT * FROM feature_toggles ORDER BY key ASC');
  res.json({ toggles: rows });
});

router.put('/toggles/:key', async (req, res) => {
  const { enabled, config } = req.body;
  const { rows } = await query(
    `UPDATE feature_toggles SET enabled = $2, config = COALESCE($3::jsonb, config), updated_at = NOW()
     WHERE key = $1 RETURNING *`,
    [req.params.key, enabled !== false, config ? JSON.stringify(config) : null]
  );
  if (!rows.length) return res.status(404).json({ error: 'Toggle not found' });
  res.json({ toggle: rows[0] });
});

// Settings (theme, billing, currency, sms_rate, etc.)
router.get('/settings', async (req, res) => {
  const { rows } = await query('SELECT * FROM settings');
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json({ settings: map });
});

router.put('/settings/:key', async (req, res) => {
  const { rows } = await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING *`,
    [req.params.key, JSON.stringify(req.body)]
  );
  res.json({ setting: rows[0] });
});

// Audit log
router.get('/audit', async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, u.email AS admin_email FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT 100`
  );
  res.json({ audit: rows });
});

// --- Fraud prevention ---

// Orders needing review (hold) + all orders with risk info
router.get('/fraud/orders', async (req, res) => {
  const { status } = req.query;
  const cond = status ? 'WHERE o.status = $1' : '';
  const params = status ? [status] : [];
  const { rows } = await query(
    `SELECT o.id, o.amount, o.currency, o.status, o.risk_score, o.risk_flags, o.txid, o.confirmations,
            o.ip, o.created_at, u.email AS user_email, g.name AS gateway_name, g.type AS gateway_type
     FROM payment_orders o
     JOIN users u ON u.id = o.user_id
     JOIN payment_gateways g ON g.id = o.gateway_id
     ${cond} ORDER BY (o.status = 'hold') DESC, o.created_at DESC LIMIT 200`,
    params
  );
  res.json({ orders: rows });
});

// Approve a held/risky order (confirm with optional confirmations)
router.post('/fraud/orders/:id/approve', async (req, res) => {
  try {
    const { txid, confirmations } = req.body || {};
    const result = await confirmPaymentOrder(req.params.id, { txid, confirmations });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject a held/risky order
router.post('/fraud/orders/:id/reject', async (req, res) => {
  await failPaymentOrder(req.params.id);
  res.json({ ok: true });
});

// IP blocklist
router.get('/fraud/blocklist', async (req, res) => {
  const rows = await listBlocklist();
  res.json({ blocklist: rows });
});

router.post('/fraud/blocklist', async (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  await blockIp(ip, reason || null, req.user.id);
  res.json({ ok: true, ip });
});

router.delete('/fraud/blocklist/:ip', async (req, res) => {
  await unblockIp(req.params.ip);
  res.json({ ok: true });
});

// Analytics
router.get('/analytics', async (req, res) => {
  const [total, providers, daily, topUsers] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE status IN ('sent','delivered'))::int AS delivered,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
              COALESCE(SUM(cost),0)::numeric AS cost
       FROM messages`
    ),
    query(
      `SELECT p.name, COUNT(m.id)::int AS messages, COALESCE(SUM(m.cost),0)::numeric AS cost
       FROM messages m JOIN providers p ON p.id = m.provider_id
       GROUP BY p.name ORDER BY messages DESC`
    ),
    query(
      `SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
              COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE status IN ('sent','delivered'))::int AS delivered
       FROM messages WHERE created_at >= NOW() - interval '14 days'
       GROUP BY day ORDER BY day`
    ),
    query(
      `SELECT u.email, COUNT(m.id)::int AS messages, COALESCE(SUM(m.cost),0)::numeric AS cost
       FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN users u ON u.id = c.user_id
       GROUP BY u.email ORDER BY messages DESC LIMIT 10`
    ),
  ]);
  res.json({
    totals: total.rows[0],
    providers: providers.rows,
    daily: daily.rows,
    topUsers: topUsers.rows,
  });
});

// Admin: manage user API keys
router.get('/keys', async (req, res) => {
  const { rows } = await query(
    `SELECT k.id, k.name, k.prefix, k.active, k.last_used_at, k.created_at, u.email
     FROM api_keys k JOIN users u ON u.id = k.user_id ORDER BY k.created_at DESC`
  );
  res.json({ keys: rows });
});

router.post('/keys/:id/revoke', async (req, res) => {
  const { rows } = await query(`UPDATE api_keys SET active = FALSE WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'API key not found' });
  res.json({ ok: true });
});

// Admin IP whitelist
router.get('/whitelist', async (req, res) => {
  res.json({ whitelist: await listWhitelist() });
});

router.post('/whitelist', async (req, res) => {
  const { ip, note } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  await addWhitelistIp(ip, note || null);
  res.json({ ok: true, ip });
});

router.delete('/whitelist/:ip', async (req, res) => {
  await removeWhitelistIp(req.params.ip);
  res.json({ ok: true });
});

// KYC review queue
router.get('/kyc', async (req, res) => {
  const { status = 'pending' } = req.query;
  const { rows } = await query(
    `SELECT k.*, u.email, u.name AS user_name, u.kyc_status
     FROM kyc_submissions k JOIN users u ON u.id = k.user_id
     WHERE k.status = $1 ORDER BY k.submitted_at DESC`,
    [status]
  );
  res.json({ submissions: rows });
});

router.post('/kyc/:id/approve', async (req, res) => {
  const { rows } = await query(
    `UPDATE kyc_submissions SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2
     WHERE id = $1 AND status = 'pending' RETURNING id, user_id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Submission not found or already reviewed' });
  await query(`UPDATE users SET kyc_status = 'verified', updated_at = NOW() WHERE id = $1`, [rows[0].user_id]);
  res.json({ ok: true });
});

router.post('/kyc/:id/reject', async (req, res) => {
  const { note } = req.body;
  const { rows } = await query(
    `UPDATE kyc_submissions SET status = 'rejected', note = $3, reviewed_at = NOW(), reviewed_by = $2
     WHERE id = $1 AND status = 'pending' RETURNING id, user_id`,
    [req.params.id, req.user.id, note || null]
  );
  if (!rows.length) return res.status(404).json({ error: 'Submission not found or already reviewed' });
  await query(`UPDATE users SET kyc_status = 'rejected', updated_at = NOW() WHERE id = $1`, [rows[0].user_id]);
  res.json({ ok: true });
});

export default router;
