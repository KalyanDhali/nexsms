import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';

const router = Router();

router.use(authenticate, authorize('admin'));

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

export default router;
