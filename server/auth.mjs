// Small name + 4-digit PIN auth. PINs are stored as scrypt hashes; sessions are signed tokens so they survive restarts.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dbDir } from './paths.mjs';

const TOKEN_TTL_MS = 7 * 86_400_000;
const MAX_FAILURES = 5;
const LOCK_MS = 30_000;
const failures = new Map();

export const isPin = pin => typeof pin === 'string' && /^\d{4}$/.test(pin);

export function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  return { pinSalt: salt, pinHash: scryptSync(pin, salt, 32).toString('hex') };
}

export function verifyPin(pin, user) {
  if (!isPin(pin) || !user?.pinSalt || !user?.pinHash) return false;
  const expected = Buffer.from(user.pinHash, 'hex');
  const actual = scryptSync(pin, user.pinSalt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function secret() {
  if (process.env.BARQ_SECRET) return process.env.BARQ_SECRET;
  const file = path.join(dbDir(), '.secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  mkdirSync(dbDir(), { recursive: true });
  const value = randomBytes(32).toString('hex');
  writeFileSync(file, value);
  return value;
}

const sign = payload => createHmac('sha256', secret()).update(payload).digest('base64url');

export function issueToken(userId, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: now + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id for a valid, unexpired token, otherwise null. */
export function readToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof sub === 'string' && typeof exp === 'number' && exp > now ? sub : null;
  } catch { return null; }
}

/** Seconds the account is locked after repeated wrong PINs, or 0. */
export function lockedFor(key, now = Date.now()) {
  const entry = failures.get(key);
  return entry && entry.until > now ? Math.ceil((entry.until - now) / 1000) : 0;
}
export function recordFailure(key, now = Date.now()) {
  const entry = failures.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) { entry.count = 0; entry.until = now + LOCK_MS; }
  failures.set(key, entry);
}
export const clearFailures = key => failures.delete(key);
