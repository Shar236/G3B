import { query, queryOne } from '../config/db.js';

/**
 * Third-party integration state.
 *
 * Only non-secret configuration (property ids, default URLs) is stored here.
 * API keys, service-account JSON and OAuth tokens live in backend environment
 * variables and are never read back into an API response.
 */

function parseJsonSafe(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const mapIntegration = (row) => ({
  provider: row.provider,
  isEnabled: Boolean(row.is_enabled),
  config: parseJsonSafe(row.config) ?? {},
  status: row.status,
  lastSyncedAt: row.last_synced_at,
  lastError: row.last_error,
  updatedAt: row.updated_at,
});

export const integrationsRepository = {
  async list() {
    const rows = await query('SELECT * FROM integration_settings ORDER BY provider ASC');
    return rows.map((row) => mapIntegration(row));
  },

  async findByProvider(provider) {
    const row = await queryOne('SELECT * FROM integration_settings WHERE provider = ? LIMIT 1', [provider]);
    return row ? mapIntegration(row) : null;
  },

  async upsert(provider, { isEnabled, config, status, lastError = null } = {}) {
    await query(
      `INSERT INTO integration_settings (provider, is_enabled, config, status, last_error)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_enabled = VALUES(is_enabled),
         config = VALUES(config),
         status = VALUES(status),
         last_error = VALUES(last_error)`,
      [
        provider,
        isEnabled ? 1 : 0,
        config === undefined ? null : JSON.stringify(config),
        status ?? 'disconnected',
        lastError,
      ],
    );
    return this.findByProvider(provider);
  },

  async setStatus(provider, status, lastError = null) {
    await query('UPDATE integration_settings SET status = ?, last_error = ?, last_synced_at = NOW() WHERE provider = ?', [
      status,
      lastError,
      provider,
    ]);
    return this.findByProvider(provider);
  },
};

export default integrationsRepository;
