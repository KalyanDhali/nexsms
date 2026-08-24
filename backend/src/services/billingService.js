import { query } from '../models/db.js';
import { checkFlashUsdt } from './riskService.js';

/**
 * Billing + payment order core logic.
 * Payment orders are the single funnel for both wallet deposits and
 * subscription purchases: once a payment order is confirmed the
 * corresponding side-effect (balance credit / subscription activation)
 * is applied.
 */

export async function getBillingSettings() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'billing'`);
  return rows[0]?.value || { prepaid: true, subscription: true, hybrid: false, quotaExhausted: 'block' };
}

export async function setBillingSettings(patch) {
  const current = await getBillingSettings();
  const next = { ...current, ...patch };
  await query(
    `INSERT INTO settings (key, value) VALUES ('billing', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(next)]
  );
  return next;
}

export async function getActiveSubscription(userId) {
  const { rows } = await query(
    `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.price, p.sms_quota, p.daily_limit_per_number, p.description, p.features
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active'
     ORDER BY s.started_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function activateSubscription(userId, planId) {
  const { rows: plan } = await query('SELECT * FROM plans WHERE id = $1', [planId]);
  if (!plan.length) throw Object.assign(new Error('Plan not found'), { code: 'PLAN_NOT_FOUND' });

  // Deactivate existing subscriptions
  await query(`UPDATE subscriptions SET status = 'cancelled', renews_at = NULL WHERE user_id = $1 AND status = 'active'`, [userId]);

  const renewsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const { rows: sub } = await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, started_at, renews_at)
     VALUES ($1, $2, 'active', NOW(), $3) RETURNING *`,
    [userId, planId, renewsAt]
  );

  // Switch user billing mode based on admin global setting
  const settings = await getBillingSettings();
  if (settings.hybrid) {
    await query(`UPDATE users SET billing_mode = 'hybrid' WHERE id = $1`, [userId]);
  } else {
    await query(`UPDATE users SET billing_mode = 'subscription' WHERE id = $1`, [userId]);
  }

  return { ...sub[0], plan_name: plan[0].name, plan_slug: plan[0].slug };
}

export async function cancelSubscription(userId) {
  const { rows } = await query(
    `UPDATE subscriptions SET status = 'cancelled', renews_at = NULL
     WHERE user_id = $1 AND status = 'active' RETURNING id`,
    [userId]
  );
  if (rows.length) {
    const settings = await getBillingSettings();
    const fallback = settings.prepaid ? 'prepaid' : 'subscription';
    await query(`UPDATE users SET billing_mode = $2 WHERE id = $1`, [userId, fallback]);
  }
  return rows.length > 0;
}

export async function creditBalance(userId, amount, reference, type = 'deposit') {
  await query(`UPDATE users SET balance = balance + $2 WHERE id = $1`, [userId, amount]);
  const { rows } = await query('SELECT balance FROM users WHERE id = $1', [userId]);
  await query(
    `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
     VALUES ($1, $2, $3, $4, $5, 'completed')`,
    [userId, type, amount, rows[0].balance, reference]
  );
  return rows[0].balance;
}

export async function createPaymentOrder({ userId, gatewayId, amount, currency = 'USD', reference, referenceType = 'deposit', ip = null }) {
  const { rows: gw } = await query('SELECT * FROM payment_gateways WHERE id = $1', [gatewayId]);
  if (!gw.length) throw Object.assign(new Error('Gateway not found'), { code: 'GATEWAY_NOT_FOUND' });
  const gateway = gw[0];
  if (!gateway.active) throw Object.assign(new Error('Gateway is disabled'), { code: 'GATEWAY_DISABLED' });
  if (gateway.min_amount && amount < Number(gateway.min_amount)) {
    throw Object.assign(new Error(`Minimum amount is ${gateway.min_amount}`), { code: 'AMOUNT_TOO_LOW' });
  }
  if (gateway.max_amount && amount > Number(gateway.max_amount)) {
    throw Object.assign(new Error(`Maximum amount is ${gateway.max_amount}`), { code: 'AMOUNT_TOO_HIGH' });
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { rows } = await query(
    `INSERT INTO payment_orders (user_id, gateway_id, amount, currency, status, reference, expires_at, ip)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING *`,
    [userId, gatewayId, amount, currency, reference, expiresAt, ip]
  );
  return { order: rows[0], gateway };
}

export async function confirmPaymentOrder(orderId, { txid = null, confirmations = null } = {}) {
  const { rows: orders } = await query(
    `SELECT o.*, g.slug AS gateway_slug, g.type AS gateway_type, g.min_confirmations FROM payment_orders o
     JOIN payment_gateways g ON g.id = o.gateway_id
     WHERE o.id = $1`,
    [orderId]
  );
  if (!orders.length) throw new Error('Payment order not found');
  const order = orders[0];
  if (order.status === 'completed') return { order, already: true };

  // Flash-USDT guard: wallet deposits below the required confirmations
  // produce a warning so admins can spot instantly-reversed deposits.
  const flash = await checkFlashUsdt(orderId);

  await query(
    `UPDATE payment_orders SET
       status = 'completed',
       txid = COALESCE($2, txid),
       confirmations = COALESCE($3, confirmations),
       updated_at = NOW()
     WHERE id = $1`,
    [orderId, txid, confirmations]
  );

  // Apply side-effect based on reference type
  let outcome;
  if (order.reference && order.reference.startsWith('sub:')) {
    const planId = order.reference.split(':')[1];
    outcome = await activateSubscription(order.user_id, planId);
  } else {
    const balance = await creditBalance(order.user_id, Number(order.amount), orderId, 'deposit');
    outcome = { balance, credited: Number(order.amount) };
  }
  return { order: { ...order, status: 'completed' }, outcome, warning: flash.warning || null };
}

export async function failPaymentOrder(orderId) {
  await query(
    `UPDATE payment_orders SET status = 'failed', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
    [orderId]
  );
}
