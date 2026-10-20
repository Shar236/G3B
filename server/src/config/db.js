import mysql from 'mysql2/promise';
import env from './env.js';

/** Shared connection pool used by every repository. */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: false,
  namedPlaceholders: false,
});

/**
 * Run a query and return only the rows.
 * @param {string} sql
 * @param {Array<unknown>} params
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Return the first row or null. */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a callback inside a transaction, committing on success and
 * rolling back when an error is thrown.
 * @template T
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Lightweight connectivity probe used by the health endpoint. */
export async function pingDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;
