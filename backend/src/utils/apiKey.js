import crypto from 'crypto';

/**
 * API key generation & hashing.
 * Format: nex_live_<32 hex chars>. Only the SHA-256 hash + a short
 * prefix are stored in the DB; the raw key is shown once at creation.
 */

export function generateApiKey() {
  const raw = crypto.randomBytes(24).toString('hex');
  const prefix = 'nex_live';
  return { key: `${prefix}_${raw}`, prefix };
}

export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function keyPrefixFromRaw(key) {
  return key.slice(0, 12) + '…';
}
