const db = require('./db');

// ---- Generic in-memory rate limiter (per IP, per bucket key) ----

const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false };
  }

  bucket.count += 1;
  return { allowed: true };
}

function rateLimitMiddleware(prefix, limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const { allowed } = rateLimit(`${prefix}:${ip}`, limit, windowMs);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    }
    next();
  };
}

// ---- Persistent login lockout (survives restarts, unlike the bucket above) ----

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginLock(ip) {
  const record = db.getLoginAttempts(ip);
  if (!record.lockedUntil) return { locked: false };
  if (record.lockedUntil > Date.now()) return { locked: true };
  return { locked: false };
}

function recordFailedLogin(ip) {
  const record = db.getLoginAttempts(ip);
  const attempts = (record.attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
  db.setLoginAttempts(ip, { attempts, lockedUntil });
}

function clearLoginAttempts(ip) {
  db.clearLoginAttempts(ip);
}

module.exports = {
  rateLimit,
  rateLimitMiddleware,
  checkLoginLock,
  recordFailedLogin,
  clearLoginAttempts,
};
  
