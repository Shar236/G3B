import net from 'node:net';
import tls from 'node:tls';
import env from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { loadDatabaseCa } from '../src/config/postgres.js';

// Certificate metadata and error codes only; never print the connection URL,
// user, password, SQL rows or private environment values.
const summary = (certificate) => ({ subject: certificate.subject, issuer: certificate.issuer, fingerprint256: certificate.fingerprint256, validFrom: certificate.validFrom, validTo: certificate.validTo, ca: certificate.ca });
const configured = loadDatabaseCa(process.env.DB_SSL_CA_FILE);
const options = pool.options;
const parsed = env.db.url ? new URL(env.db.url) : null;
const host = parsed?.hostname || env.db.host;
const port = Number(parsed?.port || env.db.port || 5432);
const report = {
  tlsEnabled: Boolean(options.ssl),
  rejectUnauthorized: options.ssl?.rejectUnauthorized === true,
  hostnameVerification: options.ssl?.checkServerIdentity === tls.checkServerIdentity,
  configuredCa: configured ? { path: configured.path, certificates: configured.certificates.map(summary) } : null,
  loadedByPool: Boolean(options.ssl?.ca),
  loadedCertificateMatchesFile: configured ? options.ssl.ca === configured.pem : null,
};

// A PostgreSQL SSLRequest contains no authentication data. Even this diagnostic
// keeps chain/hostname verification enabled; a rejected peer is never trusted.
report.handshake = await new Promise((resolve) => {
  const socket = net.connect({ host, port });
  let secure;
  const finish = (result) => { secure?.destroy(); socket.destroy(); resolve(result); };
  socket.setTimeout(10000, () => finish({ success: false, errorCode: 'TIMEOUT' }));
  socket.once('error', (error) => finish({ success: false, errorCode: error.code || error.name }));
  socket.once('connect', () => { const request = Buffer.alloc(8); request.writeInt32BE(8); request.writeInt32BE(80877103, 4); socket.write(request); });
  socket.once('data', (response) => {
    if (response[0] !== 83) return finish({ success: false, errorCode: 'SERVER_REFUSED_TLS' });
    secure = tls.connect({ socket, servername: host, ...options.ssl, rejectUnauthorized: true, checkServerIdentity: tls.checkServerIdentity });
    const peer = () => {
      try { const certificate = secure.getPeerX509Certificate(); return certificate ? summary(certificate) : null; } catch { return null; }
    };
    secure.once('secureConnect', () => finish({ success: secure.authorized, peer: peer(), protocol: secure.getProtocol() }));
    secure.once('error', (error) => finish({ success: false, errorCode: error.code || error.name, peer: peer() }));
  });
});
try {
  const client = await pool.connect();
  try {
    report.loadedByPgClient = Boolean(client.connectionParameters.ssl?.ca);
    report.clientCertificateMatchesFile = configured ? client.connectionParameters.ssl.ca === configured.pem : null;
    await client.query('BEGIN READ ONLY');
    const result = await client.query('SELECT 1 AS ok');
    report.databaseConnected = result.rows[0].ok === 1;
    await client.query('ROLLBACK');
  } finally { client.release(); }
} catch (error) { report.databaseConnected = false; report.databaseErrorCode = error.code || error.name; }
finally { await pool.end(); }
console.log(JSON.stringify(report, null, 2));
if (!report.databaseConnected) process.exitCode = 1;
