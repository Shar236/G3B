import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
import { postgresConnectionOptions } from '../src/config/postgres.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
const qi = (name) => `"${String(name).replaceAll('"', '""')}"`;
const mi = (name) => `\`${String(name).replaceAll('`', '``')}\``;
const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) throw new Error('SUPABASE_DB_URL or DATABASE_URL is required.');
const destination = new pg.Client(postgresConnectionOptions(url));
let source;
const report = { startedAt: new Date().toISOString(), readOnly: true, sourceTableCount: null, destinationTableCount: null, tables: {}, issues: [], limitations: [] };
try {
  await destination.connect();
  await destination.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables = await destination.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  report.destinationTableCount = tables.rowCount;
  const destinationNames = new Set(tables.rows.map((row) => row.tablename));
  for (const { tablename, rowsecurity } of tables.rows) {
    const count = await destination.query(`SELECT COUNT(*)::text AS total FROM public.${qi(tablename)}`);
    report.tables[tablename] = { destination: count.rows[0].total, rls: rowsecurity };
    if (!rowsecurity) report.issues.push(`RLS disabled: ${tablename}`);
  }
  // Runtime PostgreSQL DB_* settings must never be mistaken for a MySQL source.
  if (['SOURCE_DB_HOST', 'SOURCE_DB_NAME', 'SOURCE_DB_USER'].every((key) => process.env[key])) {
    source = await mysql.createConnection({ host: process.env.SOURCE_DB_HOST, port: Number(process.env.SOURCE_DB_PORT || 3306), database: process.env.SOURCE_DB_NAME, user: process.env.SOURCE_DB_USER, password: process.env.SOURCE_DB_PASSWORD || '', ssl: /^(1|true|required)$/i.test(process.env.SOURCE_DB_SSL || '') ? { rejectUnauthorized: true } : undefined, supportBigNumbers: true, bigNumberStrings: true });
    await source.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const [names] = await source.query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'");
    report.sourceTableCount = names.length;
    for (const { name } of names) {
      const [count] = await source.query(`SELECT COUNT(*) AS total FROM ${mi(name)}`);
      const entry = report.tables[name] ||= { destination: null };
      entry.source = String(count[0].total);
      entry.countMatch = entry.source === entry.destination;
      if (!entry.countMatch) report.issues.push(`Row count mismatch: ${name}`);
      destinationNames.delete(name);
    }
    report.destinationOnlyTables = [...destinationNames];
  } else report.limitations.push('SOURCE_DB_* is not configured. Current source table count and source/destination equivalence are unverified.');

  report.constraints = (await destination.query("SELECT conrelid::regclass::text AS table_name, conname, contype, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows;
  report.foreignKeyCount = report.constraints.filter((row) => row.contype === 'f').length;
  report.indexes = (await destination.query("SELECT t.relname AS table_name, i.relname AS index_name, x.indisunique AS unique_index, x.indisprimary AS primary_index, x.indisvalid AS valid, pg_get_indexdef(i.oid) AS definition FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname, i.relname")).rows;
  for (const index of report.indexes) if (!index.valid) report.issues.push(`Invalid index: ${index.table_name}.${index.index_name}`);
  report.triggers = (await destination.query("SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing, action_statement FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name")).rows;
  report.runtimeRole = (await destination.query('SELECT rolsuper AS superuser, rolbypassrls AS bypass_rls FROM pg_roles WHERE rolname=current_user')).rows[0];
  for (const row of report.constraints) if (!row.convalidated) report.issues.push(`Unvalidated constraint: ${row.table_name}.${row.conname}`);
  const identities = await destination.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND (is_identity='YES' OR column_default LIKE 'nextval(%')");
  report.sequences = [];
  for (const { table_name: table, column_name: column } of identities.rows) {
    const seq = await destination.query('SELECT pg_get_serial_sequence($1, $2) AS name', [`public.${qi(table)}`, column]);
    if (!seq.rows[0].name) continue;
    const value = await destination.query(`SELECT MAX(${qi(column)})::text AS max FROM public.${qi(table)}`);
    const sequenceName = seq.rows[0].name.split('.').map((part) => qi(part.replace(/^"|"$/g, ''))).join('.');
    const state = await destination.query(`SELECT last_value::text, is_called FROM ${sequenceName}`);
    const max = value.rows[0].max;
    const parameters = await destination.query('SELECT seqincrement::text AS increment FROM pg_sequence WHERE seqrelid=$1::regclass', [seq.rows[0].name]);
    const increment = BigInt(parameters.rows[0].increment);
    const next = BigInt(state.rows[0].last_value) + (state.rows[0].is_called ? increment : 0n);
    const safe = increment > 0n && (max === null || next > BigInt(max));
    report.sequences.push({ table, column, max, next: String(next), increment: String(increment), safe });
    if (!safe) report.issues.push(`Identity sequence behind existing IDs: ${table}.${column}`);
  }
  report.policies = (await destination.query("SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public'")).rows;
  report.browserGrants = (await destination.query("SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC')")).rows;
  if (report.policies.length) report.limitations.push('Existing RLS policies need manual access review; this verifier does not change them.');
  report.limitations.push('Counts and constraints do not prove field-level equality, timestamp conversion, authentication or business workflows.');
  report.status = report.issues.length ? 'failed' : source ? 'structural_and_counts_verified' : 'destination_checked_source_unverified';
  console.log(`Destination tables: ${report.destinationTableCount}; source tables: ${report.sourceTableCount ?? 'unverified'}; foreign keys: ${report.foreignKeyCount}; issues: ${report.issues.length}`);
  for (const issue of report.issues) console.log(`ISSUE ${issue}`);
  for (const limitation of report.limitations) console.log(`LIMITATION ${limitation}`);
  if (report.issues.length || !source) process.exitCode = 1;
} catch (error) {
  report.status = 'failed';
  report.errorCode = error.code || error.name;
  console.error(`Verification failed (${report.errorCode}). Check private connection settings and certificate configuration.`);
  process.exitCode = 1;
} finally {
  if (source) await source.end().catch(() => {});
  await destination.query('ROLLBACK').catch(() => {});
  await destination.end().catch(() => {});
  report.completedAt = new Date().toISOString();
  const directory = path.join(root, 'migration-reports');
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, `supabase-verification-${Date.now()}.json`);
  await fs.writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(`Report: ${output}`);
}
