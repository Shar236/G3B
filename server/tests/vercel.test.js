import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { spawnSync } from 'node:child_process';

// Never connect to the configured database, even when run on its own.
vi.mock('../src/config/db.js', () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  pingDatabase: vi.fn(async () => true),
  closePool: vi.fn(async () => {}),
  pool: { query: vi.fn(async () => ({ rows: [] })) },
}));
vi.mock('../src/repositories/pagesRepository.js', () => ({
  pagesRepository: {
    list: vi.fn(async () => []),
    findPublishedByRoute: vi.fn(async (route) => route === '/' ? {
      route: '/', name: 'Home', status: 'published', sections: [],
      seo: { seoTitle: 'Production homepage' },
    } : null),
    findRouteOwner: vi.fn(async () => null),
  },
}));
vi.mock('../src/repositories/redirectsRepository.js', () => ({
  redirectsRepository: {
    listActive: vi.fn(async () => [{ id: 1, sourcePath: '/old-deployment-test', destinationPath: '/services', statusCode: 301 }]),
    recordHit: vi.fn(async () => {}),
  },
}));
import { createApp } from '../src/app.js';
import env from '../src/config/env.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requireCookieCsrf } from '../src/middleware/auth.js';
import { studentCsrf } from '../src/middleware/studentAuth.js';
import { hashStudentToken } from '../src/repositories/studentRepository.js';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url)));
const frontend = JSON.parse(fs.readFileSync(new URL('../../client/vercel.json', import.meta.url)));
const app = createApp({ renderSite: true });

describe('two-project Vercel routing', () => {
  it('routes all API methods and nested paths to Express before the filesystem', () => {
    const first = config.routes[0];
    for (const pathname of ['/api', '/api/health', '/api/admin/media/42', '/api/student/login']) {
      expect(new RegExp(`^(?:${first.src})$`).test(pathname)).toBe(true);
    }
    expect(first.methods).toBeUndefined();
    expect(first.dest).toBe('/api/index.mjs');
    expect(config.builds).toBeUndefined();
    expect(config.outputDirectory).toBe('public');
    expect(config.functions['api/index.mjs'].excludeFiles).toContain('**/.env*');
    expect(config.functions['api/index.mjs'].includeFiles).toBe('site-dist/**');
    for (const name of fs.readdirSync(new URL('../src/routes/', import.meta.url))) {
      const source = fs.readFileSync(new URL(`../src/routes/${name}`, import.meta.url), 'utf8');
      for (const match of source.matchAll(/router\.(get|post|put|patch|delete|head|options)\('([^']+)'/g)) {
        // Every declared route remains under /api, with no host-level method filter.
        expect(new RegExp(`^(?:${first.src})$`).test(`/api${match[2]}`)).toBe(true);
      }
    }
  });

  it('preserves frontend proxy paths, methods, query strings and dynamic CMS routes', () => {
    const destination = (url) => {
      const parsed = new URL(url, 'https://g3beducation.com');
      for (const route of frontend.routes) {
        if (!route.src) continue;
        const match = parsed.pathname.match(new RegExp(`^(?:${route.src})$`));
        if (match) {
          expect(route.methods).toBeUndefined();
          return route.dest.replace(/\$(\d+)/g, (_, i) => match[Number(i)] || '') + parsed.search;
        }
      }
    };
    for (const path of ['/api/admin/enquiries/42?status=new&page=2', '/api/student/session', '/uploads/photo.png', '/sitemap.xml', '/new-cms-page', '/old-page?source=link']) {
      expect(destination(path)).toBe(`https://g3b-backend.vercel.app${path}`);
    }
    expect(destination('/api')).toBe('https://g3b-backend.vercel.app/api/');
    expect(frontend.routes.findIndex((r) => r.handle === 'filesystem')).toBeLessThan(frontend.routes.length - 1);
  });

  it('allows configured credentialed preflights and rejects untrusted origins', async () => {
    const allowed = await request(app).options('/api/auth/login').set('Origin', 'https://g3beducation.com').set('Access-Control-Request-Method', 'POST');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://g3beducation.com');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const rejected = await request(app).post('/api/auth/login').set('Origin', 'https://untrusted.invalid').send({});
    expect(rejected.status).toBe(403);
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('retains redirects, canonical metadata and API query parameters', async () => {
    const redirect = await request(app).get('/old-deployment-test');
    expect(redirect.status).toBe(301);
    expect(redirect.headers.location).toBe('/services');
    const page = await request(app).get('/api/seo/page').query({ route: '/' });
    expect(page.status).toBe(200);
    expect(page.body.data.route).toBe('/');
    const home = await request(app).get('/').set('Accept', 'text/html');
    expect(home.text).toContain('Production homepage');
    expect(home.text).toContain('https://g3beducation.com/');
  });

  it('issues production session cookies with Secure, HttpOnly and SameSite=lax', () => {
    const script = `
      const {setAuthCookies}=await import('./src/middleware/auth.js');
      const {setStudentCookies}=await import('./src/middleware/studentAuth.js');
      const cookies=[];const res={cookie:(name,value,options)=>cookies.push({name,options})};
      setAuthCookies(res,{id:1,role:'admin',email:'test@example.invalid'});
      setStudentCookies(res,{token:'test',csrfToken:'test',expiresAt:new Date(Date.now()+60000)});
      console.log(JSON.stringify(cookies));
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production', COOKIE_SECURE: 'true', COOKIE_SAMESITE: 'lax' },
    });
    expect(child.status).toBe(0);
    const cookies = JSON.parse(child.stdout.trim());
    for (const cookie of cookies) {
      expect(cookie.options.secure).toBe(true);
      expect(cookie.options.sameSite).toBe('lax');
      expect(cookie.options.httpOnly).toBe(!cookie.name.includes('csrf'));
    }
  });

  it('keeps admin and student CSRF checks enabled', () => {
    const token = 'a'.repeat(48);
    const next = vi.fn();
    requireCookieCsrf({ cookies: { g3b_csrf: token }, headers: { 'x-csrf-token': token } }, {}, next);
    expect(next).toHaveBeenLastCalledWith();
    requireCookieCsrf({ cookies: { g3b_csrf: token }, headers: {} }, {}, next);
    expect(next.mock.lastCall[0].status).toBe(403);
    studentCsrf({ cookies: { g3b_student_csrf: token }, get: () => token, student: { csrf_hash: hashStudentToken(token) } }, {}, next);
    expect(next).toHaveBeenLastCalledWith();
    studentCsrf({ cookies: { g3b_student_csrf: token }, get: () => 'b'.repeat(48), student: { csrf_hash: hashStudentToken(token) } }, {}, next);
    expect(next.mock.lastCall[0].status).toBe(403);
  });

  it('hides unexpected production error messages and details', () => {
    const previous = env.isProduction;
    env.isProduction = true;
    try {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      errorHandler(Object.assign(new Error('internal test diagnostic'), { details: { internal: 'diagnostic' } }), { method: 'GET', originalUrl: '/api/test' }, res, () => {});
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    } finally { env.isProduction = previous; }
  });

  it('keeps unknown APIs JSON for every HTTP method', async () => {
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head']) {
      const response = await request(app)[method]('/api/missing-vercel-test');
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
    }
    expect((await request(app).options('/api/missing-vercel-test')).status).toBe(204);
  });

  it('preserves anonymous admin and student guards and form validation', async () => {
    expect((await request(app).get('/api/admin/enquiries')).status).toBe(401);
    expect((await request(app).delete('/api/admin/services/1')).status).toBe(401);
    expect((await request(app).get('/api/student/dashboard')).status).toBe(401);
    expect((await request(app).post('/api/enquiries').send({})).status).toBe(422);
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(422);
  });

  it('preserves server-rendered pages, generated site files and private noindex', async () => {
    // Build first: these checks intentionally require the deployable Vite output.
    const home = await request(app).get('/').set('Accept', 'text/html');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toContain('text/html');
    expect(home.text).toContain('id="root"');
    const student = await request(app).get('/student/login');
    expect(student.headers['x-robots-tag']).toContain('noindex');
    expect(student.headers['cache-control']).toBe('no-store');
    const robots = await request(app).get('/robots.txt');
    expect(robots.status).toBe(200);
    expect(robots.text).toContain('Sitemap:');
    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain('<urlset');
    expect((await request(app).get('/missing-public-vercel-test').set('Accept', 'text/html')).status).toBe(404);
  });
});
