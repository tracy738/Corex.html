/**
 * Run with: npm run setup:admin
 * Creates or resets the single admin account. Only the bcrypt hash is
 * ever stored — the plaintext password never touches disk.
 */
const readline = require('readline');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const bcrypt = require('bcryptjs');
const db = require('../server/db');

function ask(question, hide = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hide) {
      console.log(question);
      rl.question('', (answer) => {
        rl.close();
        resolve(answer);
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main() {
  const username = process.env.ADMIN_USERNAME || (await ask('Admin username: '));
  const password = process.env.ADMIN_PASSWORD || (await ask('Admin password (min 10 chars): ', true));

  if (!username || !password || password.length < 10) {
    console.error('Username required and password must be at least 10 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  db.upsertAdmin(username, hash);

  console.log(`Admin account "${username}" is ready. Log in at /admin/login.html`);
  console.log('If you set ADMIN_PASSWORD in .env.local, remove it now — it is no longer needed.');
}

main();
    
