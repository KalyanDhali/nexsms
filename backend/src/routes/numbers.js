import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getProviderAdapter } from '../adapters/index.js';

const router = Router();

router.use(authenticate);

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
  const { number, providerId, buyFromProvider, countryCode, areaCode, geo_country, geo_area_code, monthly_cost } = req.body;

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
      `INSERT INTO numbers (number, provider_id, status, geo_country, geo_area_code, monthly_cost)
       VALUES ($1, $2, 'available', $3, $4, $5)
       ON CONFLICT (number) DO UPDATE SET status = 'available', provider_id = EXCLUDED.provider_id
       RETURNING *`,
      [finalNumber, finalProviderId, geo_country || countryCode || 'US', geo_area_code || areaCode || null, monthly_cost || 0]
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

  const { rows } = await query(
    `UPDATE numbers SET assigned_user_id = $2, status = 'assigned', primary_number = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, userId, isPrimary]
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
     WHERE n.assigned_user_id = $1 AND n.status = 'assigned'
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

export default router;
