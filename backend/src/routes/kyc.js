import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { ensureReferralCode } from '../services/referralService.js';

const router = Router();

router.use(authenticate);

// GET /api/kyc — my submission status
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM kyc_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
    [req.user.id]
  );
  const { rows: userRows } = await query('SELECT kyc_status FROM users WHERE id = $1', [req.user.id]);
  res.json({ kyc_status: userRows[0]?.kyc_status || 'not_verified', submission: rows[0] || null });
});

// POST /api/kyc — submit for verification
router.post('/', async (req, res) => {
  const { full_name, document_type, document_id } = req.body;
  if (!full_name || !document_type || !document_id) {
    return res.status(400).json({ error: 'full_name, document_type and document_id are required' });
  }
  const { rows } = await query(
    `SELECT id FROM kyc_submissions WHERE user_id = $1 AND status = 'pending'`,
    [req.user.id]
  );
  if (rows.length) return res.status(409).json({ error: 'You already have a pending submission' });

  await query(
    `INSERT INTO kyc_submissions (user_id, full_name, document_type, document_id)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, full_name, document_type, document_id]
  );
  res.status(201).json({ ok: true, message: 'Submission received, awaiting review' });
});

// GET /api/referral — my referral code + link + stats
router.get('/referral', async (req, res) => {
  const code = await ensureReferralCode(req.user.id);
  const [counts, earnings] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count
       FROM referrals WHERE referrer_id = $1`,
      [req.user.id]
    ),
    query(
      `SELECT COALESCE(SUM(bonus),0)::numeric AS earnings
       FROM referrals WHERE referrer_id = $1 AND status = 'paid'`,
      [req.user.id]
    ),
  ]);
  res.json({
    code,
    url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${code}`,
    count: counts.rows[0].count,
    earnings: Number(earnings.rows[0].earnings),
  });
});

export default router;
