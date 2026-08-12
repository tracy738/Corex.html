const crypto = require('crypto');
const db = require('./db');

const SESSION_COOKIE = 'cx_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function createSession(res, adminId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.createSessionRecord(token, adminId, expiresAt);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });

  return token;
}

function destroySession(req, res) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) db.deleteSession(token);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Resolves the session cookie against the server-side session store.
 * Never trust the mere presence of the cookie — always look it up.
 */
function getAuthenticatedAdmin(req) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = db.getSession(token);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    db.deleteSession(token);
    return null;
  }

  const admin = db.getAdminById(session.adminId);
  if (!admin) return null;

  return { id: admin.id, username: admin.username };
}

/** Express middleware: rejects any /api/admin/* request without a valid session. */
function requireAdmin(req, res, next) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  req.admin = admin;
  next();
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  destroySession,
  getAuthenticatedAdmin,
  requireAdmin,
};
