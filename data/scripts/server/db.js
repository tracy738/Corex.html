// Simple JSON-file datastore. No native compiled dependencies (unlike
// better-sqlite3), so this installs and runs anywhere Node runs —
// including Termux on Android with zero build tools required.
//
// This file is server-only. It is never bundled or sent to the browser.

const fs = require('fs');
const path = require('path');

// Allow the data directory to be overridden via env var — needed on hosts
// like Railway where only a mounted volume path (not the app's own
// directory) survives across redeploys.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  scripts: path.join(DATA_DIR, 'scripts.json'),
  admins: path.join(DATA_DIR, 'admins.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  loginAttempts: path.join(DATA_DIR, 'login-attempts.json'),
  meta: path.join(DATA_DIR, 'meta.json'), // stores auto-increment counters
};

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    // A corrupt file should never crash the server — fall back to empty state.
    return fallback;
  }
}

function writeJSON(file, data) {
  // Write to a temp file then rename, so a crash mid-write can't corrupt
  // the real file (atomic on POSIX filesystems, which includes Termux).
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function nextId(counterName) {
  const meta = readJSON(FILES.meta, {});
  const next = (meta[counterName] || 0) + 1;
  meta[counterName] = next;
  writeJSON(FILES.meta, meta);
  return next;
}

// ---- Scripts ----

function getAllScripts() {
  return readJSON(FILES.scripts, []);
}

function saveAllScripts(scripts) {
  writeJSON(FILES.scripts, scripts);
}

function getScriptById(id) {
  return getAllScripts().find((s) => s.id === Number(id)) || null;
}

function createScript(data) {
  const scripts = getAllScripts();
  const now = new Date().toISOString();
  const script = {
    id: nextId('scripts'),
    title: data.title,
    game_name: data.game_name,
    description: data.description || '',
    code: data.code,
    author: data.author || 'Owner',
    tags: Array.isArray(data.tags) ? data.tags : [],
    thumbnail_url: data.thumbnail_url || null,
    featured: !!data.featured,
    views: 0,
    created_at: now,
    updated_at: now,
  };
  scripts.push(script);
  saveAllScripts(scripts);
  return script;
}

function updateScript(id, data) {
  const scripts = getAllScripts();
  const idx = scripts.findIndex((s) => s.id === Number(id));
  if (idx === -1) return null;
  scripts[idx] = {
    ...scripts[idx],
    title: data.title,
    game_name: data.game_name,
    description: data.description || '',
    code: data.code,
    author: data.author || 'Owner',
    tags: Array.isArray(data.tags) ? data.tags : [],
    thumbnail_url: data.thumbnail_url || null,
    featured: !!data.featured,
    updated_at: new Date().toISOString(),
  };
  saveAllScripts(scripts);
  return scripts[idx];
}

function deleteScript(id) {
  const scripts = getAllScripts();
  const next = scripts.filter((s) => s.id !== Number(id));
  const changed = next.length !== scripts.length;
  if (changed) saveAllScripts(next);
  return changed;
}

function incrementViews(id) {
  const scripts = getAllScripts();
  const script = scripts.find((s) => s.id === Number(id));
  if (script) {
    script.views += 1;
    saveAllScripts(scripts);
  }
}

// ---- Admins ----

function getAdminByUsername(username) {
  const admins = readJSON(FILES.admins, []);
  return admins.find((a) => a.username === username) || null;
}

function getAdminById(id) {
  const admins = readJSON(FILES.admins, []);
  return admins.find((a) => a.id === Number(id)) || null;
}

function upsertAdmin(username, passwordHash) {
  const admins = readJSON(FILES.admins, []);
  const idx = admins.findIndex((a) => a.username === username);
  if (idx >= 0) {
    admins[idx].password_hash = passwordHash;
  } else {
    admins.push({ id: nextId('admins'), username, password_hash: passwordHash });
  }
  writeJSON(FILES.admins, admins);
}

// ---- Sessions ----

function createSessionRecord(token, adminId, expiresAt) {
  const sessions = readJSON(FILES.sessions, {});
  sessions[token] = { adminId, expiresAt };
  writeJSON(FILES.sessions, sessions);
}

function getSession(token) {
  const sessions = readJSON(FILES.sessions, {});
  return sessions[token] || null;
}

function deleteSession(token) {
  const sessions = readJSON(FILES.sessions, {});
  delete sessions[token];
  writeJSON(FILES.sessions, sessions);
}

// ---- Reports ----

function createReport(scriptId, reason) {
  const reports = readJSON(FILES.reports, []);
  reports.push({
    id: nextId('reports'),
    script_id: Number(scriptId),
    reason,
    created_at: new Date().toISOString(),
  });
  writeJSON(FILES.reports, reports);
}

function getAllReports() {
  return readJSON(FILES.reports, []);
}

// ---- Login attempt tracking ----

function getLoginAttempts(ip) {
  const attempts = readJSON(FILES.loginAttempts, {});
  return attempts[ip] || { attempts: 0, lockedUntil: null };
}

function setLoginAttempts(ip, record) {
  const attempts = readJSON(FILES.loginAttempts, {});
  attempts[ip] = record;
  writeJSON(FILES.loginAttempts, attempts);
}

function clearLoginAttempts(ip) {
  const attempts = readJSON(FILES.loginAttempts, {});
  delete attempts[ip];
  writeJSON(FILES.loginAttempts, attempts);
}

module.exports = {
  getAllScripts,
  getScriptById,
  createScript,
  updateScript,
  deleteScript,
  incrementViews,
  getAdminByUsername,
  getAdminById,
  upsertAdmin,
  createSessionRecord,
  getSession,
  deleteSession,
  createReport,
  getAllReports,
  getLoginAttempts,
  setLoginAttempts,
  clearLoginAttempts,
};
