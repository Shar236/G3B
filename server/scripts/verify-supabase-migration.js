import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const rawDestinationUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!rawDestinationUrl) throw new Error('SUPABASE_DB_URL is required. Copy the Transaction pooler URL from Supabase Dashboard → Connect.');
let destinationUrl;
try {
  const parsed = new URL(rawDestinationUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('protocol');
  if (/pooler[_-]?host/i.test(parsed.hostname)) throw new Error('SUPABASE_DB_URL still contains the POOLER_HOST placeholder. Copy the complete Transaction pooler URL from Supabase Dashboard → Connect.');
  if (!parsed.hostname || !parsed.username || !parsed.password) throw new Error('incomplete');
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('ssl');
  destinationUrl = parsed.toString();
} catch (error) {
  if (error.message.includes('POOLER_HOST')) throw error;
  throw new Error('SUPABASE_DB_URL must be a complete PostgreSQL URL containing the real pooler host, username, and URL-encoded password.');
}
const source = await mysql.createConnection({ host: process.env.SOURCE_DB_HOST || process.env.DB_HOST, port: Number(process.env.SOURCE_DB_PORT || process.env.DB_PORT || 3306), user: process.env.SOURCE_DB_USER || process.env.DB_USER, password: process.env.SOURCE_DB_PASSWORD || process.env.DB_PASSWORD, database: process.env.SOURCE_DB_NAME || process.env.DB_NAME, ssl: /^(1|true|required)$/i.test(process.env.SOURCE_DB_SSL || process.env.DB_SSL || '') ? { rejectUnauthorized: false } : undefined });
const destination = new pg.Client({ connectionString: destinationUrl, ssl: { rejectUnauthorized: false } });
await destination.connect();
let failed = false;
try {
  const [tables] = await source.query("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name");
  for (const entry of tables) {
    const table = entry.TABLE_NAME || entry.table_name;
    const [mysqlCount] = await source.query(`SELECT COUNT(*) total FROM \`${table.replaceAll('`', '``')}\``);
    const pgCount = await destination.query(`SELECT COUNT(*)::bigint total FROM "${table.replaceAll('"', '""')}"`);
    const left = Number(mysqlCount[0].total), right = Number(pgCount.rows[0].total);
    console.log(`${left === right ? 'OK' : 'MISMATCH'}\t${table}\t${left}\t${right}`);
    if (left !== right) failed = true;
  }
} finally { await source.end(); await destination.end(); }
if (failed) process.exitCode = 1;
