import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { insights } from '../../client/src/data/insights.js';
import { builtInPages, mergePublicPages, injectBuiltInBody } from '../src/services/builtInPages.js';
import { renderMetaTags, buildSitemapXml } from '../src/services/seoRenderer.js';
import { createPageRenderer, createSiteFiles } from '../src/middleware/siteRenderer.js';
import { pingDatabase, closePool } from '../src/config/db.js';
import { createApp } from '../src/app.js';

let dbAvailable = false;
let temporaryDirectory;
let rendererApp;
beforeAll(async () => {
  try { await pingDatabase(); dbAvailable = true; } catch { return; }
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'g3b-seo-test-'));
  await fs.writeFile(path.join(temporaryDirectory, 'index.html'), '<!doctype html><html><head><title>Static</title></head><body><div id="root"></div></body></html>');
  rendererApp = express();
  rendererApp.use(createSiteFiles());
  rendererApp.use(createPageRenderer({ distDir: temporaryDirectory }).middleware);
});
afterAll(async () => {
  if (temporaryDirectory) {
    await fs.unlink(path.join(temporaryDirectory, 'index.html'));
    await fs.rmdir(temporaryDirectory);
  }
  await closePool();
});

describe('article metadata fallback', () => {
  it('uses the same titles, descriptions, dates and content as React', () => {
    const article = insights[0];
    const page = builtInPages.find((item) => item.route === `/insights/${article.slug}`);
    const tags = renderMetaTags(page, {}, 'https://example.test');
    expect(tags).toContain('<meta property="og:type" content="article" />');
    expect(tags).toContain('"@type":"Article"');
    expect(tags).toContain(`"datePublished":"${article.date}"`);
    const html = injectBuiltInBody('<div id="root"></div>', page.route);
    expect(html).toContain('<h1>US, UK &amp; Canada: what to check about post-study work</h1>');
    expect(html).toContain(article.sections[0].text);
    expect(html).toContain(article.sources[0].url);
  });

  it('respects published CMS overrides, suppresses drafts, and avoids sitemap duplicates', () => {
    const registered = [
      { route: '/insights', status: 'published', isIndexable: true, seo: { seoTitle: 'Custom insights title', metaDescription: null } },
      { route: `/insights/${insights[0].slug}`, status: 'draft' },
    ];
    const pages = mergePublicPages(registered);
    expect(pages.filter((item) => item.route === '/insights')).toHaveLength(1);
    expect(pages.find((item) => item.route === '/insights').seo).toMatchObject({ seoTitle: 'Custom insights title', metaDescription: expect.any(String) });
    const xml = buildSitemapXml(pages, 'https://example.test');
    expect(xml).toContain('https://example.test/insights</loc>');
    expect(xml).not.toContain(insights[0].slug);
    expect(xml).not.toContain('/unsubscribe');
  });
});

describe('crawler and API integration', () => {
  it('returns public article SEO and the insights index instead of route-not-found', async (context) => {
    if (!dbAvailable) { context.skip(); return; }
    const app = createApp();
    for (const route of ['/insights', ...insights.map((article) => `/insights/${article.slug}`)]) {
      const result = await request(app).get('/api/seo/page').query({ route });
      expect(result.status).toBe(200);
      expect(result.body.data.route).toBe(route);
      expect(result.body.data.seo.seoTitle).toBeTruthy();
    }
  });

  it('serves crawler-readable article HTML, sitemap entries, and a noindex unsubscribe page', async (context) => {
    if (!dbAvailable) { context.skip(); return; }
    const article = insights[0];
    const result = await request(rendererApp).get(`/insights/${article.slug}`).set('Accept', 'text/html');
    expect(result.status).toBe(200);
    expect(result.text).toContain(article.sections[0].heading);
    expect(result.text).toContain('<meta name="robots" content="index,follow" />');
    expect(result.text).not.toContain('Page not found');
    const index = await request(rendererApp).get('/insights').set('Accept', 'text/html');
    expect(index.status).toBe(200);
    expect(index.text).toContain(`<a href="/insights/${article.slug}">`);
    const sitemap = await request(rendererApp).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    for (const item of insights) expect(sitemap.text).toContain(`/insights/${item.slug}</loc>`);
    expect(sitemap.text).not.toContain('/unsubscribe');
    const unsubscribe = await request(rendererApp).get('/unsubscribe?token=example').set('Accept', 'text/html');
    expect(unsubscribe.status).toBe(200);
    expect(unsubscribe.text).toContain('noindex,nofollow');
  });
});
