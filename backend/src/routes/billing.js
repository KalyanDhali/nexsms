import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getBillingSettings,
  setBillingSettings,
  getActiveSubscription,
  activateSubscription,
  cancelSubscription,
  createPaymentOrder,
} from '../services/billingService.js';

const router = Router();

// Public: available billing modes
router.get('/settings', async (req, res) => {
  const settings = await getBillingSettings();
  res.json({ billing: settings });
});

// Admin: update billing settings (enable/disable prepaid/subscription/hybrid, quota behavior)
router.put('/settings', authenticate, authorize('admin'), async (req, res) => {
  const settings = await setBillingSettings(req.body || {});
  res.json({ billing: settings });
});

// My wallet / billing info
router.get('/wallet', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT balance, currency, billing_mode, daily_limit_override FROM users WHERE id = $1',
    [req.user.id]
  );
  const sub = await getActiveSubscription(req.user.id);
  const { rows: txs } = await query(
    `SELECT id, type, amount, balance_after, status, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [req.user.id]
  );
  res.json({ wallet: rows[0], subscription: sub, recent: txs });
});

// My active subscription
router.get('/subscription', authenticate, async (req, res) => {
  const sub = await getActiveSubscription(req.user.id);
  res.json({ subscription: sub });
});

// Subscribe to a plan
// payWith: 'balance' (deduct immediately) or 'deposit' (create payment order)
// For deposit, gatewaySlug selects the payment gateway.
router.post('/subscribe', authenticate, async (req, res) => {
  const { planId, payWith = 'balance', gatewaySlug } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });

  const { rows: plan } = await query('SELECT * FROM plans WHERE id = $1 AND active = TRUE', [planId]);
  if (!plan.length) return res.status(404).json({ error: 'Plan not found or inactive' });

  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = userRows[0];
  const price = Number(plan[0].price);

  try {
    if (payWith === 'balance') {
      if (Number(user.balance) < price) {
        return res.status(402).json({ error: 'Insufficient balance', cost: price });
      }
      await query('UPDATE users SET balance = balance - $2 WHERE id = $1', [req.user.id, price]);
      const { rows: after } = await query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
      await query(
        `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
         VALUES ($1, 'plan_purchase', $2, $3, $4, 'completed')`,
        [req.user.id, -price, after[0].balance, planId]
      );
      const sub = await activateSubscription(req.user.id, planId);
      return res.json({ subscription: sub, paidFrom: 'balance' });
    }

    // payWith deposit
    if (!gatewaySlug) return res.status(400).json({ error: 'gatewaySlug required for deposit payment' });
    const { rows: gw } = await query('SELECT * FROM payment_gateways WHERE slug = $1', [gatewaySlug]);
    if (!gw.length || !gw[0].active) return res.status(400).json({ error: 'Gateway unavailable' });

    const { order, gateway } = await createPaymentOrder({
      userId: req.user.id,
      gatewayId: gw[0].id,
      amount: price,
      currency: user.currency || 'USD',
      reference: `sub:${planId}`,
      referenceType: 'subscription',
    });
    return res.status(201).json({ order: { id: order.id, amount: order.amount, currency: order.currency, status: order.status, expires_at: order.expires_at }, gateway: { name: gateway.name, slug: gateway.slug, type: gateway.type } });
  } catch (err) {
    if (err.code === 'PLAN_NOT_FOUND') return res.status(404).json({ error: err.message });
    if (err.code === 'GATEWAY_NOT_FOUND' || err.code === 'GATEWAY_DISABLED') return res.status(400).json({ error: err.message });
    if (err.code === 'AMOUNT_TOO_LOW' || err.code === 'AMOUNT_TOO_HIGH') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Cancel my subscription
router.post('/unsubscribe', authenticate, async (req, res) => {
  const cancelled = await cancelSubscription(req.user.id);
  if (!cancelled) return res.status(404).json({ error: 'No active subscription' });
  res.json({ ok: true });
});

// My transactions
router.get('/transactions', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT id, type, amount, balance_after, reference, status, created_at
     FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ transactions: rows });
});

export default router;
