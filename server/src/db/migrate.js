import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from '../config/db.js';

const migrationDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Apply only PostgreSQL application migrations. Historical MySQL files are audit records. */
export async function runMigrations({ log = console.log } = {}) {
  const files = (await fs.readdir(migrationDir))
    .filter((name) => /^pg_\d+_[a-z0-9_-]+\.sql$/.test(name))
    .sort();
  const client = await pool.connect();
  let applied = 0;
  try {
    await client.query('SELECT pg_advisory_lock(314159265)');
    const schema = await client.query("SELECT to_regclass('public.schema_migrations') AS migrations, to_regclass('public.users') AS users");
    if (!schema.rows[0]?.migrations || !schema.rows[0]?.users) {
      throw new Error('Supabase base schema is missing. Import it before applying application migrations.');
    }
    for (const name of files) {
      const found = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (found.rowCount) continue;
      const sql = await fs.readFile(path.join(migrationDir, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        applied += 1;
        log(`[migrate] Applied ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${error.message}`, { cause: error });
      }
    }
    log(`[migrate] ${applied} application migration(s) applied.`);
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock(314159265)').catch(() => {});
    client.release();
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runMigrations().then(() => closePool()).catch(async (error) => {
  console.error('[migrate] failed:', error.message);
  await closePool();
  process.exitCode = 1;
});
