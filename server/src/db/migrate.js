import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import env from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Apply every `.sql` file inside src/db/migrations in filename order.
 * Applied migrations are recorded in `schema_migrations` so re-runs are safe.
 */
export async function runMigrations({ log = console.log } = {}) {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_schema_migrations_name (name)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    const [appliedRows] = await connection.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.name));

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        log(`[migrate] skip   ${file} (already applied)`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      log(`[migrate] apply  ${file}`);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      count += 1;
    }

    log(count === 0 ? '[migrate] database already up to date.' : `[migrate] applied ${count} migration(s).`);
    return count;
  } finally {
    await connection.end();
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('[migrate] failed:', error.message);
    process.exit(1);
  }
}
