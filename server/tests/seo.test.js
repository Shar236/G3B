import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pingDatabase, closePool, query } from '../src/config/db.js';
import env from '../src/config/env.js';
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectHead,
  renderMetaTags,
} from '../src/services/seoRenderer.js';

const app = createApp();
let dbAvailable = false;

beforeAll(async () => {
  try {
    await pingDatabase();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await closePool().catch(() => {});
});

/** Log in as the seeded administrator and return cookies + CSRF token. */
async function adminSession() {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: env.admin.email, password: env.admin.password });

  if (login.status !== 200) return null;

  return {
    cookies: login.headers['set-cookie'],
    csrf: login.body.data.csrfToken,
  };
}

describe('seo renderer (pure functions)', () => {
  const page = {
    route: '/services',
    isIndexable: true,
    updatedAt: '2026-01-02T00:00:00.000Z',
    seo: { seoTitle: 'Services & "quotes"', metaDescription: 'Short description.', metaRobots: 'index,follow' },
  };

  it('renders escaped meta tags with a canonical URL', () => {
    const html = renderMetaTags(page, { siteName: 'G3B Education' }, 'https://example.com');
    expect(html).toContain('<title>Services &amp; &quot;quotes&quot;</title>');
    expect(html).toContain('<link rel="canonical" href="https://example.com/services" />');
    expect(html).toContain('<meta name="robots" content="index,follow" />');
  });

  it('omits noindex pages from the sitemap', () => {
    const xml = buildSitemapXml(
      [page, { ...page, route: '/private', seo: { ...page.seo, metaRobots: 'noindex,follow' } }],
      'https://example.com',
    );
    expect(xml).toContain('<loc>https://example.com/services</loc>');
    expect(xml).not.toContain('/private');
  });

  it('writes the private admin path into robots.txt without claiming it is security', () => {
    const txt = buildRobotsTxt('https://example.com', '/manage-portal');
    expect(txt).toContain('Disallow: /manage-portal');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('replaces the static title and description in the served shell', () => {
    const shell =
      '<html><head><title>Old</title><meta name="description" content="old" /><body></body></head></html>';
    const output = injectHead(shell, '<title>New</title>');
    expect(output).not.toContain('<title>Old</title>');
    expect(output).not.toContain('content="old"');
    expect(output).toContain('<title>New</title>');
  });
});

describe('public seo endpoints', () => {
  it('requires a route parameter', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/seo/page');
    expect(res.status).toBe(400);
  });

  it('returns metadata for a published route', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/seo/page').query({ route: '/services' });
    expect(res.status).toBe(200);
    expect(res.body.data.route).toBe('/services');
    expect(res.body.data.seo.metaRobots).toBeTruthy();
    expect(res.body.data.canonical).toMatch(/\/services$/);
  });

  it('returns 404 for an unregistered route', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/seo/page').query({ route: '/definitely-not-registered' });
    expect(res.status).toBe(404);
  });

  it('never exposes draft payloads or private columns', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/seo/pages');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const page of res.body.data) {
      expect(page.seo).not.toHaveProperty('draftPayload');
      expect(page.seo).not.toHaveProperty('hasDraft');
      expect(page).not.toHaveProperty('isSystem');
    }
  });
});

describe('admin seo manager', () => {
  it('blocks anonymous access to the page registry', async () => {
    const res = await request(app).get('/api/admin/pages');
    expect(res.status).toBe(401);
  });

  it('runs the full page lifecycle with draft/publish and revisions', async () => {
    if (!dbAvailable) return;

    const session = await adminSession();
    if (!session) return; // Administrator not seeded - nothing to assert.

    const authed = (method, url) =>
      request(app)[method](url).set('Cookie', session.cookies).set('X-CSRF-Token', session.csrf);

    const route = `/seo-test-${Date.now()}`;
    let pageId = null;

    try {
      // Create -----------------------------------------------------------------
      const created = await authed('post', '/api/admin/pages').send({
        name: 'SEO Test Page',
        route,
        pageType: 'custom',
        status: 'published',
      });
      expect(created.status).toBe(201);
      pageId = created.body.data.id;
      expect(created.body.data.isSystem).toBe(false);

      // Validation and uniqueness ---------------------------------------------
      const duplicate = await authed('post', '/api/admin/pages').send({ name: 'Dup', route });
      expect(duplicate.status).toBe(409);

      const badRoute = await authed('post', '/api/admin/pages').send({ name: 'Bad', route: 'no-slash' });
      expect(badRoute.status).toBe(422);
      expect(badRoute.body.details).toHaveProperty('route');

      const missingName = await authed('post', '/api/admin/pages').send({ route: `${route}-2` });
      expect(missingName.status).toBe(422);

      // Draft is not published ------------------------------------------------
      const draft = await authed('put', `/api/admin/pages/${pageId}/seo`).send({
        seoTitle: 'Draft title that must not go live',
        metaDescription: 'Draft description.',
      });
      expect(draft.status).toBe(200);
      expect(draft.body.data.status).toBe('draft');

      const whileDraft = await request(app).get('/api/seo/page').query({ route });
      expect(whileDraft.status).toBe(200);
      expect(whileDraft.body.data.seo.seoTitle).not.toBe('Draft title that must not go live');

      // Publish ---------------------------------------------------------------
      const firstTitle = 'First published title';
      const publish = await authed('put', `/api/admin/pages/${pageId}/seo`).send({
        seoTitle: firstTitle,
        metaDescription: 'Published description for the SEO test page.',
        publish: true,
      });
      expect(publish.status).toBe(200);
      expect(publish.body.data.status).toBe('published');

      const afterPublish = await request(app).get('/api/seo/page').query({ route });
      expect(afterPublish.body.data.seo.seoTitle).toBe(firstTitle);

      const secondTitle = 'Second published title';
      await authed('put', `/api/admin/pages/${pageId}/seo`).send({
        seoTitle: secondTitle,
        publish: true,
      });
      const afterSecond = await request(app).get('/api/seo/page').query({ route });
      expect(afterSecond.body.data.seo.seoTitle).toBe(secondTitle);

      // Sections --------------------------------------------------------------
      const section = await authed('put', `/api/admin/pages/${pageId}/sections/hero`).send({
        headingLevel: 'h1',
        headingText: 'Test hero heading',
        description: 'Test hero copy.',
      });
      expect(section.status).toBe(200);
      expect(section.body.data.headingLevel).toBe('h1');

      const badLevel = await authed('put', `/api/admin/pages/${pageId}/sections/hero`).send({
        headingLevel: 'h9',
      });
      expect(badLevel.status).toBe(422);

      // Revisions and rollback ------------------------------------------------
      const revisions = await authed('get', `/api/admin/pages/${pageId}/revisions`);
      expect(revisions.status).toBe(200);

      const firstRevision = revisions.body.data.find(
        (entry) => entry.entity === 'seo' && entry.snapshot?.seoTitle === firstTitle,
      );
      expect(firstRevision).toBeTruthy();

      const rollback = await authed(
        'post',
        `/api/admin/pages/${pageId}/revisions/${firstRevision.id}/rollback`,
      );
      expect(rollback.status).toBe(200);

      const afterRollback = await request(app).get('/api/seo/page').query({ route });
      expect(afterRollback.body.data.seo.seoTitle).toBe(firstTitle);

      // System pages cannot be deleted ---------------------------------------
      const systemDelete = await authed('delete', '/api/admin/pages/1');
      expect([400, 404]).toContain(systemDelete.status);
      if (systemDelete.status === 400) {
        expect(systemDelete.body.error).toMatch(/system page/i);
      }

      // Auditing --------------------------------------------------------------
      const auditRows = await query(
        "SELECT action FROM audit_logs WHERE entity_type = 'page' AND entity_id = ? ORDER BY id ASC",
        [String(pageId)],
      );
      const actions = auditRows.map((row) => row.action);
      expect(actions).toContain('page.create');
      expect(actions).toContain('page.seo.draft');
      expect(actions).toContain('page.seo.publish');
      expect(actions).toContain('page.revision.rollback');
    } finally {
      if (pageId) {
        await query('DELETE FROM pages WHERE id = ?', [pageId]);
        await query('DELETE FROM audit_logs WHERE entity_type = ? AND entity_id = ?', ['page', String(pageId)]);
      }
    }
  });
});
