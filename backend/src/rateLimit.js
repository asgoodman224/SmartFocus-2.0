const { HttpError } = require('./validation');

/**
 * Counts attempts per key in fixed windows, kept in memory (one server).
 * `hit(key, now)` throws a 429 once a key has had `limit` attempts in the
 * current window.
 */
function rateLimiter({ limit, windowMs }) {
  const windows = new Map(); // key → { start, count }

  return function hit(key, now) {
    const t = now.getTime();
    let entry = windows.get(key);
    if (!entry || t - entry.start >= windowMs) {
      if (windows.size > 10_000) {
        for (const [k, e] of windows) if (t - e.start >= windowMs) windows.delete(k);
      }
      entry = { start: t, count: 0 };
      windows.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.start + windowMs - t) / 1000);
      throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.', {
        'Retry-After': String(retryAfter),
      });
    }
  };
}

module.exports = { rateLimiter };
