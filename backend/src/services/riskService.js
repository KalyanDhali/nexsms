import { query } from '../models/db.js';

/**
 * Multi-layer risk scoring for payment orders.
 *
 * Every rule adds to a score (0-100) and appends a human-readable flag.
 * When the total score reaches the hold threshold the order goes into
 * 'hold' status and requires admin review — this blocks flash-USDT,
 * carding and new-account abuse without writing any code.
 *
 * All knobs are admin-configurable:
 *   - feature_toggles.payment_hold.config.threshold  (hold score)
 *   - feature_toggles.payment_hold.enabled           (master switch)
 *   - feature_toggles.risk_scoring.enabled           (scoring switch)
 *   - feature_toggles.fraud_flash_usdt.enabled       (wallet confirm check)
 *   - feature_toggles.fraud_carding.enabled          (round-amount rule)
 */

export async function scoreDepositOrder({ userId, amount, gatewayType, gatewaySlug, ip }) {
  const { rows: userRows } = await query(
    'SELECT created_at FROM users WHERE id = $1',
    [userId]
  );
  const userCreated = userRows[0]?.created_at ? new Date(userRows[0].created_at) : null;

  const { rows: toggles } = await query(
    `SELECT key, enabled, config FROM feature_toggles
     WHERE key IN ('risk_scoring', 'payment_hold', 'fraud_flash_usdt', 'fraud_carding')`
  );
  const tgl = Object.fromEntries(toggles.map((t) => [t.key, { enabled: t.enabled, config: t.config || {} }]));
  const scoringOn = tgl.risk_scoring?.enabled !== false;

  let score = 0;
  const flags = [];

  if (scoringOn) {
    // High-value deposit -> hold for manual review
    const holdThreshold = tgl.payment_hold?.config?.threshold ?? 100;
    if (Number(amount) >= holdThreshold) {
      score += 40;
      flags.push(`high_amount:$${amount}>=$${holdThreshold}`);
    }

    // Brand-new account (< 24h old) making deposits
    if (userCreated && Date.now() - userCreated.getTime() < 24 * 3600 * 1000) {
      score += 20;
      flags.push('new_account:<24h');
    }

    // Velocity: 3+ deposits from the same IP in 10 minutes
    if (ip) {
      const { rows } = await query(
        `SELECT COUNT(*)::int AS count FROM payment_orders
         WHERE ip = $1 AND created_at > NOW() - interval '10 minutes'`,
        [ip]
      );
      if (rows[0].count >= 3) {
        score += 30;
        flags.push(`velocity:${rows[0].count}/10min`);
      }
    }

    // Wallet deposits carry flash-USDT reversal risk
    if (gatewayType === 'wallet') {
      score += 10;
      flags.push('wallet_deposit');
    }

    // Carding signal: odd non-round amounts on small orders
    if (tgl.fraud_carding?.enabled !== false && Number(amount) < 50 && Number(amount) % 1 !== 0) {
      score += 15;
      flags.push('non_round_amount');
    }
  }

  return { score: Math.min(100, score), flags };
}

export async function applyRiskToOrder(orderId, assessment) {
  const { rows: toggle } = await query(
    `SELECT enabled, config FROM feature_toggles WHERE key = 'payment_hold'`
  );
  const holdEnabled = toggle.length ? toggle[0].enabled : false;
  const holdThreshold = toggle.length ? (toggle[0].config?.threshold ?? 100) : 100;

  const status = holdEnabled && assessment.score >= holdThreshold ? 'hold' : 'pending';

  await query(
    `UPDATE payment_orders SET risk_score = $2, risk_flags = $3::jsonb, status = $4 WHERE id = $1`,
    [orderId, assessment.score, JSON.stringify(assessment.flags), status]
  );
  return status;
}

/**
 * Flash-USDT guard: wallet deposits confirmed with fewer than the
 * gateway's minimum confirmations get flagged for review. Called at
 * confirm time — admin can still force-confirm.
 */
export async function checkFlashUsdt(orderId) {
  const { rows: orderRows } = await query(
    `SELECT o.*, g.type AS gateway_type, g.min_confirmations
     FROM payment_orders o JOIN payment_gateways g ON g.id = o.gateway_id
     WHERE o.id = $1`,
    [orderId]
  );
  if (!orderRows.length) return { warning: null };
  const order = orderRows[0];
  if (order.gateway_type !== 'wallet') return { warning: null };

  const { rows: toggle } = await query(
    `SELECT enabled FROM feature_toggles WHERE key = 'fraud_flash_usdt'`
  );
  const flashGuardOn = toggle.length ? toggle[0].enabled : false;
  if (!flashGuardOn) return { warning: null };

  const required = order.min_confirmations || 1;
  if (order.confirmations < required) {
    return {
      warning: `Flash-USDT risk: ${order.confirmations}/${required} confirmations`,
      code: 'LOW_CONFIRMATIONS',
    };
  }
  return { warning: null };
}
