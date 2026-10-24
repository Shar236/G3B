import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryOne, closePool } from '../config/db.js';

export async function runMigrations({ log = console.log } = {}) {
  const row = await queryOne("SELECT to_regclass('public.schema_migrations') AS migrations, to_regclass('public.users') AS users");
  if (!row?.migrations || !row?.users) {
    throw new Error('Supabase schema has not been imported. Run `npm run migrate:supabase` with the guarded source/destination variables.');
  }
  log('[migrate] Supabase PostgreSQL schema is present; no pending application migrations.');
  return 0;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runMigrations().then(() => closePool()).catch((error) => { console.error('[migrate] failed:', error.message); process.exit(1); });
