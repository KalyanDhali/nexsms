import { query } from '../models/db.js';

/**
 * Enforce the kyc_required toggle. Returns { required: false } when
 * verification is not required or the user is already verified,
 * otherwise an error object for the caller to return as 403.
 */
export async function requireKyc(userId) {
  const { rows } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'kyc_required'`);
  const required = rows.length ? rows[0].enabled : false;
  if (!required) return { required: false };

  const { rows: userRows } = await query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
  const status = userRows[0]?.kyc_status || 'not_verified';
  if (status === 'verified') return { required: true, verified: true };

  const err = new Error('KYC verification required for this action');
  err.code = 'KYC_REQUIRED';
  err.kyc_status = status;
  return { required: true, verified: false, error: err };
}
