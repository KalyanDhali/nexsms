import { verifyAccessToken } from '../utils/jwt.js';
import { query } from '../models/db.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const { rows } = await query('SELECT id, email, name, role, status FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}
