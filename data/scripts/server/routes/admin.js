const express = require('express');
const db = require('../db');

const {
  createSession,
  destroySession,
  requireAdmin
} = require('../auth');

const {
  rateLimitMiddleware,
  checkLoginLock,
  recordFailedLogin,
  clearLoginAttempts
} = require('../rateLimit');

const {
  validateScriptInput
} = require('../validation');

const router = express.Router();

const STAFF_EMAIL = 'tracyalgarne7@gmail.com';

// ============================================================
// STAFF LOGIN
// ============================================================

router.post(
  '/login',
  rateLimitMiddleware('login', 10, 60_000),
  (req, res) => {
    const ip = req.ip || 'unknown';

    const lock = checkLoginLock(ip);

    if (lock.locked) {
      return res.status(429).json({
        error: 'Too many login attempts. Try again later.'
      });
    }

    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

    if (!email) {
      recordFailedLogin(ip);

      return res.status(400).json({
        error: 'Please enter the staff email.'
      });
    }

    if (email !== STAFF_EMAIL) {
      recordFailedLogin(ip);

      return res.status(403).json({
        error: 'Access denied. This email is not authorized.'
      });
    }

    /*
     * Find the local admin account.
     *
     * On a fresh deployment, create it automatically.
     */
    let admin = db.getAdminByUsername(STAFF_EMAIL);

    if (!admin) {
      db.upsertAdmin(
        STAFF_EMAIL,
        'EMAIL_ONLY_AUTH'
      );

      admin = db.getAdminByUsername(STAFF_EMAIL);
    }

    if (!admin) {
      console.error(
        'Unable to create or retrieve staff account.'
      );

      return res.status(500).json({
        error: 'Unable to create staff session.'
      });
    }

    clearLoginAttempts(ip);

    createSession(res, admin.id);

    return res.json({
      ok: true
    });
  }
);

// ============================================================
// LOGOUT
// ============================================================

router.post('/logout', (req, res) => {
  destroySession(req, res);

  res.json({
    ok: true
  });
});

// ============================================================
// CURRENT ADMIN
// ============================================================

router.get('/me', (req, res) => {
  const {
    getAuthenticatedAdmin
  } = require('../auth');

  const admin = getAuthenticatedAdmin(req);

  if (!admin) {
    return res.status(401).json({
      error: 'Unauthorized.'
    });
  }

  res.json({
    admin: {
      username: admin.username
    }
  });
});

// ============================================================
// EVERYTHING BELOW REQUIRES ADMIN SESSION
// ============================================================

router.use(requireAdmin);

// ============================================================
// GET ALL SCRIPTS
// ============================================================

router.get('/scripts', (req, res) => {
  const scripts = db
    .getAllScripts()
    .map((s) => ({
      id: s.id,
      title: s.title,
      game_name: s.game_name,
      author: s.author,
      featured: s.featured,
      views: s.views,
      created_at: s.created_at
    }));

  scripts.sort(
    (a, b) =>
      new Date(b.created_at) -
      new Date(a.created_at)
  );

  res.json({
    scripts
  });
});

// ============================================================
// GET SINGLE SCRIPT
// ============================================================

router.get('/scripts/:id', (req, res) => {
  const script = db.getScriptById(
    req.params.id
  );

  if (!script) {
    return res.status(404).json({
      error: 'Script not found.'
    });
  }

  res.json({
    script
  });
});

// ============================================================
// CREATE SCRIPT
// ============================================================

router.post(
  '/scripts',
  rateLimitMiddleware(
    'admin-write',
    30,
    60_000
  ),
  (req, res) => {
    const {
      valid,
      errors,
      data
    } = validateScriptInput(req.body);

    if (!valid) {
      return res.status(400).json({
        error: 'Invalid input.',
        details: errors
      });
    }

    const script = db.createScript(data);

    res.json({
      ok: true,
      id: script.id
    });
  }
);

// ============================================================
// UPDATE SCRIPT
// ============================================================

router.put(
  '/scripts/:id',
  rateLimitMiddleware(
    'admin-write',
    30,
    60_000
  ),
  (req, res) => {
    const existing =
      db.getScriptById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        error: 'Script not found.'
      });
    }

    const {
      valid,
      errors,
      data
    } = validateScriptInput(req.body);

    if (!valid) {
      return res.status(400).json({
        error: 'Invalid input.',
        details: errors
      });
    }

    db.updateScript(
      req.params.id,
      data
    );

    res.json({
      ok: true
    });
  }
);

// ============================================================
// DELETE SCRIPT
// ============================================================

router.delete(
  '/scripts/:id',
  rateLimitMiddleware(
    'admin-write',
    30,
    60_000
  ),
  (req, res) => {
    const deleted =
      db.deleteScript(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Script not found.'
      });
    }

    res.json({
      ok: true
    });
  }
);

// ============================================================
// ADMIN STATS
// ============================================================

router.get('/stats', (req, res) => {
  const scripts =
    db.getAllScripts();

  const reports =
    db.getAllReports();

  const totals = {
    total_scripts: scripts.length,

    total_views: scripts.reduce(
      (sum, s) =>
        sum + s.views,
      0
    ),

    total_featured:
      scripts.filter(
        (s) => s.featured
      ).length,

    total_reports:
      reports.length
  };

  const topScripts = scripts
    .slice()
    .sort(
      (a, b) =>
        b.views - a.views
    )
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      title: s.title,
      views: s.views
    }));

  const recentReports = reports
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    )
    .slice(0, 5)
    .map((r) => {
      const script =
        db.getScriptById(
          r.script_id
        );

      return {
        id: r.id,
        reason: r.reason,
        created_at:
          r.created_at,

        title: script
          ? script.title
          : '(deleted script)',

        script_id:
          r.script_id
      };
    });

  res.json({
    totals,
    topScripts,
    recentReports
  });
});

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
