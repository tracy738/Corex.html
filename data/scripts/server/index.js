const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { getAuthenticatedAdmin } = require('./auth');
const { bootstrapAdmin } = require('./bootstrapAdmin');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1); // needed for req.ip to reflect X-Forwarded-For behind a proxy
app.disable('x-powered-by'); // don't leak "Express" in headers

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
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- Guard admin HTML pages server-side (defense in depth on top of the
// API-level checks below, which are what actually matters for security) ----
app.use((req, res, next) => {
  const isAdminPage = req.path.startsWith('/admin') && req.path !== '/admin/login.html';
  const isAdminPageRoot = req.path === '/admin' || req.path === '/admin/';
  if (isAdminPage || isAdminPageRoot) {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return res.redirect('/admin/login.html');
    }
  }
  next();
});

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.get('/admin', (req, res) => res.redirect('/admin/index.html'));

// Generic error handler — never leak stack traces or internals to the client.
app.use((err, req, res, next) => {
  console.error(err); // server-side log only
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

bootstrapAdmin().finally(() => {
  app.listen(PORT, () => {
    console.log(`COREX SCRIPT running at http://localhost:${PORT}`);
  });
});
