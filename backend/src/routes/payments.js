import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createPaymentOrder, confirmPaymentOrder, failPaymentOrder } from '../services/billingService.js';
import { preparePayment } from '../services/paymentGatewayService.js';
import { scoreDepositOrder, applyRiskToOrder } from '../services/riskService.js';
import { isIpBlocked, recordLoginIp } from '../services/ipGuard.js';

const router = Router();

function clientIp(req) {
  const raw = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
  return raw ? raw.replace(/^::ffff:/, '') : null;
}

// Public: active payment gateways (no credentials exposed)
router.get('/gateways', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, type, active, fee_percent, qr_mode, min_amount, max_amount, priority
     FROM payment_gateways WHERE active = TRUE ORDER BY priority ASC`
  );
  res.json({ gateways: rows });
});

// Admin: all gateways + masked credentials
router.get('/gateways/all', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, type, credentials, active, fee_percent, priority, qr_mode, min_amount, max_amount, min_confirmations, wallet_address
     FROM payment_gateways ORDER BY priority ASC`
  );
  const masked = rows.map((g) => {
    const creds = { ...g.credentials };
    for (const k of Object.keys(creds)) {
      if (typeof creds[k] === 'string' && creds[k].length > 4) {
        creds[k] = '••••' + creds[k].slice(-4);
      }
    }
    return { ...g, credentials: creds };
  });
  res.json({ gateways: masked });
});

// Admin: create/update/delete gateway
router.post('/gateways', authenticate, authorize('admin'), async (req, res) => {
  const { name, slug, type, credentials, active, fee_percent, priority, qr_mode, min_amount, max_amount, min_confirmations, wallet_address } = req.body;
  if (!name || !slug || !type) return res.status(400).json({ error: 'name, slug, type required' });
  try {
    const { rows } = await query(
      `INSERT INTO payment_gateways (name, slug, type, credentials, active, fee_percent, priority, qr_mode, min_amount, max_amount, min_confirmations, wallet_address)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, slug, type, JSON.stringify(credentials || {}), active !== false, fee_percent || 0, priority || 0, qr_mode || 'auto', min_amount ?? null, max_amount ?? null, min_confirmations || 0, wallet_address || null]
    );
    res.status(201).json({ gateway: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Gateway slug exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/gateways/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, slug, type, credentials, active, fee_percent, priority, qr_mode, min_amount, max_amount, min_confirmations, wallet_address } = req.body;
  const { rows } = await query(
    `UPDATE payment_gateways SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       type = COALESCE($4, type),
       credentials = COALESCE($5::jsonb, credentials),
       active = COALESCE($6, active),
       fee_percent = COALESCE($7, fee_percent),
       priority = COALESCE($8, priority),
       qr_mode = COALESCE($9, qr_mode),
       min_amount = COALESCE($10, min_amount),
       max_amount = COALESCE($11, max_amount),
       min_confirmations = COALESCE($12, min_confirmations),
       wallet_address = COALESCE($13, wallet_address),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, name, slug, type, credentials ? JSON.stringify(credentials) : null, active, fee_percent, priority, qr_mode, min_amount, max_amount, min_confirmations, wallet_address]
  );
  if (!rows.length) return res.status(404).json({ error: 'Gateway not found' });
  res.json({ gateway: rows[0] });
});

router.delete('/gateways/:id', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await query('DELETE FROM payment_gateways WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Gateway not found' });
  res.json({ ok: true });
});

// Create a deposit order + payment instructions
router.post('/deposit', authenticate, async (req, res) => {
  const { amount, gatewaySlug, currency } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Valid amount required' });
  if (!gatewaySlug) return res.status(400).json({ error: 'gatewaySlug required' });

  const ip = clientIp(req);

  // IP blocklist guard
  const blocked = await isIpBlocked(ip);
  if (blocked?.blocked) {
    return res.status(403).json({ error: `Access blocked${blocked.reason ? ': ' + blocked.reason : ''}`, blocked: true });
  }

  const { rows: gw } = await query('SELECT * FROM payment_gateways WHERE slug = $1', [gatewaySlug]);
  if (!gw.length || !gw[0].active) return res.status(400).json({ error: 'Gateway unavailable' });

  try {
    const { order, gateway } = await createPaymentOrder({
      userId: req.user.id,
      gatewayId: gw[0].id,
      amount: Number(amount),
      currency: currency || 'USD',
      ip,
    });

    // Multi-layer risk scoring -> may move order to 'hold'
    const assessment = await scoreDepositOrder({
      userId: req.user.id,
      amount: Number(amount),
      gatewayType: gw[0].type,
      gatewaySlug,
      ip,
    });
    const status = await applyRiskToOrder(order.id, assessment);

    const payment = await preparePayment(order, gateway);
    return res.status(201).json({
      order: { id: order.id, amount: order.amount, currency: order.currency, status, expires_at: order.expires_at },
      gateway: { name: gateway.name, slug: gateway.slug, type: gateway.type, fee_percent: gateway.fee_percent },
      payment,
      risk: { score: assessment.score, flags: assessment.flags, hold: status === 'hold' },
    });
  } catch (err) {
    if (err.code === 'NO_ADDRESS') return res.status(400).json({ error: err.message });
    if (err.code === 'AMOUNT_TOO_LOW' || err.code === 'AMOUNT_TOO_HIGH') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// My deposit orders
router.get('/deposits', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT o.id, o.amount, o.currency, o.status, o.txid, o.confirmations, o.risk_score, o.created_at,
            g.name AS gateway_name, g.slug AS gateway_slug
     FROM payment_orders o JOIN payment_gateways g ON g.id = o.gateway_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ deposits: rows });
});

// Admin: manually confirm a payment order (credits balance / activates subscription)
router.post('/deposit/:id/confirm', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { txid, confirmations } = req.body || {};
    const result = await confirmPaymentOrder(req.params.id, { txid, confirmations });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: fail a pending order
router.post('/deposit/:id/fail', authenticate, authorize('admin'), async (req, res) => {
  await failPaymentOrder(req.params.id);
  res.json({ ok: true });
});

// Simulated gateway webhook/callback — mirrors what a real gateway posts.
// In production this would be per-gateway with signature validation.
router.post('/webhook', async (req, res) => {
  const { orderId, status, txid, confirmations } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  try {
    if (status === 'completed' || status === 'paid' || status === 'success') {
      const result = await confirmPaymentOrder(orderId, { txid, confirmations });
      return res.json(result);
    }
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      await failPaymentOrder(orderId);
      return res.json({ ok: true, status: 'failed' });
    }
    return res.json({ ok: true, status: 'acknowledged' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
