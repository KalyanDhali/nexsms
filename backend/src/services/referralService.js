import crypto from 'crypto';
import { query } from '../models/db.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = 8) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Ensure the user has a referral code (generated lazily on first read). */
export async function ensureReferralCode(userId) {
  const { rows } = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
  if (rows.length && rows[0].referral_code) return rows[0].referral_code;

  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    try {
      const { rows: updated } = await query(
        `UPDATE users SET referral_code = $2, updated_at = NOW() WHERE id = $1 RETURNING referral_code`,
        [userId, code]
      );
      if (updated.length) return updated[0].referral_code;
    } catch (e) {
      // unique collision — retry
    }
  }
  throw new Error('Could not generate a unique referral code');
}

/** Link a new user to their referrer (called at registration). */
export async function applyReferralCode(newUserId, code) {
  if (!code) return null;
  const { rows } = await query('SELECT id FROM users WHERE referral_code = $1', [code.toUpperCase()]);
  if (!rows.length) return null;
  const referrerId = rows[0].id;
  if (referrerId === newUserId) return null;

  await query(
    `INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [referrerId, newUserId]
  );
  await query(`UPDATE users SET referred_by = $1, updated_at = NOW() WHERE id = $2`, [referrerId, newUserId]);
  return referrerId;
}

/**
 * Pay the referrer a one-time bonus when the referred user makes their
 * first successful deposit. Idempotent per referral row.
 */
export async function grantReferralBonus(referredUserId, depositAmount) {
  const { rows } = await query(
    `SELECT id, referrer_id FROM referrals WHERE referred_id = $1 AND status = 'pending'`,
    [referredUserId]
  );
  if (!rows.length) return null;

  const { rows: toggles } = await query(`SELECT enabled, config FROM feature_toggles WHERE key = 'referral'`);
  const cfg = toggles[0]?.config || {};
  const enabled = toggles.length ? toggles[0].enabled : false;
  if (!enabled) return null;

  const percent = Number(cfg.bonusPercent || 5);
  const bonus = Math.round(Number(depositAmount) * (percent / 100) * 100) / 100;
  if (bonus <= 0) return null;

  const ref = rows[0];
  await query(`UPDATE users SET balance = balance + $2 WHERE id = $1`, [ref.referrer_id, bonus]);
  const { rows: bal } = await query('SELECT balance FROM users WHERE id = $1', [ref.referrer_id]);
  await query(
    `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
     VALUES ($1, 'referral', $2, $3, $4, 'completed')`,
    [ref.referrer_id, bonus, bal[0].balance, `referral-bonus:${referredUserId}`]
  );
  await query(`UPDATE referrals SET status = 'paid', bonus = $2 WHERE id = $1`, [ref.id, bonus]);
  return { referrerId: ref.referrer_id, bonus };
}
