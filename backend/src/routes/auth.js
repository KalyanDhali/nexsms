import { Router } from 'express';
import { query } from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, signTwoFaToken, verifyTwoFaToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { isIpBlocked, recordLoginIp } from '../services/ipGuard.js';
import { applyReferralCode } from '../services/referralService.js';
import { generateSecret, verifyTotp, otpauthUri } from '../services/totp.js';
import qrcode from 'qrcode';

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
    if (user.two_factor_enabled) {
      return res.status(200).json({ twoFaRequired: true, twoFaToken: signTwoFaToken(user) });
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

router.post('/2fa/verify-login', async (req, res) => {
  try {
    const { twoFaToken, code } = req.body;
    if (!twoFaToken || !code) return res.status(400).json({ error: 'Code is required' });
    let payload;
    try {
      payload = verifyTwoFaToken(twoFaToken);
    } catch {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length || !rows[0].two_factor_enabled || !rows[0].two_factor_secret) {
      return res.status(401).json({ error: 'Two-factor is not enabled for this account' });
    }
    const user = rows[0];
    if (!verifyTotp(user.two_factor_secret, code)) {
      return res.status(401).json({ error: 'Invalid verification code' });
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
    console.error('2fa verify-login error:', err);
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

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const ok = await comparePassword(currentPassword, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await hashPassword(newPassword);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('change-password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = generateSecret();
    const { rows } = await query(
      'UPDATE users SET two_factor_secret = $1, two_factor_enabled = FALSE, updated_at = NOW() WHERE id = $2 RETURNING email',
      [secret, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const account = rows[0].email;
    const uri = otpauthUri(secret, account);
    const qr = await qrcode.toDataURL(uri);
    res.json({ secret, otpauth: uri, qr });
  } catch (err) {
    console.error('2fa setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required' });
    const { rows } = await query('SELECT two_factor_secret FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length || !rows[0].two_factor_secret) {
      return res.status(400).json({ error: 'No 2FA setup in progress' });
    }
    if (!verifyTotp(rows[0].two_factor_secret, code)) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    await query('UPDATE users SET two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1', [req.user.id]);
    res.json({ ok: true, two_factor_enabled: true });
  } catch (err) {
    console.error('2fa verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required' });
    const { rows } = await query('SELECT two_factor_secret FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length || !rows[0].two_factor_secret) {
      return res.status(400).json({ error: 'Two-factor is not enabled' });
    }
    if (!verifyTotp(rows[0].two_factor_secret, code)) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    await query(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );
    res.json({ ok: true, two_factor_enabled: false });
  } catch (err) {
    console.error('2fa disable error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, name, role, status, balance, currency, billing_mode, kyc_status, avatar, two_factor_enabled, api_key, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    const [smsRes, numsRes, planRes] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS sms_sent
         FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1 AND m.direction = 'out'`,
        [req.user.id]
      ),
      query('SELECT COUNT(*)::int AS active_numbers FROM numbers WHERE assigned_user_id = $1', [req.user.id]),
      query(
        `SELECT p.name FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.user_id = $1 AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1`,
        [req.user.id]
      ),
    ]);

    res.json({
      user,
      usage: {
        sms_sent: smsRes.rows[0]?.sms_sent ?? 0,
        call_minutes: 0,
        active_numbers: numsRes.rows[0]?.active_numbers ?? 0,
      },
      plan: planRes.rows[0]?.name || null,
    });
  } catch (err) {
    console.error('profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
