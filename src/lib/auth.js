import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET  = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const COOKIE_NAME = 'fc_token';
const COOKIE_MAX  = 30 * 24 * 60 * 60; // 30 days in seconds

// ── JWT ───────────────────────────────────────────────────────────────────────
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
export function buildCookieString(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX}${secure}`;
}

export function clearCookieString() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
}

export function getTokenFromRequest(request) {
  const header = request.headers.get('cookie') || '';
  const match  = header.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function getCurrentUser(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// ── Password ──────────────────────────────────────────────────────────────────
export const hashPassword    = (pw) => bcrypt.hash(pw, 10);
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);
