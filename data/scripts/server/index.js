const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local')
});

const { getAuthenticatedAdmin } = require('./auth');
const { bootstrapAdmin } = require('./bootstrapAdmin');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// FIXED: public is located at:
// data/scripts/server/routes/public
const PUBLIC_DIR = path.join(__dirname, 'routes', 'public');

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ---- Security headers on every response ----
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- Protect admin HTML pages ----
app.use((req, res, next) => {
  const isAdminPage =
    req.path.startsWith('/admin') &&
    req.path !== '/admin/login.html';

  const isAdminPageRoot =
    req.path === '/admin' ||
    req.path === '/admin/';

  if (isAdminPage || isAdminPageRoot) {
    const admin = getAuthenticatedAdmin(req);

    if (!admin) {
      return res.redirect('/admin/login.html');
    }
  }

  next();
});

// ---- API routes ----
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// ---- Static website files ----
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html']
  })
);

// ---- Admin redirect ----
app.get('/admin', (req, res) => {
  res.redirect('/admin/index.html');
});

// ---- Generic error handler ----
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Something went wrong.'
  });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).sendFile(
    path.join(PUBLIC_DIR, '404.html')
  );
});

// ---- Start server ----
bootstrapAdmin().finally(() => {
  app.listen(PORT, () => {
    console.log(
      `COREX SCRIPT running at http://localhost:${PORT}`
    );
  });
});
