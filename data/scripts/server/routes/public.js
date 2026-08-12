const express = require('express');
const db = require('../db');
const { rateLimitMiddleware } = require('../rateLimit');
const { validateReport } = require('../validation');

const router = express.Router();

// Fields safe to expose to anonymous visitors in LIST views. The full
// `code` field is deliberately stripped here so browsing the site never
// ships every script's source in one response — only opening a specific
// script's detail page fetches its code.
function toPublicListItem(s) {
  return {
    id: s.id,
    title: s.title,
    game_name: s.game_name,
    description: s.description,
    author: s.author,
    tags: s.tags,
    thumbnail_url: s.thumbnail_url,
    featured: s.featured,
    views: s.views,
    created_at: s.created_at,
  };
}

function toPublicDetail(s) {
  return { ...toPublicListItem(s), code: s.code };
}

// GET /api/scripts?section=featured|latest|popular&limit=12
router.get('/scripts', rateLimitMiddleware('list', 60, 60_000), (req, res) => {
  const { section } = req.query;
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  let scripts = db.getAllScripts();

  if (section === 'featured') scripts = scripts.filter((s) => s.featured);

  scripts = scripts.slice().sort((a, b) => {
    if (section === 'popular') return b.views - a.views;
    return new Date(b.created_at) - new Date(a.created_at); // latest / featured / default
  });

  res.json({ scripts: scripts.slice(0, limit).map(toPublicListItem) });
});

// GET /api/scripts/:id — increments the view count once per load
router.get('/scripts/:id', rateLimitMiddleware('detail', 60, 60_000), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Script not found.' });
  }

  const script = db.getScriptById(id);
  if (!script) return res.status(404).json({ error: 'Script not found.' });

  db.incrementViews(id);

  res.json({ script: toPublicDetail(script) });
});

// POST /api/scripts/:id/report — no auth required, but tightly rate limited
router.post('/scripts/:id/report', rateLimitMiddleware('report', 5, 60_000), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Script not found.' });
  }

  const script = db.getScriptById(id);
  if (!script) return res.status(404).json({ error: 'Script not found.' });

  const { valid, data } = validateReport(req.body);
  if (!valid) return res.status(400).json({ error: 'Invalid report.' });

  db.createReport(id, data.reason);
  res.json({ ok: true });
});

// GET /api/search?q=&tag=&sort=newest|popular|featured
router.get('/search', rateLimitMiddleware('search', 40, 60_000), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 200);
  const tag = req.query.tag ? String(req.query.tag).trim().toLowerCase().slice(0, 50) : null;
  const sort = ['newest', 'popular', 'featured'].includes(req.query.sort) ? req.query.sort : 'newest';

  let scripts = db.getAllScripts();

  if (q) {
    scripts = scripts.filter((s) => {
      const haystack = [s.title, s.game_name, ...(s.tags || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  if (tag) {
    scripts = scripts.filter((s) => (s.tags || []).some((t) => t.toLowerCase() === tag));
  }

  scripts = scripts.slice().sort((a, b) => {
    if (sort === 'popular') return b.views - a.views;
    if (sort === 'featured') return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  res.json({ scripts: scripts.slice(0, 50).map(toPublicListItem) });
});

module.exports = router;
