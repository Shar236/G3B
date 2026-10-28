import { afterEach, describe, expect, it, vi } from 'vitest';
import { postgresConnectionOptions } from '../src/config/postgres.js';

describe('PostgreSQL TLS configuration', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('accepts a dashboard CA without reading a machine-specific certificate path', () => {
    vi.stubEnv('DB_SSL_CA', 'dashboard-ca-line-1\\ndashboard-ca-line-2');
    const result = postgresConnectionOptions('postgresql://localhost/db', { caFile: 'D:/missing-certificate.crt' });
    expect(result.ssl.ca).toBe('dashboard-ca-line-1\ndashboard-ca-line-2');
    expect(result.ssl.rejectUnauthorized).toBe(true);
  });
  it('prevents URL parameters from disabling certificate validation', () => {
    const result = postgresConnectionOptions('postgresql://user:password@localhost/db?sslmode=no-verify&sslrootcert=untrusted&application_name=g3b');
    expect(result.ssl.rejectUnauthorized).toBe(true);
    expect(result.connectionString).not.toMatch(/sslmode|sslrootcert/);
    expect(result.connectionString).toContain('application_name=g3b');
  });
  it('supports explicit local non-TLS connections and rejects wrong protocols', () => {
    expect(postgresConnectionOptions('postgresql://localhost/db', { ssl: false }).ssl).toBe(false);
    expect(() => postgresConnectionOptions('mysql://user:secret@localhost/db')).toThrow('A valid PostgreSQL connection URL is required.');
  });
});
