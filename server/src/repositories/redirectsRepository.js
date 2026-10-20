import { query, queryOne } from '../config/db.js';
import { mapRow } from './catalogRepository.js';

/**
 * Redirect repository.
 *
 * Redirects are applied by the server (see `middleware/redirects.js`) so a
 * crawler or a visitor hitting an old URL is sent a real 301/302 - never a
 * client-side React navigation.
 */

const REDIRECT_COLUMNS = {
  sourcePath: 'source_path',
  destinationPath: 'destination_path',
  statusCode: 'status_code',
  isActive: 'is_active',
  note: 'note',
};

function pickColumns(payload) {
  const values = {};
  for (const [key, value] of Object.entries(payload)) {
    const column = REDIRECT_COLUMNS[key];
    if (column && value !== undefined) {
      values[column] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }
  }
  return values;
}

export const redirectsRepository = {
  async list({ search, activeOnly = false } = {}) {
    const where = [];
    const params = [];
    if (activeOnly) where.push('is_active = 1');
    if (search) {
      where.push('(source_path LIKE ? OR destination_path LIKE ? OR note LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM redirects ${clause} ORDER BY created_at DESC, id DESC`,
      params,
    );
    return rows.map(mapRow);
  },

  /** Lightweight map used by the request-time middleware. */
  async listActive() {
    const rows = await query(
      'SELECT id, source_path, destination_path, status_code FROM redirects WHERE is_active = 1',
    );
    return rows.map(mapRow);
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM redirects WHERE id = ? LIMIT 1', [id]);
    return row ? mapRow(row) : null;
  },

  async findBySourcePath(sourcePath, excludeId = null) {
    const row = excludeId
      ? await queryOne('SELECT * FROM redirects WHERE source_path = ? AND id <> ? LIMIT 1', [sourcePath, excludeId])
      : await queryOne('SELECT * FROM redirects WHERE source_path = ? LIMIT 1', [sourcePath]);
    return row ? mapRow(row) : null;
  },

  async create(payload) {
    const values = pickColumns(payload);
    const keys = Object.keys(values);
    const result = await query(
      `INSERT INTO redirects (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      Object.values(values),
    );
    return this.findById(result.insertId);
  },

  async update(id, payload) {
    const values = pickColumns(payload);
    const keys = Object.keys(values);
    if (keys.length === 0) return this.findById(id);
    await query(
      `UPDATE redirects SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(values), id],
    );
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM redirects WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /** Fire-and-forget hit counter shown in the admin table. */
  async recordHit(id) {
    await query('UPDATE redirects SET hits = hits + 1, last_hit_at = NOW() WHERE id = ?', [id]);
  },
};

export default redirectsRepository;
