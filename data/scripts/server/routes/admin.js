const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { createSession, destroySession, requireAdmin } = require('../auth');
const { rateLimitMiddleware } = require('../rateLimit');
const { checkLoginLock, recordFailedLogin, clearLoginAttempts } = require('../rateLimit');
const { validateLogin, validateScriptInput } = require('../validation');

const router = express.Router();

const GENERIC_LOGIN_ERROR = 'Invalid username or password.';
// A precomputed bcrypt hash of a random value, used so bcrypt.compare
// always runs (even for an unknown username) — avoids a timing
// side-channel that would otherwise reveal whether an account exists.
const DUMMY_HASH = '$2a$12$C2Jg8h3o0f7l9m8q1s2u2eZC5m8v0k1s6i9dQe4b6yQKqf6H1p6H1O';

// ---- Auth ----

router.post('/login', rateLimitMiddleware('login', 10, 60_000), async (req, res) => {
  const ip = req.ip || 'unknown';

  const lock = checkLoginLock(ip);
  if (lock.locked) {
    return res.status(429).json({ error: 'Account temporarily locked due to repeated failed attempts. Try again later.' });
  }

  const { valid, data } = validateLogin(req.body);
  if (!valid) return res.status(400).json({ error: GENERIC_LOGIN_ERROR });

  const admin = db.getAdminByUsername(data.username);
  const validPassword = await bcrypt.compare(data.password, admin ? admin.password_hash : DUMMY_HASH);

  if (!admin || !validPassword) {
    recordFailedLogin(ip);
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  clearLoginAttempts(ip);
  createSession(res, admin.id);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const { getAuthenticatedAdmin } = require('../auth');
  const admin = getAuthenticatedAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized.' });
  res.json({ admin: { username: admin.username } });
});

// ---- Everything below this line requires a valid admin session ----
router.use(requireAdmin);

router.get('/scripts', (req, res) => {
  const scripts = db.getAllScripts().map((s) => ({
    id: s.id,
    title: s.title,
    game_name: s.game_name,
    author: s.author,
    featured: s.featured,
    views: s.views,
    created_at: s.created_at,
  }));
  scripts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ scripts });
});

router.get('/scripts/:id', (req, res) => {
  const script = db.getScriptById(req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found.' });
  res.json({ script });
});

router.post('/scripts', rateLimitMiddleware('admin-write', 30, 60_000), (req, res) => {
  const { valid, errors, data } = validateScriptInput(req.body);
  if (!valid) return res.status(400).json({ error: 'Invalid input.', details: errors });

  const script = db.createScript(data);
  res.json({ ok: true, id: script.id });
});

router.put('/scripts/:id', rateLimitMiddleware('admin-write', 30, 60_000), (req, res) => {
  const existing = db.getScriptById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Script not found.' });

  const { valid, errors, data } = validateScriptInput(req.body);
  if (!valid) return res.status(400).json({ error: 'Invalid input.', details: errors });

  db.updateScript(req.params.id, data);
  res.json({ ok: true });
});

router.delete('/scripts/:id', rateLimitMiddleware('admin-write', 30, 60_000), (req, res) => {
  const deleted = db.deleteScript(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Script not found.' });
  res.json({ ok: true });
});

router.get('/stats', (req, res) => {
  const scripts = db.getAllScripts();
  const reports = db.getAllReports();

  const totals = {
    total_scripts: scripts.length,
    total_views: scripts.reduce((sum, s) => sum + s.views, 0),
    total_featured: scripts.filter((s) => s.featured).length,
    total_reports: reports.length,
  };

  const topScripts = scripts
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((s) => ({ id: s.id, title: s.title, views: s.views }));

  const recentReports = reports
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map((r) => {
      const script = db.getScriptById(r.script_id);
      return { id: r.id, reason: r.reason, created_at: r.created_at, title: script ? script.title : '(deleted script)', script_id: r.script_id };
    });

  res.json({ totals, topScripts, recentReports });
});

module.exports = router;
                     
