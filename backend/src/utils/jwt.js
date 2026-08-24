import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

export function signTwoFaToken(user) {
  return jwt.sign(
    { sub: user.id, purpose: '2fa' },
    config.jwt.secret,
    { expiresIn: '5m' }
  );
}

export function verifyTwoFaToken(token) {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.purpose !== '2fa') throw new Error('Invalid token purpose');
  return payload;
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}
