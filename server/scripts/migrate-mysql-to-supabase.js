/**
 * G3B Education – MySQL → Supabase PostgreSQL migration script
 *
 * Safety controls:
 *   - Requires ALLOW_SUPABASE_SCHEMA_CREATE=true to run
 *   - Refuses to run if the Supabase public schema is already populated
 *   - Never modifies or deletes the source MySQL database
 *   - Never prints credentials in logs
 *   - Rolls back all DDL+DML on any failure (single transaction)
 *   - Resets identity sequences after data import
 *   - Enables RLS on every table
 *   - Orders foreign keys topologically to avoid constraint violations
 *
 * Usage (from server/ directory):
 *   npm run migrate:supabase
 *
 * Required environment variables (in server/.env):
 *   SOURCE_DB_HOST, SOURCE_DB_USER, SOURCE_DB_PASSWORD, SOURCE_DB_NAME
 *   SUPABASE_DB_URL (Transaction pooler URL from Supabase Dashboard → Connect)
 *   ALLOW_SUPABASE_SCHEMA_CREATE=true
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { postgresConnectionOptions } from '../src/config/postgres.js';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

// ─────────────────────────────────────────────────────── helpers ────
const { Client } = pg;

const required = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
};

/** Validate and return a clean Supabase connection URL (never log it). */
function validateDestinationUrl(rawValue) {
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(
      'SUPABASE_DB_URL must be a valid PostgreSQL connection URL from Supabase Dashboard → Connect → Transaction pooler.',
    );
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('SUPABASE_DB_URL must start with postgresql://');
  }
  if (/POOLER_HOST|pooler[_-]?host/i.test(parsed.hostname) || /PROJECT_REF/i.test(rawValue)) {
    throw new Error(
      'SUPABASE_DB_URL still contains a placeholder (POOLER_HOST or PROJECT_REF). ' +
      'Copy the complete Transaction pooler URL from Supabase Dashboard → Project Settings → Database → Connection string → Transaction pooler.',
    );
  }
  if (!parsed.hostname || !parsed.username || !parsed.password) {
    throw new Error(
      'SUPABASE_DB_URL is incomplete. The URL must include a real pooler host, username, and URL-encoded database password.',
    );
  }
  if (/your[_-]?(password|host)/i.test(decodeURIComponent(parsed.password))) {
    throw new Error('SUPABASE_DB_URL still contains a placeholder password. Replace it with the real database password.');
  }
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('ssl');
  return parsed.toString();
}

/** PostgreSQL double-quote identifier */
const qi = (v) => `"${String(v).replaceAll('"', '""')}"`;

/** MySQL backtick identifier */
const mi = (v) => `\`${String(v).replaceAll('`', '``')}\``;

/** Map MySQL column to PostgreSQL type string */
function pgType(column) {
  const type = column.DATA_TYPE.toLowerCase();
  if (type === 'tinyint') return column.COLUMN_TYPE === 'tinyint(1)' ? 'smallint' : 'smallint';
  if (['smallint', 'mediumint'].includes(type)) return 'integer';
  if (type === 'int') return /unsigned/i.test(column.COLUMN_TYPE) ? 'bigint' : 'integer';
  if (type === 'bigint') return /unsigned/i.test(column.COLUMN_TYPE) ? 'numeric(20,0)' : 'bigint';
  if (['decimal', 'numeric'].includes(type)) return `numeric(${column.NUMERIC_PRECISION},${column.NUMERIC_SCALE})`;
  if (['float', 'double'].includes(type)) return 'double precision';
  if (['datetime', 'timestamp'].includes(type)) return 'timestamptz';
  if (type === 'date') return 'date';
  if (type === 'time') return 'time';
  if (type === 'year') return 'integer';
  if (type === 'json') return 'jsonb';
  if (['blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary'].includes(type)) return 'bytea';
  if (['text', 'tinytext', 'mediumtext', 'longtext', 'enum'].includes(type)) return 'text';
  if (['char', 'varchar'].includes(type)) return `${type}(${column.CHARACTER_MAXIMUM_LENGTH})`;
  throw new Error(`Unsupported MySQL data type requires an explicit conversion: ${type}`);
}

/** Convert MySQL DEFAULT value to PostgreSQL DEFAULT clause */
function pgDefault(column) {
  if (column.COLUMN_DEFAULT === null) return '';
  const value = String(column.COLUMN_DEFAULT);
  if (/^current_timestamp(?:\(\d*\))?$/i.test(value)) return ' DEFAULT CURRENT_TIMESTAMP';
  if (/^NULL$/i.test(value)) return '';
  if (/^-?\d+(\.\d+)?$/.test(value)) return ` DEFAULT ${value}`;
  return ` DEFAULT '${value.replaceAll("'", "''")}'`;
}

/**
 * Topological sort of tables based on foreign-key dependencies.
 * Returns tables in an order where referenced tables come before referencing ones.
 */
function topoSort(tableNames, foreignKeys) {
  const deps = new Map(tableNames.map((t) => [t, new Set()]));
  for (const fk of foreignKeys) {
    if (deps.has(fk.table_name) && fk.referenced_table_name !== fk.table_name) {
      deps.get(fk.table_name).add(fk.referenced_table_name);
    }
  }
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  function visit(table) {
    if (visiting.has(table)) return; // circular → skip
    if (visited.has(table)) return;
    visiting.add(table);
    for (const dep of (deps.get(table) || [])) visit(dep);
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }
  for (const t of tableNames) visit(t);
  return sorted;
}

// ──────────────────────────────────────────────────── main ────
// Source MySQL connection parameters (never printed to stdout)
const source = {
  host: required('SOURCE_DB_HOST'),
  port: Number(process.env.SOURCE_DB_PORT || 3306),
  user: required('SOURCE_DB_USER'),
  password: required('SOURCE_DB_PASSWORD'),
  database: required('SOURCE_DB_NAME'),
  ssl: /^(1|true|required)$/i.test(process.env.SOURCE_DB_SSL || ''),
};

// Safety stop — must be explicitly enabled
if (process.env.ALLOW_SUPABASE_SCHEMA_CREATE !== 'true') {
  throw new Error(
    'Safety stop: set ALLOW_SUPABASE_SCHEMA_CREATE=true in server/.env only after confirming the destination ' +
    'is the correct, empty Supabase project. This prevents accidentally overwriting a populated database.',
  );
}

const rawDestinationUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!rawDestinationUrl) {
  throw new Error(
    'SUPABASE_DB_URL is required. Copy the Transaction pooler URL from ' +
    'Supabase Dashboard → Project Settings → Database → Connection string → Transaction pooler.',
  );
}

const destinationUrl = validateDestinationUrl(rawDestinationUrl);
const backupPath = required('SOURCE_BACKUP_FILE');
const backupHash = createHash('sha256');
let hasSchema = false;
let tail = Buffer.alloc(0);
for await (const chunk of createReadStream(path.resolve(serverRoot, backupPath))) {
  backupHash.update(chunk);
  const text = Buffer.concat([tail, chunk]);
  if (text.includes(Buffer.from('CREATE TABLE'))) hasSchema = true;
  tail = text.subarray(-16);
}
if (!hasSchema) {
  throw new Error('SOURCE_BACKUP_FILE must refer to a non-empty MySQL SQL dump. Preserve and independently verify it before import.');
}
const backupSha256 = backupHash.digest('hex');

console.log('Connecting to source MySQL database…');
const mysqlDb = await mysql.createConnection({
  host: source.host,
  port: source.port,
  user: source.user,
  password: source.password,
  database: source.database,
  ssl: source.ssl ? { rejectUnauthorized: true } : undefined,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  timezone: 'Z',
});

console.log('Connecting to destination Supabase PostgreSQL…');
const postgres = new Client({
  ...postgresConnectionOptions(destinationUrl),
});

const report = {
  startedAt: new Date().toISOString(),
  source: source.database,
  tables: {},
  warnings: [],
  backupSha256,
};
let committed = false;
let transactionStarted = false;

try {
  await postgres.connect();
  await mysqlDb.query("SET time_zone = '+00:00'");
  await mysqlDb.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await mysqlDb.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  // ── 1. Safety: verify destination is empty ──────────────────────
  const occupied = await postgres.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  if (occupied.rowCount > 0) {
    const tableList = occupied.rows.map((r) => r.tablename).join(', ');
    throw new Error(
      `Safety stop: destination public schema is not empty — found ${occupied.rowCount} table(s): ${tableList}. ` +
      'The migration script refuses to run against a populated schema. ' +
      'Choose a separate empty destination project; preserve these existing tables. ' +
      'NEVER re-run this script against a populated Supabase schema.',
    );
  }

  // ── 2. Discover source tables ────────────────────────────────────
  const [tables] = await mysqlDb.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [source.database],
  );
  const names = tables.map((row) => row.TABLE_NAME || row.table_name);
  console.log(`Source tables discovered: ${names.length}`);
  report.tableCount = names.length;
  const [engines] = await mysqlDb.query("SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' AND engine <> 'InnoDB'", [source.database]);
  const [triggers] = await mysqlDb.query('SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = ?', [source.database]);
  const [routines] = await mysqlDb.query('SELECT routine_name FROM information_schema.routines WHERE routine_schema = ?', [source.database]);
  const [events] = await mysqlDb.query('SELECT event_name FROM information_schema.events WHERE event_schema = ?', [source.database]);
  const [views] = await mysqlDb.query('SELECT table_name FROM information_schema.views WHERE table_schema = ?', [source.database]);
  const [checks] = await mysqlDb.query('SELECT constraint_name FROM information_schema.check_constraints WHERE constraint_schema = ?', [source.database]);
  const [specialIndexes] = await mysqlDb.query("SELECT index_name FROM information_schema.statistics WHERE table_schema = ? AND (sub_part IS NOT NULL OR expression IS NOT NULL OR index_type <> 'BTREE')", [source.database]);
  report.sourceObjects = { tables: names.length, triggers: triggers.length, routines: routines.length, events: events.length, views: views.length, checks: checks.length, specialIndexes: specialIndexes.length };
  if (engines.length || triggers.length || routines.length || events.length || views.length || checks.length || specialIndexes.length) {
    throw new Error('Source has schema objects requiring explicit conversion (non-InnoDB tables, custom triggers, routines, events, views, checks or special indexes). Review the failure report before importing.');
  }

  // ── 3. Read column metadata for all tables ───────────────────────
  const metadata = new Map();
  for (const table of names) {
    const [columns] = await mysqlDb.query(
      'SELECT * FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
      [source.database, table],
    );
    const [keys] = await mysqlDb.query(
      'SELECT tc.constraint_type, k.constraint_name, k.column_name ' +
      'FROM information_schema.table_constraints tc ' +
      'JOIN information_schema.key_column_usage k ' +
      '  USING (constraint_schema, table_schema, table_name, constraint_name) ' +
      'WHERE tc.table_schema = ? AND tc.table_name = ? ORDER BY k.ordinal_position',
      [source.database, table],
    );
    metadata.set(table, { columns, keys });
    if (columns.some((col) => col.GENERATION_EXPRESSION || /unsigned/i.test(col.COLUMN_TYPE) && col.DATA_TYPE === 'bigint' && /auto_increment/i.test(col.EXTRA || ''))) {
      throw new Error(`Table ${table} has a generated column or unsigned bigint identity requiring an explicit conversion.`);
    }
    for (const column of columns) {
      pgType(column);
      if (/on update/i.test(column.EXTRA || '') && column.COLUMN_NAME !== 'updated_at') throw new Error(`Table ${table} has an automatic update column requiring a dedicated trigger.`);
    }
  }

  // ── 4. Read all foreign keys for topological sort ────────────────
  const [rawForeignKeys] = await mysqlDb.query(
    'SELECT k.table_name, k.constraint_name, k.column_name, ' +
    '       k.referenced_table_name, k.referenced_column_name, ' +
    '       r.delete_rule, r.update_rule ' +
    'FROM information_schema.key_column_usage k ' +
    'JOIN information_schema.referential_constraints r ' +
    '  USING (constraint_schema, constraint_name) ' +
    'WHERE k.table_schema = ? AND k.referenced_table_name IS NOT NULL ' +
    'ORDER BY k.table_name, k.constraint_name, k.ordinal_position',
    [source.database],
  );

  const allForeignKeys = rawForeignKeys.map((k) => ({
    table_name: k.TABLE_NAME || k.table_name,
    constraint_name: k.CONSTRAINT_NAME || k.constraint_name,
    column_name: k.COLUMN_NAME || k.column_name,
    referenced_table_name: k.REFERENCED_TABLE_NAME || k.referenced_table_name,
    referenced_column_name: k.REFERENCED_COLUMN_NAME || k.referenced_column_name,
    delete_rule: k.DELETE_RULE || k.delete_rule || 'NO ACTION',
    update_rule: k.UPDATE_RULE || k.update_rule || 'NO ACTION',
  }));

  // Sort tables so parents come before children
  const sortedNames = topoSort(names, allForeignKeys);

  // ── 5. Begin single transaction: CREATE tables + INSERT data ─────
  console.log('Beginning database transaction…');
  await postgres.query('BEGIN');
  transactionStarted = true;
  await postgres.query("SET LOCAL TIME ZONE 'UTC'");
  await postgres.query("SELECT pg_advisory_xact_lock(314159266)");
  const occupiedAgain = await postgres.query("SELECT 1 FROM pg_tables WHERE schemaname = 'public' LIMIT 1");
  if (occupiedAgain.rowCount) throw new Error('Destination became populated during preflight. Import stopped.');

  // CREATE TABLE statements
  for (const table of sortedNames) {
    const { columns, keys } = metadata.get(table);
    const pk = keys
      .filter((k) => k.constraint_type === 'PRIMARY KEY' || k.CONSTRAINT_TYPE === 'PRIMARY KEY')
      .map((k) => qi(k.column_name || k.COLUMN_NAME));

    const definitions = columns.map((col) => {
      const colName = col.COLUMN_NAME || col.column_name;
      const isAutoInc = /auto_increment/i.test(col.EXTRA || '');
      const identity = isAutoInc ? ' GENERATED BY DEFAULT AS IDENTITY' : '';
      const enumValues = col.DATA_TYPE === 'enum' ? col.COLUMN_TYPE.slice(5, -1) : '';
      const enumCheck = enumValues ? ` CHECK (${qi(colName)} IN (${enumValues}))` : '';
      const boolCheck = col.COLUMN_TYPE === 'tinyint(1)' ? ` CHECK (${qi(colName)} IN (0, 1))` : '';
      const unsignedCheck =
        /unsigned/i.test(col.COLUMN_TYPE) && col.COLUMN_TYPE !== 'tinyint(1)'
          ? ` CHECK (${qi(colName)} >= 0)`
          : '';
      const nullable = col.IS_NULLABLE === 'NO' ? ' NOT NULL' : '';
      const defaultVal = isAutoInc ? '' : pgDefault(col);
      return `${qi(colName)} ${pgType(col)}${identity}${defaultVal}${nullable}${enumCheck}${boolCheck}${unsignedCheck}`;
    });

    if (pk.length) definitions.push(`PRIMARY KEY (${pk.join(', ')})`);

    await postgres.query(`CREATE TABLE public.${qi(table)} (${definitions.join(', ')})`);
    console.log(`  Created table: ${table}`);
  }

  // INSERT data in topological order (parents first)
  for (const table of sortedNames) {
    const { columns } = metadata.get(table);
    const colNames = columns.map((c) => c.COLUMN_NAME || c.column_name);

    const [rows] = await mysqlDb.query(`SELECT * FROM ${mi(table)}`);
    let inserted = 0;

    for (let offset = 0; offset < rows.length; offset += 200) {
      const batch = rows.slice(offset, offset + 200);
      if (!batch.length) continue;

      const values = [];
      const tuples = batch.map((row) =>
        `(${colNames.map((name) => {
          let value = row[name];
          // Serialize objects (JSON columns) but not Buffers or Dates
          if (
            value !== null &&
            typeof value === 'object' &&
            !Buffer.isBuffer(value) &&
            !(value instanceof Date)
          ) {
            value = JSON.stringify(value);
          }
          values.push(value);
          return `$${values.length}`;
        }).join(', ')})`,
      );

      await postgres.query(
        `INSERT INTO public.${qi(table)} (${colNames.map(qi).join(', ')}) VALUES ${tuples.join(', ')}`,
        values,
      );
      inserted += batch.length;
    }

    const counted = await postgres.query(`SELECT COUNT(*)::text AS total FROM public.${qi(table)}`);
    report.tables[table] = { source: rows.length, destination: Number(counted.rows[0].total) };
    if (report.tables[table].destination !== rows.length) throw new Error(`Row count mismatch before commit: ${table}`);
    if (rows.length > 0) console.log(`  Inserted ${inserted} rows → ${table}`);
  }

  // ── 6. Add UNIQUE constraints ────────────────────────────────────
  for (const table of sortedNames) {
    const { keys } = metadata.get(table);
    const uniqueNames = [
      ...new Set(
        keys
          .filter((k) => (k.CONSTRAINT_TYPE || k.constraint_type) === 'UNIQUE')
          .map((k) => k.CONSTRAINT_NAME || k.constraint_name),
      ),
    ];
    for (const constraint of uniqueNames) {
      const cols = keys
        .filter((k) => (k.CONSTRAINT_NAME || k.constraint_name) === constraint)
        .map((k) => qi(k.COLUMN_NAME || k.column_name));
      await postgres.query(
        `ALTER TABLE public.${qi(table)} ADD CONSTRAINT ${qi(constraint)} UNIQUE (${cols.join(', ')})`,
      );
    }
  }

  // ── 7. Add non-unique indexes ────────────────────────────────────
  const [rawIndexes] = await mysqlDb.query(
    'SELECT table_name, index_name, non_unique, ' +
    '       GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns_csv ' +
    'FROM information_schema.statistics ' +
    "WHERE table_schema = ? AND index_name <> 'PRIMARY' " +
    'GROUP BY table_name, index_name, non_unique',
    [source.database],
  );
  const indexes = rawIndexes.map((idx) => ({
    table_name: idx.TABLE_NAME || idx.table_name,
    index_name: idx.INDEX_NAME || idx.index_name,
    non_unique: idx.NON_UNIQUE !== undefined ? idx.NON_UNIQUE : idx.non_unique,
    columns_csv: idx.columns_csv || idx.COLUMNS_CSV,
  }));
  for (const index of indexes) {
    if (!Number(index.non_unique)) continue; // skip unique indexes (already added as constraints)
    const pgIndexName = `${index.table_name}_${index.index_name}`.slice(0, 63);
    const cols = (index.columns_csv || '').split(',').filter(Boolean).map(qi).join(', ');
    if (!cols) continue;
    await postgres.query(
      `CREATE INDEX ${qi(pgIndexName)} ON public.${qi(index.table_name)} (${cols})`,
    );
  }

  // ── 8. Add foreign keys ──────────────────────────────────────────
  const fkNames = [...new Set(allForeignKeys.map((k) => `${k.table_name}\0${k.constraint_name}`))];
  for (const compound of fkNames) {
    const [table, constraint] = compound.split('\0');
    const parts = allForeignKeys.filter(
      (k) => k.table_name === table && k.constraint_name === constraint,
    );
    await postgres.query(
      `ALTER TABLE public.${qi(table)} ADD CONSTRAINT ${qi(constraint)} ` +
      `FOREIGN KEY (${parts.map((x) => qi(x.column_name)).join(', ')}) ` +
      `REFERENCES public.${qi(parts[0].referenced_table_name)} (${parts.map((x) => qi(x.referenced_column_name)).join(', ')}) ` +
      `ON DELETE ${parts[0].delete_rule} ON UPDATE ${parts[0].update_rule}`,
    );
  }

  // ── 9. Reset identity sequences ──────────────────────────────────
  for (const table of sortedNames) {
    const identityCol = metadata
      .get(table)
      .columns.find((c) => /auto_increment/i.test(c.EXTRA || ''));
    if (!identityCol) continue;
    const colName = identityCol.COLUMN_NAME || identityCol.column_name;
    await postgres.query(
      `SELECT setval(
         pg_get_serial_sequence($1, $2),
         GREATEST(COALESCE((SELECT MAX(${qi(colName)}) FROM public.${qi(table)}), 1), 1),
         (SELECT COUNT(*) > 0 FROM public.${qi(table)})
       )`, [`public.${qi(table)}`, colName],
    );
  }

  // ── 10. Enable RLS on every table ────────────────────────────────
  for (const table of sortedNames) {
    await postgres.query(`ALTER TABLE public.${qi(table)} ENABLE ROW LEVEL SECURITY`);
    await postgres.query(`REVOKE ALL ON TABLE public.${qi(table)} FROM PUBLIC`);
    for (const role of ['anon', 'authenticated']) {
      const exists = await postgres.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
      if (exists.rowCount) await postgres.query(`REVOKE ALL ON TABLE public.${qi(table)} FROM ${qi(role)}`);
    }
  }

  // ── 11. Create shared updated_at trigger function ─────────────────
  await postgres.query(`
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END $$
  `);

  for (const table of sortedNames) {
    const hasUpdatedAt = metadata
      .get(table)
      .columns.some((c) => (c.COLUMN_NAME || c.column_name) === 'updated_at' && /on update CURRENT_TIMESTAMP/i.test(c.EXTRA || ''));
    if (hasUpdatedAt) {
      const triggerName = `${table}_set_updated_at`.slice(0, 63);
      await postgres.query(
        `CREATE TRIGGER ${qi(triggerName)} ` +
        `BEFORE UPDATE ON public.${qi(table)} ` +
        'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      );
    }
  }

  // ── 12. Commit ───────────────────────────────────────────────────
  await postgres.query('COMMIT');
  committed = true;
  console.log('Transaction committed successfully.');

  // ── 13. Post-commit count verification ───────────────────────────
  console.log('\nVerifying row counts…');
  let allOk = true;
  for (const table of sortedNames) {
    const result = await postgres.query(
      `SELECT COUNT(*)::bigint AS total FROM public.${qi(table)}`,
    );
    const destination = Number(result.rows[0].total);
    const src = report.tables[table].source;
    report.tables[table].destination = destination;
    const match = src === destination;
    if (!match) {
      allOk = false;
      report.warnings.push(`Count mismatch for ${table}: source=${src}, destination=${destination}`);
      console.error(`  MISMATCH  ${table}  source=${src}  destination=${destination}`);
    } else {
      console.log(`  OK        ${table}  ${src} rows`);
    }
  }

  if (!allOk) {
    throw new Error('Row count verification failed. See warnings in the report file.');
  }

  // ── 14. Write report ─────────────────────────────────────────────
  report.completedAt = new Date().toISOString();
  report.status = 'counts_verified';
  report.warnings.push('Row counts alone do not verify data content, collation semantics, authentication or business workflows. Run the independent verifier and cutover checks.');
  report.tableCount = sortedNames.length;

  const reportDir = path.join(serverRoot, 'migration-reports');
  await fs.mkdir(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `supabase-migration-${Date.now()}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

  console.log(`\n✓ Migration verified: ${sortedNames.length} tables migrated.`);
  console.log(`  Report saved to: ${reportFile}`);
  console.log('\nNext steps:');
  console.log('  1. Run npm run verify:supabase to confirm row counts');
  console.log('  2. Verify the existing administrator account and critical workflows');
  console.log('  3. Remove ALLOW_SUPABASE_SCHEMA_CREATE=true from server/.env');
  console.log('  4. Remove SOURCE_DB_* variables from server/.env');
} catch (error) {
  try {
    if (committed) throw new Error('already committed');
    if (!transactionStarted) throw new Error('not started');
    await postgres.query('ROLLBACK');
    console.log('Transaction rolled back. No changes were made to the destination database.');
  } catch {
    if (committed) console.error('The import was committed; verification failed afterwards. Preserve the destination and investigate. Do not rerun the importer.');
  }
  report.status = 'failed';
  report.committed = committed;
  report.error = { code: error.code || 'MIGRATION_FAILED', ...(!error.code ? { message: error.message } : {}) };
  const failureDir = path.join(serverRoot, 'migration-reports');
  await fs.mkdir(failureDir, { recursive: true });
  const failureFile = path.join(failureDir, `supabase-migration-failed-${Date.now()}.json`);
  await fs.writeFile(failureFile, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.error('Failure report:', failureFile);
  console.error('\nMigration failed. Error code:', error.code || 'MIGRATION_FAILED');
  process.exitCode = 1;
} finally {
  await mysqlDb.end();
  await postgres.end();
}
