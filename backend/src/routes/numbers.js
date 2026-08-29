import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getProviderAdapter } from '../adapters/index.js';

const router = Router();

router.use(authenticate);

// Expiry date for newly assigned numbers, based on the number_expiry toggle.
async function getNumberExpiryDate() {
  const { rows } = await query(`SELECT enabled, config FROM feature_toggles WHERE key = 'number_expiry'`);
  if (!rows.length || !rows[0].enabled) return null;
  const days = Number(rows[0].config?.leaseDays || rows[0].config?.graceDays || 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Admin routes — number pool management
 */

// Pool view with filters (status, country, area code, search)
router.get('/pool', authorize('admin'), async (req, res) => {
  const { status, country, areaCode, search } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`n.status = $${params.length}`);
  }
  if (country) {
    params.push(country);
    conditions.push(`n.geo_country = $${params.length}`);
  }
  if (areaCode) {
    params.push(areaCode);
    conditions.push(`n.geo_area_code = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`n.number ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT n.*, p.name AS provider_name, u.email AS assigned_user_email
     FROM numbers n
     LEFT JOIN providers p ON p.id = n.provider_id
     LEFT JOIN users u ON u.id = n.assigned_user_id
     ${where}
     ORDER BY n.created_at DESC`,
    params
  );
  res.json({ numbers: rows });
});

// Pool stats: available / assigned / blocked / total
router.get('/pool/stats', authorize('admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM numbers GROUP BY status`
  );
  const stats = { available: 0, assigned: 0, blocked: 0, total: 0 };
  for (const r of rows) {
    if (r.status in stats) stats[r.status] = r.count;
    stats.total += r.count;
  }
  res.json({ stats });
});

// Create number manually (admin) or buy from provider
router.post('/', authorize('admin'), async (req, res) => {
  const { number, providerId, buyFromProvider, countryCode, areaCode, geo_country, geo_area_code, monthly_cost, did_price, did_lease_days, did_note } = req.body;

  try {
    let finalNumber = number;
    let finalProviderId = providerId;

    // Buy from provider API
    if (buyFromProvider && providerId) {
      const { rows } = await query('SELECT * FROM providers WHERE id = $1', [providerId]);
      if (!rows.length) return res.status(404).json({ error: 'Provider not found' });
      const adapter = await getProviderAdapter(rows[0]);
      const result = await adapter.buyNumber({ countryCode: countryCode || 'US', areaCode });
      if (result.error) return res.status(400).json({ error: result.error });
      finalNumber = result.number;
    }

    if (!finalNumber) return res.status(400).json({ error: 'Number required' });

    const { rows } = await query(
      `INSERT INTO numbers (number, provider_id, status, geo_country, geo_area_code, monthly_cost, did_price, did_lease_days, did_note)
       VALUES ($1, $2, 'available', $3, $4, $5, $6, $7, $8)
       ON CONFLICT (number) DO UPDATE SET status = 'available', provider_id = EXCLUDED.provider_id
       RETURNING *`,
      [finalNumber, finalProviderId, geo_country || countryCode || 'US', geo_area_code || areaCode || null,
       monthly_cost || 0,
       did_price === undefined || did_price === null || did_price === '' ? null : Number(did_price),
       did_lease_days ? Number(did_lease_days) : 30,
       did_note || null]
    );
    res.status(201).json({ number: rows[0] });
  } catch (err) {
    console.error('create number error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign number to a user (admin manual)
router.post('/:id/assign', authorize('admin'), async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [req.params.id]);
  if (!numberRows.length) return res.status(404).json({ error: 'Number not found' });
  if (numberRows[0].assigned_user_id) {
    return res.status(400).json({ error: 'Number is already assigned' });
  }

  const { rows: userRows } = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });

  // First number assigned becomes primary
  const { rows: existing } = await query(
    'SELECT id FROM numbers WHERE assigned_user_id = $1',
    [userId]
  );
  const isPrimary = existing.length === 0;
  const expiresAt = await getNumberExpiryDate();

  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = $2, status = 'assigned', primary_number = $3,
            expires_at = COALESCE($4, expires_at), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, userId, isPrimary, expiresAt]
  );
  res.json({ number: rows[0] });
});

// Revoke number from user -> back to available
router.post('/:id/revoke', authorize('admin'), async (req, res) => {
  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = NULL, status = 'available', primary_number = FALSE, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not found' });
  res.json({ number: rows[0] });
});

// Swap: move one user's number to another user
router.post('/:id/swap', authorize('admin'), async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not found' });
  res.json({ number: rows[0] });
});

// Block / unblock number
router.patch('/:id/block', authorize('admin'), async (req, res) => {
  const { blocked } = req.body;
  const { rows } = await query(
    `UPDATE numbers SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, blocked ? 'blocked' : 'available']
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not found' });
  res.json({ number: rows[0] });
});

// Delete number (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  await query('DELETE FROM numbers WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/**
 * User routes — my numbers
 */

// My numbers (for current user)
router.get('/mine', async (req, res) => {
  const { rows } = await query(
    `SELECT n.*, p.name AS provider_name,
       (SELECT COUNT(*)::int FROM conversations c WHERE c.number_id = n.id) AS conversation_count
     FROM numbers n
     LEFT JOIN providers p ON p.id = n.provider_id
     WHERE n.assigned_user_id = $1
     ORDER BY n.primary_number DESC, n.created_at ASC`,
    [req.user.id]
  );
  res.json({ numbers: rows });
});

// Set primary number
router.patch('/:id/primary', async (req, res) => {
  const { rows } = await query(
    'SELECT id FROM numbers WHERE id = $1 AND assigned_user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not assigned to you' });

  await query('UPDATE numbers SET primary_number = FALSE WHERE assigned_user_id = $1', [req.user.id]);
  await query('UPDATE numbers SET primary_number = TRUE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Available numbers user can self-assign (if allowed by admin)
router.get('/available', async (req, res) => {
  const { rows: toggle } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'self_assign'`);
  const allowed = toggle.length ? toggle[0].enabled : false;
  if (!allowed) return res.status(403).json({ error: 'Self-assignment disabled by admin' });

  const { country, areaCode } = req.query;
  const conditions = [`status = 'available'`];
  const params = [];
  if (country) {
    params.push(country);
    conditions.push(`geo_country = $${params.length}`);
  }
  if (areaCode) {
    params.push(areaCode);
    conditions.push(`geo_area_code = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT id, number, geo_country, geo_area_code FROM numbers WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50`,
    params
  );
  res.json({ numbers: rows });
});

// Self-assign an available number to the requesting user
router.post('/available/:id/assign', async (req, res) => {
  const { rows: toggle } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'self_assign'`);
  const allowed = toggle.length ? toggle[0].enabled : false;
  if (!allowed) return res.status(403).json({ error: 'Self-assignment disabled by admin' });

  const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [req.params.id]);
  if (!numberRows.length) return res.status(404).json({ error: 'Number not found' });
  if (numberRows[0].assigned_user_id) return res.status(400).json({ error: 'Number is already assigned' });

  const { rows: existing } = await query(
    'SELECT id FROM numbers WHERE assigned_user_id = $1 AND status = $2',
    [req.user.id, 'assigned']
  );
  const isPrimary = existing.length === 0;
  const expiresAt = await getNumberExpiryDate();

  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = $2, status = 'assigned', primary_number = $3,
            expires_at = COALESCE($4, expires_at), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, req.user.id, isPrimary, expiresAt]
  );
  res.json({ number: rows[0] });
});

// Admin: set DID pricing (rental price, lease days, note) for a number
router.patch('/:id/pricing', authorize('admin'), async (req, res) => {
  const { did_price, did_lease_days, did_note } = req.body;
  const { rows } = await query(
    `UPDATE numbers SET did_price = COALESCE($2, did_price), did_lease_days = COALESCE($3, did_lease_days),
            did_note = COALESCE($4, did_note), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id,
     did_price === undefined || did_price === null || did_price === '' ? null : Number(did_price),
     did_lease_days ? Number(did_lease_days) : null,
     did_note === undefined ? null : did_note]
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not found' });
  res.json({ number: rows[0] });
});

/**
 * User routes — DID store (rent / renew / release)
 */

async function didStoreEnabled() {
  const { rows } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'did_store'`);
  return rows.length ? rows[0].enabled : false;
}

function didRentPrice(n) {
  return n.did_price != null ? Number(n.did_price) : (Number(n.monthly_cost) || 0);
}

function didLeaseDays(n) {
  return n.did_lease_days ? Number(n.did_lease_days) : 30;
}

async function deductBalance(userId, price, type, reference) {
  const { rows: after } = await query('UPDATE users SET balance = balance - $2 WHERE id = $1 RETURNING balance', [userId, price]);
  await query(
    `INSERT INTO transactions (user_id, type, amount, balance_after, reference, status)
     VALUES ($1, $2, $3, $4, $5, 'completed')`,
    [userId, type, -price, after[0].balance, reference]
  );
  return after[0].balance;
}

// DID store: available numbers with price info, filterable by country / area code
router.get('/did/store', async (req, res) => {
  if (!(await didStoreEnabled())) return res.status(403).json({ error: 'DID store disabled by admin' });

  const { country, areaCode, search } = req.query;
  const conditions = [`status = 'available'`];
  const params = [];
  if (country) {
    params.push(country);
    conditions.push(`geo_country = $${params.length}`);
  }
  if (areaCode) {
    params.push(areaCode);
    conditions.push(`geo_area_code = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`number ILIKE $${params.length}`);
  }
  const { rows } = await query(
    `SELECT id, number, geo_country, geo_area_code, did_price, did_lease_days, did_note, monthly_cost
     FROM numbers WHERE ${conditions.join(' AND ')}
     ORDER BY geo_country ASC, number ASC LIMIT 200`,
    params
  );
  const numbers = rows.map((n) => ({ ...n, price: didRentPrice(n), leaseDays: didLeaseDays(n) }));
  res.json({ numbers });
});

// Rent a DID number from the store (paid from balance)
router.post('/did/:id/rent', async (req, res) => {
  if (!(await didStoreEnabled())) return res.status(403).json({ error: 'DID store disabled by admin' });

  const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1', [req.params.id]);
  if (!numberRows.length) return res.status(404).json({ error: 'Number not found' });
  const n = numberRows[0];
  if (n.assigned_user_id) return res.status(400).json({ error: 'Number is already assigned' });
  if (n.status === 'blocked') return res.status(400).json({ error: 'Number is blocked' });

  const price = didRentPrice(n);
  const { rows: userRows } = await query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
  const balance = Number(userRows[0].balance);
  if (balance < price) return res.status(402).json({ error: 'Insufficient balance', price });

  const leaseDays = didLeaseDays(n);
  const expiresAt = new Date(Date.now() + leaseDays * 24 * 60 * 60 * 1000).toISOString();

  if (price > 0) await deductBalance(req.user.id, price, 'did_rent', n.id);

  const { rows: existing } = await query(
    'SELECT id FROM numbers WHERE assigned_user_id = $1 AND status = $2',
    [req.user.id, 'assigned']
  );
  const isPrimary = existing.length === 0;

  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = $2, status = 'assigned', primary_number = $3,
            expires_at = $4, last_renewed_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, req.user.id, isPrimary, expiresAt]
  );
  res.json({ number: rows[0], price, leaseDays, balanceAfter: price > 0 ? balance - price : balance });
});

// Renew a rented DID (extends lease by did_lease_days)
router.post('/did/:id/renew', async (req, res) => {
  if (!(await didStoreEnabled())) return res.status(403).json({ error: 'DID store disabled by admin' });

  const { rows: numberRows } = await query('SELECT * FROM numbers WHERE id = $1 AND assigned_user_id = $2', [req.params.id, req.user.id]);
  if (!numberRows.length) return res.status(404).json({ error: 'Number not assigned to you' });
  const n = numberRows[0];

  const price = didRentPrice(n);
  const { rows: userRows } = await query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
  const balance = Number(userRows[0].balance);
  if (balance < price) return res.status(402).json({ error: 'Insufficient balance', price });

  const leaseDays = didLeaseDays(n);
  const base = n.expires_at && new Date(n.expires_at).getTime() > Date.now() ? new Date(n.expires_at) : new Date();
  const expiresAt = new Date(base.getTime() + leaseDays * 24 * 60 * 60 * 1000).toISOString();

  if (price > 0) await deductBalance(req.user.id, price, 'did_renew', n.id);

  const { rows } = await query(
    `UPDATE numbers SET expires_at = $2, last_renewed_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, expiresAt]
  );
  res.json({ number: rows[0], price, leaseDays, balanceAfter: price > 0 ? balance - price : balance });
});

// Release a rented DID back to the pool
router.post('/did/:id/release', async (req, res) => {
  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = NULL, status = 'available', primary_number = FALSE,
            expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND assigned_user_id = $2 RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Number not assigned to you' });
  res.json({ number: rows[0] });
});

export default router;
