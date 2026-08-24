import { BaseProvider } from './base.js';
import { query } from '../models/db.js';

export function logActivity(providerId, action, details = {}) {
  return query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES (NULL, $1, 'provider', $2, $3::jsonb)`,
    [action, providerId, JSON.stringify(details)]
  ).catch((err) => console.error('logActivity failed:', err.message));
}

/**
 * Import a provider adapter module by type.
 * Uses import.meta.url for reliable resolution.
 */
async function importAdapter(type) {
  return await import(new URL(`./${type}.js`, import.meta.url));
}

/**
 * Provider registry: creates the right adapter instance for a provider row.
 */
export async function getProviderAdapter(providerRow) {
  const { id, name, type, credentials } = providerRow;
  const mod = await importAdapter(type);
  return new mod.default({ id, name, type, credentials });
}

/**
 * Load all active providers ordered by priority, from DB.
 */
export async function getActiveProviders() {
  const { rows } = await query(
    `SELECT * FROM providers WHERE active = TRUE ORDER BY priority ASC, created_at ASC`
  );
  return rows;
}

/**
 * Pick the best available provider for a target country based on
 * country_routing rules, then by priority. Skips providers with
 * known unhealthy health status.
 */
export async function pickProvider(countryCode) {
  const providers = await getActiveProviders();
  if (!providers.length) return null;

  // 1. Country-specific routing
  if (countryCode) {
    const routed = providers.filter((p) => {
      const routing = p.country_routing || {};
      return routing[countryCode] === true;
    });
    if (routed.length) {
      const healthy = routed.find((p) => p.health !== 'down');
      if (healthy) return healthy;
    }
  }

  // 2. Default by priority (skip down providers)
  return providers.find((p) => p.health !== 'down') || providers[0];
}

/**
 * Failover chain: returns providers to try in order, excluding the given
 * failed provider id and any down providers.
 */
export async function getFailoverChain(excludeProviderId, countryCode) {
  const providers = await getActiveProviders();
  return providers.filter(
    (p) => p.id !== excludeProviderId && p.health !== 'down'
  );
}
