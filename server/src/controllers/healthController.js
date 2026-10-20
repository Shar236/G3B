import { pingDatabase } from '../config/db.js';
import { isMailEnabled } from '../services/mailer.js';
import env from '../config/env.js';

/** GET /api/health - liveness + dependency probe. */
export async function getHealth(_req, res) {
  let database = 'up';
  try {
    await pingDatabase();
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    service: 'g3b-education-api',
    environment: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    checks: {
      database,
      email: isMailEnabled() ? 'configured' : 'disabled',
    },
    timestamp: new Date().toISOString(),
  });
}

export default { getHealth };
