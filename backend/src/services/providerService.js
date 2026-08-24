import { query } from '../models/db.js';
import { getProviderAdapter, getActiveProviders, getFailoverChain } from '../adapters/index.js';

/**
 * Send an SMS with automatic provider failover.
 * Tries providers by priority; if a provider throws, logs it and
 * moves to the next one. Returns the first successful result.
 */
export async function sendSmsWithFailover({ from, to, body, countryCode }) {
  const providers = await getActiveProviders();
  if (!providers.length) {
    throw new Error('No active SMS providers configured');
  }

  let lastError = null;
  let tried = [];

  for (const providerRow of providers) {
    if (providerRow.health === 'down') continue;
    try {
      const adapter = await getProviderAdapter(providerRow);
      const result = await adapter.sendSms({ from, to, body });
      await markProviderHealth(providerRow.id, 'ok');
      return { ...result, providerId: providerRow.id, providerName: providerRow.name, tried };
    } catch (err) {
      lastError = err;
      tried.push({ providerId: providerRow.id, name: providerRow.name, error: err.message });
      console.error(`[SMS] provider ${providerRow.name} failed:`, err.message);
      // Mark health as degraded after repeated failures handled by caller
    }
  }

  // If all failed, mark the first tried provider as down so next send starts elsewhere
  if (tried.length) {
    await markProviderHealth(tried[0].providerId, 'down');
  }

  throw new Error(lastError?.message || 'All SMS providers failed');
}

export async function markProviderHealth(providerId, status) {
  await query('UPDATE providers SET health = $1, updated_at = NOW() WHERE id = $2', [status, providerId]);
}

/**
 * Run a health check against a specific provider.
 */
export async function runHealthCheck(providerId) {
  const { rows } = await query('SELECT * FROM providers WHERE id = $1', [providerId]);
  if (!rows.length) throw new Error('Provider not found');
  const providerRow = rows[0];
  const adapter = await getProviderAdapter(providerRow);
  try {
    const ok = await adapter.healthCheck();
    const health = ok ? 'ok' : 'down';
    await markProviderHealth(providerId, health);
    return { providerId, providerName: providerRow.name, health };
  } catch (err) {
    await markProviderHealth(providerId, 'down');
    return { providerId, providerName: providerRow.name, health: 'down', error: err.message };
  }
}

/**
 * Health-check all active providers and update their status.
 */
export async function healthCheckAll() {
  const providers = await getActiveProviders();
  const results = [];
  for (const p of providers) {
    results.push(await runHealthCheck(p.id));
  }
  return results;
}
