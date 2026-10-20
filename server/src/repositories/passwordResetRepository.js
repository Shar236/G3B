import { query, queryOne } from '../config/db.js';

/**
 * Single-use, time-limited password reset tokens.
 *
 * Only the SHA-256 hash of the token is stored, so a leaked database row cannot
 * be replayed. Tokens are invalidated the moment they are used.
 */
export const passwordResetRepository = {
  async create({ userId, tokenHash, expiresAt, ipAddress = null }) {
    const result = await query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?)',
      [userId, tokenHash, expiresAt, ipAddress],
    );
    return Number(result.insertId);
  },

  /** Invalidate any outstanding tokens for a user (e.g. before issuing a new one). */
  async invalidateForUser(userId) {
    await query('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [userId]);
  },

  async findActiveByHash(tokenHash) {
    return queryOne(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1',
      [tokenHash],
    );
  },

  async markUsed(id) {
    await query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);
  },
};

export default passwordResetRepository;
