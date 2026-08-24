/**
 * Simple in-memory burst limiter (sliding window).
 * Enforces a maximum number of sends per window per user.
 * In-memory is fine for a single backend instance.
 */
const buckets = new Map();

const windowMs = 1000; // 1 second window

export function checkBurst(userId, maxPerWindow) {
  const now = Date.now();
  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(userId, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxPerWindow) {
    return { allowed: false, retryAfterMs: windowMs - (now - bucket.timestamps[0]) };
  }

  bucket.timestamps.push(now);
  return { allowed: true };
}

export function resetBurst(userId) {
  buckets.delete(userId);
}
