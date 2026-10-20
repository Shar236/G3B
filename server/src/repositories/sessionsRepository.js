import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';

export const hashSessionToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export const sessionsRepository = {
  async create(userId) {
    const token = newToken();
    const familyId = newToken();
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await query('INSERT INTO auth_sessions (user_id,family_id,token_hash,expires_at) VALUES (?,?,?,?)', [userId, familyId, hashSessionToken(token), expiresAt]);
    return { token, expiresAt, familyId };
  },
  async rotate(rawToken) {
    return withTransaction(async (connection) => {
      const [rows] = await connection.execute('SELECT * FROM auth_sessions WHERE token_hash = ? FOR UPDATE', [hashSessionToken(rawToken)]);
      const session = rows[0];
      if (!session) return null;
      if (session.revoked_at) {
        // Reuse of a rotated token invalidates its entire family.
        await connection.execute('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at,NOW()) WHERE family_id = ?', [session.family_id]);
        return null;
      }
      if (new Date(session.expires_at).getTime() <= Date.now()) return null;
      const [users] = await connection.execute('SELECT * FROM users WHERE id = ? AND status = ? LIMIT 1', [session.user_id, 'active']);
      if (!users[0]) return null;
      const token = newToken();
      await connection.execute('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ?', [session.id]);
      await connection.execute('INSERT INTO auth_sessions (user_id,family_id,token_hash,expires_at) VALUES (?,?,?,?)', [session.user_id, session.family_id, hashSessionToken(token), session.expires_at]);
      return { user: users[0], token, expiresAt: session.expires_at, familyId: session.family_id };
    });
  },
  async revoke(rawToken) {
    await query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at,NOW()) WHERE family_id IN (SELECT family_id FROM (SELECT family_id FROM auth_sessions WHERE token_hash = ?) AS matching)', [hashSessionToken(rawToken)]);
  },
  async revokeForUser(userId) {
    await query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at,NOW()) WHERE user_id = ?', [userId]);
  },
};
