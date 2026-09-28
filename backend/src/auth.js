/**
 * Passwords and sign-in sessions.
 *
 * Passwords are hashed with scrypt (built into Node). A session token is 32
 * random bytes handed to the app once; the store only keeps its SHA-256, so
 * leaked storage can't be used to sign in, and signing out (deleting the
 * session) takes effect immediately.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const config = require('./config');

const scrypt = promisify(crypto.scrypt);

// OWASP's recommended minimum for scrypt: N=2^17, r=8, p=1. Tests lower N
// (SCRYPT_LOG_N) to stay fast; each hash records its own parameters.
const SCRYPT = {
  N: 2 ** (Number(process.env.SCRYPT_LOG_N) || 17),
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 256 * 1024 * 1024,
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const { N, r, p, keyLength, maxmem } = SCRYPT;
  const key = await scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, key] = String(stored).split('$');
  if (scheme !== 'scrypt' || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(actual, expected);
}

// Checked against when the email is unknown, so both failures take as long.
const dummyHash = hashPassword('not-a-real-password');

/** The account for this email and password, or null. */
async function authenticate(store, email, password) {
  const account = await store.getAccountByEmail(email);
  if (!account) {
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, account.passwordHash)) ? account : null;
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Creates a session for `account` and returns its bearer token. */
async function startSession(store, account, now) {
  const token = crypto.randomBytes(32).toString('base64url');
  await store.createSession({
    tokenHash: hashToken(token),
    accountId: account.id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + config.sessionDays * 24 * 60 * 60 * 1000),
  });
  return token;
}

async function accountForToken(store, token, now) {
  const session = await store.getSession(hashToken(token));
  if (!session || session.expiresAt <= now) return null;
  return store.getAccount(session.accountId);
}

async function endSession(store, token) {
  await store.deleteSession(hashToken(token));
}

module.exports = { hashPassword, verifyPassword, authenticate, startSession, accountForToken, endSession };
