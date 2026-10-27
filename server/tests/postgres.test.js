import { describe, expect, it } from 'vitest';
import { postgresConnectionOptions } from '../src/config/postgres.js';

describe('PostgreSQL TLS configuration', () => {
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
