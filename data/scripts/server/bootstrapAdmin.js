const bcrypt = require('bcryptjs');
const db = require('./db');

/**
 * Runs once at server boot. If no admin account exists yet and
 * ADMIN_USERNAME/ADMIN_PASSWORD are set in the environment, creates the
 * account (storing only the bcrypt hash). Safe to leave the env vars set
 * across restarts — this only acts when there is no admin yet, so it
 * won't reset an existing account's password on redeploy.
 */
async function bootstrapAdmin() {
  const existing = db.getAdminByUsername(process.env.ADMIN_USERNAME || '');
  if (existing) return; // already set up

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('No admin account yet. Set ADMIN_USERNAME and ADMIN_PASSWORD env vars and redeploy, or run `npm run setup:admin` locally against this data directory.');
    return;
  }

  if (password.length < 10) {
    console.warn('ADMIN_PASSWORD is set but shorter than 10 characters — skipping admin creation.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  db.upsertAdmin(username, hash);
  console.log(`Admin account "${username}" created from environment variables.`);
  console.log('You can remove ADMIN_PASSWORD from your environment now — it is not read again once the account exists.');
}

module.exports = { bootstrapAdmin };
