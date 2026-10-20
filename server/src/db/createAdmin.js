import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import env from '../config/env.js';

/**
 * Create (or update) an administrator account.
 * Values fall back to ADMIN_* environment variables when arguments are omitted.
 * Usage: npm run create-admin -- --name "Jane" --email jane@x.com --password "S3cret!pass" --role admin
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      args[key] = value;
      if (value) i += 1;
    }
  }
  return args;
}

async function promptFor(question, fallback) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const name = args.name || env.admin.name;
  const email = args.email || env.admin.email;
  let password = args.password || env.admin.password;
  const role = ['admin', 'staff', 'counsellor', 'editor'].includes(args.role) ? args.role : 'admin';

  if (!process.stdin.isTTY && !args.password) {
    password = env.admin.password;
  }

  if (!email || !email.includes('@')) {
    throw new Error('A valid --email is required.');
  }
  if (!password || password.length < 8) {
    throw new Error('--password must be at least 8 characters long.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);

  if (rows.length > 0) {
    await pool.execute('UPDATE users SET name = ?, password_hash = ?, role = ?, status = ?, auth_version = auth_version + 1 WHERE email = ?', [
      name,
      passwordHash,
      role,
      'active',
      email,
    ]);
    await pool.execute('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at,NOW()) WHERE user_id = ?', [rows[0].id]);
    console.log(`[create-admin] updated existing user ${email} (role: ${role}).`);
  } else {
    await pool.execute('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [
      name,
      email,
      passwordHash,
      role,
      'active',
    ]);
    console.log(`[create-admin] created ${role} ${email}.`);
  }

  await pool.end();
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error) => {
    console.error('[create-admin] failed:', error.message);
    process.exit(1);
  });
}

export { main as createAdmin, promptFor };
