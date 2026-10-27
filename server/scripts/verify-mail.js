import { verifyMailConnection } from '../src/services/mailer.js';

try {
  const result = await verifyMailConnection();
  console.log(JSON.stringify({ ...result, messageSent: false }));
  if (!result.verified) process.exitCode = 2;
} catch (error) {
  // SMTP responses and connection settings may include account information.
  console.error(JSON.stringify({ verified: false, messageSent: false, errorCode: error.code || error.name }));
  process.exitCode = 1;
}
