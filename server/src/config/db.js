import pg from 'pg';
import env from './env.js';
import { postgresConnectionOptions, postgresTls } from './postgres.js';

const { Pool } = pg;

const databaseOptions = env.db.url ? postgresConnectionOptions(env.db.url, { ssl: env.db.ssl }) : {
    host: env.db.host, port: env.db.port, user: env.db.user,
    password: env.db.password, database: env.db.name,
    ssl: postgresTls(env.db.ssl),
  };

export const pool = new Pool({
  ...databaseOptions,
  max: env.db.connectionLimit,
  connectionTimeoutMillis: 5000,
});

export function postgresSql(sql) {
  let index = 0;
  let quoted = null;
  let output = '';
  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const char = sql[cursor];
    if (quoted) {
      output += char;
      if (char === quoted) {
        if (sql[cursor + 1] === quoted) output += sql[++cursor];
        else quoted = null;
      }
    } else if (char === "'" || char === '"') {
      quoted = char;
      output += char;
    } else if (char === '?') output += `$${++index}`;
    else output += char;
  }
  return output;
}

function normalize(result) {
  if (result.command === 'SELECT') return result.rows;
  return { affectedRows: result.rowCount, insertId: result.rows[0]?.id ?? null, rows: result.rows };
}

function addReturningId(sql) {
  const value = sql.trim().replace(/;$/, '');
  return /^INSERT\s+INTO\s+/i.test(value) && !/\bRETURNING\b/i.test(value) ? `${value} RETURNING *` : value;
}

async function execute(client, sql, params = []) {
  return normalize(await client.query(postgresSql(addReturningId(sql)), params));
}

export async function query(sql, params = []) { return execute(pool, sql, params); }
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  const connection = {
    execute: async (sql, params = []) => {
      const value = await execute(client, sql, params);
      return [value, []];
    },
    query: async (sql, params = []) => {
      const value = await execute(client, sql, params);
      return [value, []];
    },
  };
  try {
    await client.query('BEGIN');
    const value = await callback(connection);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

/** Compatibility connection for maintenance scripts that expect mysql2's tuple shape. */
export async function getConnection() {
  const client = await pool.connect();
  return {
    execute: async (sql, params = []) => [await execute(client, sql, params), []],
    query: async (sql, params = []) => [await execute(client, sql, params), []],
    end: async () => client.release(),
  };
}

export async function pingDatabase() {
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}
export async function closePool() { await pool.end(); }
export default pool;
