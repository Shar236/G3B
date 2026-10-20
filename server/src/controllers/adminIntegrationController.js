import { listIntegrations, updateIntegration, checkIntegration, PROVIDER_KEYS } from '../services/integrationService.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';

const assertProvider = (provider) => {
  if (!PROVIDER_KEYS.includes(provider)) {
    throw ApiError.notFound(`Unknown integration "${provider}".`);
  }
};

/** GET /api/admin/integrations */
export async function listIntegrationSettings(_req, res) {
  res.json({ success: true, data: await listIntegrations() });
}

/** PATCH /api/admin/integrations/:provider - non-secret config only */
export async function updateIntegrationSettings(req, res) {
  assertProvider(req.params.provider);

  const updated = await updateIntegration(req.params.provider, {
    isEnabled: req.body.isEnabled,
    config: req.body.config,
  });

  await recordAudit(req, {
    action: 'integration.update',
    entityType: 'integration',
    entityId: req.params.provider,
    summary: `Updated ${req.params.provider} settings (enabled: ${Boolean(updated.isEnabled)})`,
  });

  res.json({ success: true, data: updated });
}

/**
 * POST /api/admin/integrations/:provider/check
 * Runs a real connectivity probe. Never returns fabricated metrics - if the
 * credentials are absent, the provider stays disconnected and the response
 * explains exactly what is missing.
 */
export async function checkIntegrationConnection(req, res) {
  assertProvider(req.params.provider);

  const result = await checkIntegration(req.params.provider, req.body?.url);
  if (!result) throw ApiError.notFound(`Unknown integration "${req.params.provider}".`);

  await recordAudit(req, {
    action: 'integration.check',
    entityType: 'integration',
    entityId: req.params.provider,
    summary: `Checked ${req.params.provider}: ${result.status}`,
  });

  res.json({ success: true, data: result });
}

export default { listIntegrationSettings, updateIntegrationSettings, checkIntegrationConnection };
