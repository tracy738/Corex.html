const bcrypt = require('bcryptjs');
const db = require('./db');

/**
 * Runs once at server boot.
 *
 * Normal setup:
 * - Creates the admin if no account exists.
 *
 * Password reset:
 * - If ADMIN_RESET_PASSWORD is set, updates the existing admin's password.
 * - This is intended to be used once, then the environment variable should
 *   be removed from Render.
 */
async function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const resetPassword = process.env.ADMIN_RESET_PASSWORD;

  if (!username) {
    console.log('No ADMIN_USERNAME configured.');
    return;
  }

  const existing = db.getAdminByUsername(username);

  // ---- ONE-TIME PASSWORD RESET ----
  if (resetPassword) {
    if (resetPassword.length < 10) {
      console.warn(
        'ADMIN_RESET_PASSWORD must be at least 10 characters. Password reset skipped.'
      );
      return;
    }

    const hash = await bcrypt.hash(resetPassword, 12);

    if (existing) {
      db.upsertAdmin(username, hash);
      console.log(`Admin password for "${username}" has been reset.`);
    } else {
      db.upsertAdmin(username, hash);
      console.log(`Admin account "${username}" created with reset password.`);
    }

    console.log(
      'IMPORTANT: Remove ADMIN_RESET_PASSWORD from Render after this deployment.'
    );

    return;
  }

  // ---- NORMAL FIRST-TIME SETUP ----
  if (existing) {
    return;
  }

  if (!password) {
    console.log(
      'No admin account yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in Render.'
    );
    return;
  }

  if (password.length < 10) {
    console.warn(
      'ADMIN_PASSWORD is set but shorter than 10 characters — skipping admin creation.'
    );
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  db.upsertAdmin(username, hash);

  console.log(`Admin account "${username}" created from environment variables.`);
  console.log(
    'The admin password is stored as a bcrypt hash and is not printed to logs.'
  );
}

module.exports = { bootstrapAdmin };
