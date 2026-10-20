import { integrationsRepository } from '../repositories/integrationsRepository.js';
import logger from '../utils/logger.js';

/**
 * Google / PageSpeed integration registry.
 *
 * The Master Prompt is explicit that analytics must never be invented: when
 * credentials are missing the provider is reported as `disconnected` with setup
 * instructions, and no metrics are fabricated.
 *
 * Credentials are read only from backend environment variables - never from the
 * database and never returned to the browser.
 */

const envValue = (key) => process.env[key] || '';

export const PROVIDERS = {
  google_search_console: {
    label: 'Google Search Console',
    // Fetching Search Analytics requires a service-account OAuth flow.
    apiImplemented: false,
    credentialEnvKeys: ['GSC_SERVICE_ACCOUNT_JSON', 'GSC_SITE_URL'],
    configKeys: ['siteUrl'],
    capabilities: ['impressions', 'clicks', 'ctr', 'position', 'top queries', 'top pages'],
    setupInstructions: [
      'Create a Google Cloud service account and enable the Search Console API.',
      'Add the service account as a user (Full or Restricted) in Search Console.',
      'Set GSC_SERVICE_ACCOUNT_JSON to the service-account JSON (single line) and GSC_SITE_URL to the verified property, e.g. https://g3beducation.com/.',
      'Search Console data stays marked disconnected until those variables are set.',
    ],
  },
  google_analytics: {
    label: 'Google Analytics 4',
    apiImplemented: false,
    credentialEnvKeys: ['GA4_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'],
    configKeys: ['propertyId'],
    capabilities: ['organic sessions', 'engaged sessions', 'conversions'],
    setupInstructions: [
      'Enable the Google Analytics Data API in Google Cloud.',
      'Grant the service account Viewer access to the GA4 property.',
      'Set GA4_SERVICE_ACCOUNT_JSON and GA4_PROPERTY_ID (the numeric property id, e.g. 123456789).',
      'GA4 data stays marked disconnected until those variables are set.',
    ],
  },
  pagespeed_insights: {
    label: 'PageSpeed Insights (Core Web Vitals)',
    // Fully implemented; only an API key is required.
    apiImplemented: true,
    credentialEnvKeys: ['PAGESPEED_API_KEY'],
    configKeys: ['defaultUrl'],
    capabilities: ['performance score', 'LCP', 'CLS', 'TBT', 'Speed Index'],
    setupInstructions: [
      'Create an API key in Google Cloud with the PageSpeed Insights API enabled.',
      'Set PAGESPEED_API_KEY in the backend environment.',
      'Optionally store a default URL to audit from the dashboard.',
    ],
  },
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS);

/** Which of a provider's required environment variables are present. */
function credentialState(provider) {
  const spec = PROVIDERS[provider];
  const present = spec.credentialEnvKeys.filter((key) => envValue(key));
  const missing = spec.credentialEnvKeys.filter((key) => !envValue(key));
  return { configured: missing.length === 0, present, missing };
}

/**
 * Merge stored non-secret configuration with live environment state.
 * Secrets are reduced to a boolean "is this variable set" - never their value.
 */
export function describeIntegration(provider, stored) {
  const spec = PROVIDERS[provider];
  const { configured, missing } = credentialState(provider);

  // The effective status is derived from the environment; a stored row can
  // never claim "connected" while the credentials are absent.
  const status = !spec.apiImplemented
    ? 'disconnected'
    : configured && stored?.isEnabled
      ? stored.status
      : 'disconnected';

  return {
    provider,
    label: spec.label,
    isEnabled: Boolean(stored?.isEnabled),
    config: stored?.config ?? {},
    status,
    supportedConfigKeys: spec.configKeys,
    apiImplemented: spec.apiImplemented,
    credentialsConfigured: configured,
    missingEnvKeys: missing,
    capabilities: spec.capabilities,
    setupInstructions: spec.setupInstructions,
    dataSource: 'Google APIs',
    lastSyncedAt: stored?.lastSyncedAt ?? null,
    lastError: stored?.lastError ?? null,
  };
}

/** Every provider with its current, honest connection state. */
export async function listIntegrations() {
  const stored = await integrationsRepository.list();
  const byProvider = new Map(stored.map((row) => [row.provider, row]));
  return PROVIDER_KEYS.map((provider) => describeIntegration(provider, byProvider.get(provider)));
}

/** Update only the allow-listed, non-secret config keys. */
export async function updateIntegration(provider, { isEnabled, config }) {
  const spec = PROVIDERS[provider];
  if (!spec) return null;

  const current = await integrationsRepository.findByProvider(provider);
  const safeConfig = { ...(current?.config ?? {}) };
  if (config && typeof config === 'object') {
    for (const key of spec.configKeys) {
      if (config[key] !== undefined) safeConfig[key] = config[key] === null ? null : String(config[key]).slice(0, 300);
    }
  }

  const { configured } = credentialState(provider);
  const updated = await integrationsRepository.upsert(provider, {
    isEnabled: isEnabled ?? current?.isEnabled ?? false,
    config: safeConfig,
    status: spec.apiImplemented && configured && (isEnabled ?? current?.isEnabled) ? current?.status ?? 'connected' : 'disconnected',
    lastError: null,
  });

  return describeIntegration(provider, updated);
}

/**
 * Lightweight connectivity probe.
 * - PageSpeed Insights: a real API call (only when the key is configured).
 * - GSC / GA4: not implemented here, so they report the true state instead of a
 *   fabricated success.
 */
export async function checkIntegration(provider, targetUrl) {
  const spec = PROVIDERS[provider];
  if (!spec) return null;

  const { configured, missing } = credentialState(provider);

  if (!configured) {
    const stored = await integrationsRepository.findByProvider(provider);
    await integrationsRepository.upsert(provider, {
      isEnabled: stored?.isEnabled ?? false,
      config: stored?.config ?? {},
      status: 'disconnected',
      lastError: `Missing environment variables: ${missing.join(', ')}`,
    });
    return {
      ...describeIntegration(provider, await integrationsRepository.findByProvider(provider)),
      checked: true,
      reachable: false,
      message: `Not configured. Set ${missing.join(' and ')} in the backend environment to connect.`,
    };
  }

  if (!spec.apiImplemented) {
    return {
      ...describeIntegration(provider, await integrationsRepository.findByProvider(provider)),
      checked: true,
      reachable: false,
      message: 'Credentials detected, but live data sync for this provider is not enabled. See the setup instructions.',
    };
  }

  // PageSpeed Insights: a genuine request, with the score returned verbatim.
  const stored = await integrationsRepository.findByProvider(provider);
  const url = targetUrl || stored?.config?.defaultUrl;
  if (!url) {
    return {
      ...describeIntegration(provider, stored),
      checked: true,
      reachable: false,
      message: 'Add a default URL to audit before running a PageSpeed check.',
    };
  }

  const result = await runPageSpeedInsights(url);
  const updated = await integrationsRepository.setStatus(provider, result.ok ? 'connected' : 'error', result.error ?? null);

  return {
    ...describeIntegration(provider, updated),
    checked: true,
    reachable: result.ok,
    message: result.ok ? `Fetched a live PageSpeed report for ${url}.` : result.error,
    report: result.ok ? result : null,
  };
}

/** Real PageSpeed Insights call. Returns the raw Lighthouse scores. */
export async function runPageSpeedInsights(url, { strategy = 'mobile' } = {}) {
  const key = envValue('PAGESPEED_API_KEY');
  if (!key) return { ok: false, error: 'PAGESPEED_API_KEY is not configured.' };

  try {
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('strategy', strategy);
    endpoint.searchParams.set('key', key);
    for (const category of ['performance', 'seo', 'accessibility', 'best-practices']) {
      endpoint.searchParams.append('category', category);
    }

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `PageSpeed API returned ${response.status}: ${body.slice(0, 200)}` };
    }

    const payload = await response.json();
    const lighthouse = payload.lighthouseResult ?? {};
    const categories = lighthouse.categories ?? {};
    const audits = lighthouse.audits ?? {};

    return {
      ok: true,
      fetchedAt: payload.fetchTime ?? new Date().toISOString(),
      finalUrl: payload.id ?? url,
      strategy,
      scores: {
        performance: Math.round((categories.performance?.score ?? 0) * 100),
        seo: Math.round((categories.seo?.score ?? 0) * 100),
        accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
      },
      metrics: {
        firstContentfulPaint: audits['first-contentful-paint']?.displayValue ?? null,
        largestContentfulPaint: audits['largest-contentful-paint']?.displayValue ?? null,
        totalBlockingTime: audits['total-blocking-time']?.displayValue ?? null,
        cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue ?? null,
        speedIndex: audits['speed-index']?.displayValue ?? null,
      },
    };
  } catch (error) {
    logger.warn('PageSpeed Insights request failed', { url, error: error.message });
    return { ok: false, error: error.message };
  }
}

export default { PROVIDERS, PROVIDER_KEYS, listIntegrations, updateIntegration, checkIntegration, runPageSpeedInsights };
