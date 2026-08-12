# COREX SCRIPT (plain HTML/CSS/JS edition)

An owner-controlled Roblox script-sharing site. Visitors browse, search,
view, and copy scripts. Only the owner (via `/admin`) can add, edit,
delete, or feature them.

This is a **static HTML/CSS/vanilla-JS frontend** backed by a small
**Express** server, with **no build step and no native/compiled
dependencies** — everything is pure JavaScript, so it installs and runs
the same on a regular computer or inside Termux on Android.

## Why no database engine?

Instead of SQLite (which needs a compiler to install on Termux) this uses
plain JSON files under `data/` with atomic writes. It's fine for a
single-owner site with a moderate script library. If you outgrow it, the
data-access functions are all isolated in `server/db.js`, so swapping in
Postgres/SQLite/etc. later only touches that one file.

## Quick start

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and set `ADMIN_USERNAME` / `ADMIN_PASSWORD` (used once,
below — never read at runtime).

```bash
npm run setup:admin   # hashes your password into data/admins.json
```

Then delete `ADMIN_PASSWORD` from `.env.local` — no longer needed.

```bash
npm run seed          # optional: adds 3 example scripts
npm start
```

Visit `http://localhost:3000` for the public site,
`http://localhost:3000/admin/login.html` to sign in as the owner.

### Running on Termux (Android)

```bash
pkg install nodejs
```

No `clang`/`make`/Python needed — there's nothing to compile. Then follow
the Quick Start above. Open `http://localhost:3000` in your phone's
browser. Note this only serves locally to the device itself unless you
expose the port (e.g. via a tunnel) — see the deployment note below.

## Project layout

```
server/
  index.js       Express app: security headers, static files, admin page guard
  db.js          JSON-file datastore (server-only)
  auth.js        session cookie creation/verification
  rateLimit.js   in-memory rate limiter + persistent login lockout
  validation.js  hand-rolled input validation for every admin write
  routes/
    public.js    read-only endpoints: list, detail, search, report
    admin.js     owner-only: login, logout, script CRUD, stats
public/
  index.html, scripts.html, script.html, search.html   public pages
  admin/         owner-only pages (guarded server-side)
  js/            vanilla JS: one file per page + shared helpers
  css/style.css  the whole design system
scripts/
  create-admin.js   one-time CLI to set the owner's password (bcrypt hash only)
  seed.js           optional demo content
```

## How the permission model is enforced

Enforced in three independent places, so no single bug exposes it:

1. **Server middleware** (`server/index.js`) — any request under
   `/admin/*` (other than the login page) is checked against the session
   store before the static file is even served; unauthenticated requests
   are redirected to the login page.
2. **`requireAdmin` middleware** (`server/auth.js`) — mounted in front of
   every route in `server/routes/admin.js`. This is the layer that
   actually matters, since it's what a client would have to defeat to
   write data directly by calling the API.
3. **Client-side `initAdminShell()`** (`public/js/admin-common.js`) — a
   convenience check that calls `/api/admin/me` and bounces to the login
   page if the session has expired mid-visit. This is UX polish, not
   security — the two layers above are what actually protect the data.

Public script **list** endpoints never include the `code` field — the
full text of every script isn't shipped to the browser on page load.
Only requesting a specific script's detail (`/api/scripts/:id`) returns
its code.

## Security checklist

- [x] Secrets never sent to the browser; `.env*` gitignored
- [x] Passwords hashed with bcrypt (cost 12, via `bcryptjs` — pure JS, no
      native build), never logged or returned by any endpoint
- [x] Sessions: HttpOnly, Secure (in production), SameSite=Strict,
      server-side session store so logout revokes immediately
- [x] Login rate limiting (10/min) + persistent lockout after 5 failed
      attempts (15 min), stored in `data/login-attempts.json` so it
      survives a restart
- [x] `bcrypt.compare` always runs, even for an unknown username, so
      response timing doesn't leak whether an account exists
- [x] Every admin write validated server-side (`server/validation.js`) —
      no client-supplied `id`, `views`, or timestamps are ever trusted
- [x] Generic error messages returned to clients; stack traces are
      logged server-side only, never sent in a response
- [x] Security headers: CSP (locked to `'self'`, no third-party script
      hosts since there's no CDN dependency), X-Content-Type-Options,
      Referrer-Policy, HSTS (in production), X-Frame-Options,
      Permissions-Policy
- [x] `x-powered-by` header disabled
- [x] Public APIs rate-limited (list/search/detail/report)
- [x] Report endpoint is heavily rate-limited (5/min) since it needs no auth
- [x] CSRF mitigation: all state-changing requests require
      `Content-Type: application/json`, which a plain HTML `<form>`
      cannot send cross-site — combined with `SameSite=Strict` cookies,
      this blocks classic form-based CSRF without needing a token

## Deploying to Railway

1. **Push this project to a GitHub repo.** Railway deploys from a repo
   (or via its CLI) — it auto-detects Node from `package.json` and runs
   `npm install` then `npm start`.

2. **Create the Railway project.** railway.app → New Project → Deploy
   from GitHub repo → pick this repo.

3. **Add a persistent Volume.** This is the important part: a Railway
   service's own disk does *not* reliably survive a redeploy — only a
   mounted Volume does. In the service's **Settings → Volumes**, add a
   volume and mount it at `/data` (1GB is plenty to start).

4. **Set environment variables** (Settings → Variables):
   - `NODE_ENV=production`
   - `DATA_DIR=/data` — points the app's JSON datastore at the volume
     instead of its own (non-persistent) app directory
   - `ADMIN_USERNAME=<your chosen username>`
   - `ADMIN_PASSWORD=<a strong password, 10+ characters>`

   `PORT` is injected automatically by Railway — don't set it yourself.

5. **Deploy.** Railway builds and starts the app. On first boot, it
   detects there's no admin account yet, hashes `ADMIN_PASSWORD` with
   bcrypt, and creates the account on the mounted volume
   (`server/bootstrapAdmin.js`). This only happens once — later
   redeploys won't touch an existing account, so it's safe to leave the
   env vars set. If you'd rather not keep the password sitting in an env
   var indefinitely, delete `ADMIN_PASSWORD` after confirming login
   works; `ADMIN_USERNAME` can stay.

6. **Get your URL.** Settings → Networking → Generate Domain gives you a
   public `*.up.railway.app` URL (or attach a custom domain there).

7. **Log in** at `https://<your-domain>/admin/login.html` with the
   username/password you set, and confirm scripts you add in
   `/admin/create.html` are still there after triggering a redeploy
   (push a small commit) — that confirms the volume is wired up
   correctly.

If you ever add scripts before setting up the volume correctly, they'll
vanish on the next deploy — that's the one mistake to avoid here, so
it's worth doing step 3 before step 5.

## Before you deploy for real

- Put this behind HTTPS (`NODE_ENV=production` enables `Secure` cookies
  and HSTS — both require HTTPS to function correctly).
- Set real environment variables through your host's secret manager, not
  a committed file.
- The JSON datastore uses simple whole-file reads/writes — fine for one
  process. If you need multiple server instances behind a load balancer,
  move to a real database (the `server/db.js` functions are the only
  place that would need to change) and a shared session/rate-limit store
  (e.g. Redis).
- Run `npm audit` periodically and keep dependencies current.
- A phone running Termux is fine for local development, but isn't a
  serious production host — for a real public deployment, use a small
  VPS, Fly.io, Railway, Render, or similar.
