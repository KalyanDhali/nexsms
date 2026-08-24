import { Router } from 'express';
import { query } from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { isIpBlocked, recordLoginIp } from '../services/ipGuard.js';
import { applyReferralCode } from '../services/referralService.js';

const router = Router();

function clientIp(req) {
  const raw = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
  return raw ? raw.replace(/^::ffff:/, '') : null;
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, referralCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const blocked = await isIpBlocked(clientIp(req));
    if (blocked?.blocked) {
      return res.status(403).json({ error: 'Registration blocked from this network' });
    }
    const hashed = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (email, password, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, role`,
      [email.toLowerCase(), hashed, name || '']
    );
    if (!rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = rows[0];
    if (referralCode) await applyReferralCode(user.id, referralCode);
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, NOW() + interval \'30 days\')',
      [user.id, refreshToken]
    );
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const blocked = await isIpBlocked(clientIp(req));
    if (blocked?.blocked) {
      return res.status(403).json({ error: `Access blocked${blocked.reason ? ': ' + blocked.reason : ''}` });
    }
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email?.toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const ip = clientIp(req);
    await query(
      'INSERT INTO sessions (user_id, refresh_token, ip, expires_at) VALUES ($1, $2, $3, NOW() + interval \'30 days\')',
      [user.id, refreshToken, ip]
    );
    await recordLoginIp(user.id, ip);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance, billing_mode: user.billing_mode },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);
    const { rows } = await query(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.refresh_token = $1 AND s.expires_at > NOW()',
      [refreshToken]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const user = rows[0];
    res.json({ accessToken: signAccessToken(user) });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
