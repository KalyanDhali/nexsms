import { query } from '../models/db.js';
import { sendSmsWithFailover } from './providerService.js';

/**
 * Shared messaging core — used by the send route and the scheduler
 * so immediate sends and scheduled sends follow the exact same
 * limits / cost / failover / accounting pipeline.
 */

export async function getDailyLimit(user, number) {
  const { rows: settings } = await query(`SELECT value FROM settings WHERE key = 'billing'`);
  const billing = settings[0]?.value || {};

  if (user.daily_limit_override) return Number(user.daily_limit_override);

  const { rows: sub } = await query(
    `SELECT s.*, p.daily_limit_per_number FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1`,
    [user.id]
  );
  if (sub.length && sub[0].daily_limit_per_number) {
    return Number(sub[0].daily_limit_per_number);
  }

  const { rows: pp } = await query(`SELECT value FROM settings WHERE key = 'pay_per_sms_limit'`);
  if (pp.length && pp[0].value.daily) return Number(pp[0].value.daily);

  return 50;
}

export async function getSmsRate() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'sms_rate'`);
  if (rows.length && rows[0].value.rate) return Number(rows[0].value.rate);
  return 0.0079;
}

export async function getBillingSettings() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'billing'`);
  return rows[0]?.value || {};
}

export async function getBurstLimit() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'burst_limit'`);
  if (rows.length && rows[0].value.perSecond) return Number(rows[0].value.perSecond);
  return 3;
}

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyUsage(numberId, date = getToday()) {
  const { rows } = await query(
    'SELECT count FROM daily_limits WHERE number_id = $1 AND send_date = $2',
    [numberId, date]
  );
  return rows.length ? rows[0].count : 0;
}

export async function incrementDailyCount(numberId, date = getToday()) {
  await query(
    `INSERT INTO daily_limits (number_id, send_date, count) VALUES ($1, $2, 1)
     ON CONFLICT (number_id, send_date) DO UPDATE SET count = daily_limits.count + 1`,
    [numberId, date]
  );
}

export async function deductBalance(userId, cost, messageId) {
  await query(`UPDATE users SET balance = balance - $2 WHERE id = $1`, [userId, cost]);
  const { rows } = await query('SELECT balance FROM users WHERE id = $1', [userId]);
  await query(
    `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
     VALUES ($1, 'sms_cost', $2, $3, $4, 'completed')`,
    [userId, -cost, rows[0].balance, messageId]
  );
}

export async function getActiveSubscription(userId) {
  const { rows } = await query(
    `SELECT s.*, p.sms_quota, p.daily_limit_per_number
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Core "send now" pipeline. Throws on hard errors (limit exceeded,
 * insufficient balance, provider failure) — caller decides how to
 * surface them.
 */
export async function sendNow({ userId, numberId, conversationId, contactNumber, body, messageId }) {
  const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [numberId]);
  const number = numberRows[0];
  if (!number) throw new Error('Number not found');
  if (number.status !== 'assigned' || number.assigned_user_id !== userId) {
    throw new Error('Number is not assigned to you');
  }

  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRows[0];

  // Daily per-number limit
  const limitConfig = await getDailyLimit(user, number);
  const used = await getDailyUsage(numberId);
  if (limitConfig && used >= limitConfig) {
    const err = new Error('Daily send limit reached for this number');
    err.code = 'LIMIT_REACHED';
    err.limit = limitConfig;
    err.used = used;
    throw err;
  }

  // Cost & balance check
  const smsRate = await getSmsRate();
  const cost = smsRate * 1;

  // Determine how this message is paid:
  //   prepaid      -> balance only
  //   subscription -> plan quota only (excess per quotaExhausted)
  //   hybrid       -> quota first, then balance
  const sub = user.billing_mode === 'prepaid' ? null : await getActiveSubscription(userId);
  let payFrom = 'balance';
  if (user.billing_mode === 'subscription' || user.billing_mode === 'hybrid') {
    if (sub) {
      if (sub.sms_used < sub.sms_quota) {
        payFrom = 'quota';
      } else if (user.billing_mode === 'subscription') {
        const billingSettings = await getBillingSettings();
        if (billingSettings.quotaExhausted === 'block') {
          const err = new Error('Monthly SMS quota exhausted');
          err.code = 'QUOTA_EXHAUSTED';
          throw err;
        }
        // quotaExhausted = 'charge' -> fall through to balance
        payFrom = 'balance';
      }
      // hybrid with exhausted quota -> fall through to balance
    } else if (user.billing_mode === 'subscription') {
      const err = new Error('No active subscription');
      err.code = 'NO_SUBSCRIPTION';
      throw err;
    }
    // hybrid without subscription -> balance
  }

  if (payFrom === 'balance' && Number(user.balance) < cost) {
    const err = new Error('Insufficient balance');
    err.code = 'INSUFFICIENT_BALANCE';
    err.cost = cost;
    throw err;
  }

  // Send via provider with failover
  const result = await sendSmsWithFailover({ from: number.number, to: contactNumber, body });

  // Update message + conversation
  await query(
    `UPDATE messages SET status = 'sent', provider_id = $2, message_sid = $3, scheduled_at = NULL WHERE id = $1`,
    [messageId, result.providerId, result.sid]
  );
  await query(
    `UPDATE conversations SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [conversationId, body]
  );

  // Accounting
  if (payFrom === 'quota') {
    await query('UPDATE subscriptions SET sms_used = sms_used + 1 WHERE id = $1', [sub.id]);
  } else {
    await deductBalance(userId, cost, messageId);
  }
  await incrementDailyCount(numberId);

  return { messageId, sid: result.sid, providerName: result.providerName, cost, status: 'sent', tried: result.tried, payFrom };
}

/**
 * Create a scheduled message (not yet sent). Cost / limits are applied
 * later by the scheduler at send time.
 */
export async function scheduleMessage({ userId, conversationId, body, scheduledAt }) {
  const cost = await getSmsRate();
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, direction, body, status, cost, scheduled_at)
     VALUES ($1, 'out', $2, 'scheduled', $3, $4) RETURNING id`,
    [conversationId, body, cost, scheduledAt]
  );
  await query(
    `UPDATE conversations SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [conversationId, body]
  );
  return rows[0].id;
}
