import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { X509Certificate } from 'node:crypto';
import { checkServerIdentity } from 'node:tls';

const serverRoot = fileURLToPath(new URL('../../', import.meta.url));

export function loadDatabaseCa(caFile) {
  if (!caFile) return null;
  const resolved = path.resolve(serverRoot, caFile);
  let bytes;
  try { bytes = fs.readFileSync(resolved); }
  catch { throw new Error('DB_SSL_CA_FILE cannot be read. Supply the actual certificate path.'); }
  if (bytes.length > 1024 * 1024) throw new Error('DB_SSL_CA_FILE is unexpectedly large. Supply a CA certificate or certificate bundle.');
  const text = bytes.toString('utf8');
  if (/PRIVATE KEY/.test(text)) throw new Error('DB_SSL_CA_FILE must contain certificates, not a private key.');
  let certificates;
  try {
    const blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    certificates = (blocks || [bytes]).map((block) => new X509Certificate(block));
  } catch { throw new Error('DB_SSL_CA_FILE does not contain a valid PEM or DER X.509 certificate.'); }
  for (const certificate of certificates) {
    if (!certificate.ca) throw new Error('DB_SSL_CA_FILE contains a leaf certificate. Supply the database CA certificate.');
    if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) < Date.now()) throw new Error('DB_SSL_CA_FILE contains a certificate outside its validity period.');
  }
  return { path: resolved, pem: certificates.map((certificate) => certificate.toString()).join('\n'), certificates };
}

export function postgresTls(ssl, caFile = process.env.DB_SSL_CA_FILE) {
  if (!ssl) return false;
  const loaded = loadDatabaseCa(caFile);
  return { rejectUnauthorized: true, checkServerIdentity, minVersion: 'TLSv1.2', ...(loaded ? { ca: loaded.pem } : {}) };
}

/** Keep TLS policy explicit: pg URL SSL parameters must not replace it. */
export function postgresConnectionOptions(url, { ssl = true, caFile = process.env.DB_SSL_CA_FILE } = {}) {
  let connectionString;
  try {
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
    for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) parsed.searchParams.delete(key);
    connectionString = parsed.toString();
  } catch {
    throw new Error('A valid PostgreSQL connection URL is required.');
  }
  return {
    connectionString,
    ssl: postgresTls(ssl, caFile),
    connectionTimeoutMillis: 10000,
  };
}
