# G3B two-project deployment — 28 October 2026

This supersedes the earlier single-project deployment plan. Keep repository
`Shar236/G3B`, frontend `g3-b`, backend `g3b-backend`, existing domain and database.
No deployment, remote configuration changes, schema/data writes, upload migration,
credential rotation or application `.env` edits were performed in this task.

## Architecture and routing

The actual frontend is React/Vite in `client`; Express and PostgreSQL are in
`server`. The app factory is `server/src/app.js`; the standalone local listener
remains `server/src/server.js`. Existing public/auth/admin/student/health/cron
routers are unchanged. `server/api/index.mjs` exports the existing app once per
warm instance, without importing the listener, scheduler startup or migrations.

The backend uses Vercel's standard Node function adapter, with Framework Preset
Other (`framework: null`). This is deliberate: the Express app is still Express,
but `src/app.js` exports a factory, and relying on automatic framework entry
detection risks selecting it instead of the explicit initialized function.

Frontend `client/vercel.json` routes in this order:

1. `/api` and `/api/*` proxy to backend `/api/` and matching nested paths, without
   method restrictions. Query strings and nested path captures are retained.
2. `/uploads` and `/uploads/*` proxy to corresponding backend paths.
3. `/robots.txt`, `/sitemap.xml`, and `/` explicitly reach Express before static
   filesystem routing, preserving generated site files and homepage metadata.
4. Existing frontend files/assets are served directly from Vercel's `dist` output.
5. Remaining paths reach the existing Express page renderer, which returns the
   Vite shell with published CMS metadata, custom redirects, private noindex or a
   real 404. This also lets backend-rendered HTML load its bundled hashed assets
   when a hash is absent from the frontend build.

An `index.html` catch-all cannot preserve the current CMS: page names and redirects
are database-managed and can be arbitrary. A finite list of public slugs would
silently lose new CMS pages. Therefore the final fallback is intentionally a
**page/asset-miss renderer**, after explicit API/upload/site-file routes and the
frontend filesystem. The backend renderer excludes `/api` and `/uploads` from
HTML fallback. Unknown APIs remain JSON 404s. No duplicate API implementation or
new frontend rendering framework was introduced.

`npm run build:vercel --prefix server` builds `client/dist` using production mode
and an empty API origin, then copies the output into ignored `server/site-dist`.
This avoids runtime reliance on a sibling build directory. The backend has an
empty generated `public` output; its single function includes `site-dist/**`.
Both projects must deploy the same commit with matching public `VITE_*` settings
(particularly the admin route), so HTML and assets agree. The backend also bundles
its asset copy to support rollout hash differences.

API URLs in the browser stay on `https://g3beducation.com`; leave `VITE_API_URL`
empty. CORS now rejects an untrusted Origin with JSON 403 rather than continuing
the request without CORS headers. Admin/student Secure/HttpOnly/Lax cookies and
CSRF controls remain; CSRF cookies stay browser-readable as required. Unexpected
production 5xx responses no longer expose diagnostic messages or details.

## Dashboard settings

Both projects use `Shar236/G3B` and Node **24.x**. Enable **Include source files
outside of the Root Directory in the Build Step** for both: the frontend imports
`shared/`, and the backend imports shared policy/article data and builds the
sibling frontend for HTML rendering. Do not create or merge projects.

| Setting | Frontend `g3-b` | Backend `g3b-backend` |
| --- | --- | --- |
| Root Directory | `client` | `server` |
| Framework Preset | Vite | **Other** (explicit Node adapter for Express) |
| Install Command | `npm ci --include=dev` | `npm ci && npm ci --prefix ../client --include=dev` |
| Build Command | `npm run build` | `npm run build:vercel` |
| Output Directory | `dist` | `public` (generated empty directory) |
| Domain | Keep `g3beducation.com`; confirm `www.g3beducation.com` | Confirm `g3b-backend.vercel.app` belongs to this project and its production deployment |

These commands/output settings are pinned in the respective nested configs.
The root config is now inert, and the old root function is only a compatibility
re-export. Deploy from the intended project, never an accidental third root project.

Read-only dashboard inspection confirmed the two roots and Node versions. The
backend dashboard still displays the old Express preset; change it to Other to
match the explicit Node adapter. Also ensure production deployment protection does
not block the public API/proxy; do not weaken Preview protection unnecessarily.

## Production environment variables

Configure values in the **existing backend project's Production environment**.
No secrets should be pasted into chat, source, public bundles or this document.

| Variable(s) | Required setting |
| --- | --- |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGINS` | `https://g3beducation.com,https://www.g3beducation.com` |
| `PUBLIC_SITE_URL` | `https://g3beducation.com` (canonical origin must remain the frontend domain) |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | `true`, `lax` |
| `SERVE_CLIENT` | `false`; function explicitly opts into the existing renderer |
| `SUPABASE_DB_URL` | Existing private Supabase Transaction pooler URI, port 6543 |
| `DATABASE_URL` | Leave unset when using `SUPABASE_DB_URL`; if present it takes precedence |
| `DB_SSL`, `DB_CONNECTION_LIMIT` | `true`, `2` |
| `DB_SSL_CA` | Verified Supabase CA as PEM; actual newlines or literal `\n` supported |
| `DB_SSL_CA_FILE` | Unset/empty; never restore a Windows path |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Preserve existing private secret (at least 32 characters) and lifetime |
| `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Preserve current private administrator values; no users recreated |
| `ADMIN_ROUTE` | Current admin route, matching frontend `VITE_ADMIN_ROUTE` |
| `SUPABASE_URL` | Existing project's HTTPS URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Private backend Storage key; existing `SUPABASE_SECRET_KEY` alias supported |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key; `SUPABASE_ANON_KEY` alias supported |
| `SUPABASE_MEDIA_BUCKET`, `SUPABASE_PRIVATE_BUCKET` | `g3b-media`, `g3b-private` |
| `UPLOAD_STORAGE_PROVIDER` | `supabase`; Vercel runtime already selects it |
| `UPLOAD_DIR`, `ASSESSMENT_REPORTS_DIR`, `MAX_UPLOAD_MB` | Preserve `uploads`, `private/assessment-reports`, current `5` MB limit |
| `CRON_SECRET` | Manually configure a private secret of at least 32 characters; no automatic generation/rotation |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_REQUIRE_TLS` | Actual provider settings; commonly 587/false/true or 465/true/true |
| `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Existing private SMTP/account/sender/recipient configuration |
| `YOUTUBE_API_KEY`, `YOUTUBE_SHORTS_PLAYLIST_ID`, `YOUTUBE_AUTO_SYNC` | Preserve integration settings if used |
| Existing rate-limit and YouTube paging/timeout variables | Preserve existing values |
| `ALLOW_SUPABASE_SCHEMA_CREATE` | Unset or `false`; deployment runs no migration |

The backend Production variable-name inventory currently lacks **`DB_SSL_CA`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`,
`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY`, and `CRON_SECRET`**. Add these in
Vercel before deployment. Existing production validation requires the Storage
and cron settings at startup. Secret-name presence does not prove a valid value.
`DB_SSL_CA_FILE` is currently listed; clear it in the dashboard and use inline CA.

Frontend Production:

- Clear/remove the existing **`VITE_API_URL`** value; use relative URLs.
- Keep `VITE_ADMIN_ROUTE` matching `ADMIN_ROUTE`; mirror it for the backend's
  frontend-shell build if customized.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` were listed in the
  dashboard; they must only contain public project values if retained. Never
  put a service-role key, DB URL, JWT secret or mail credentials in `VITE_*`.

Local dotenv files were not edited. Local Vercel pulls saved ignored metadata and
Secret placeholders; placeholders are not runtime credentials. Root local CLI
metadata was refreshed for both real projects, replacing the stale deleted-project
link; the last local build targets `g3-b`. Explicitly link the intended project
before any manual deployment.
The failed subdirectory build also left ignored `server/.vercel` metadata; use
the repository-root commands below to avoid interpreting Root Directory twice.

## Database, uploads and remaining service verification

The existing `pg` driver, transaction-pooler URL approach, strict certificate and
hostname verification, two-connection serverless pool and transaction release
logic are retained. A read-only `SELECT 1` with the current inline CA passed
again in this task. No schema/data writes were performed.

Supabase Storage must be configured and tested separately. Existing code supports
public content images/variants/gallery photos/videos/thumbnails, private assessment
reports, and private staging of learning PDFs/submissions (final learning content
still uses the existing PostgreSQL storage). Signed uploads avoid function request
limits. Legacy multipart finalization retains the durable provider adapter.

Two existing local upload/private files were found in the preceding audit. No
copy, deletion, reference update or cloud migration was performed. A proxy alone
cannot make local Windows files available on Vercel: inventory existing DB paths,
configure buckets/credentials, copy and verify files, and approve reference
updates before cutover. Keep private reports private. Existing `/uploads/...`
links will proxy correctly but files still need to exist in durable storage or
have their references migrated. Files near/above Vercel's response-body limit
need a verified signed-download flow; a proxy does not remove that limit.

SMTP sends and password-reset/subscriber/enquiry mail remain unverified without
real provider settings. Local SMTP is empty. Existing database-first enquiry
storage and notification queues are preserved. No live email was sent.

Per-instance memory rate limiters remain in place; they are not a globally shared
limit across serverless instances. Persistent admin/student sessions remain in
PostgreSQL. Cron stays daily 02:00 UTC / 07:30 IST, protected by `CRON_SECRET`.

## Files changed in this task

Pre-existing user changes, Storage work and earlier deployment work were retained.

| File | Purpose |
| --- | --- |
| `client/vercel.json` | Active frontend proxy/static/page routing and build settings |
| `server/vercel.json` | Active backend Node function, build, bundled site files, exclusions and cron |
| `server/api/index.mjs` | Single initialized Express function using bundled `site-dist` |
| `server/scripts/build-vercel.mjs` | Production frontend build and backend asset/shell copy, no database actions |
| `server/package.json` | Add `build:vercel` command |
| `server/src/app.js` | Configurable renderer directory; reject untrusted origins |
| `server/src/middleware/errorHandler.js` | Sanitize production 5xx diagnostic messages/details |
| `server/src/middleware/redirects.js` | Exclude bare `/api` and `/uploads` from CMS redirect lookups |
| `server/tests/vercel.test.js` | Two-project path/query/method, CORS, cookies/CSRF, error, CMS/redirect/site-file tests |
| `client/.env.example` | Correct same-origin proxy guidance |
| `server/.vercelignore`, `.gitignore` | Keep generated site output out of source upload/Git |
| `vercel.json` | Neutralize obsolete single-project settings |
| `api/index.mjs` | Compatibility alias to the actual backend entry; no second implementation |
| `README.md` | Current two-project deployment guidance |
| `docs/VERCEL_PRODUCTION.md` | Mark earlier single-project runbook superseded |
| `docs/VERCEL_TWO_PROJECTS.md` | Current settings, actions, checks and limitations |

## Local validation and manual deployment order

Use Node 24.x. Run installs/builds/tests sequentially on Windows; concurrent
`npm ci` and Vite tests lock native modules and invalidate test runs.

```powershell
Set-Location D:\G3b
npm ci --prefix server --include=dev
npm ci --prefix client --include=dev
npm run build:vercel --prefix server
npm run lint --prefix client
npm test --prefix client
npm test --prefix server -- tests/vercel.test.js tests/postgres.test.js tests/persistUpload.test.js tests/mailer.test.js
```

Use the previous runbook's unreachable-local-DB overrides before running the
whole backend integration suite. Do not run it against production; some tests
insert/delete rows. Never run migrations, seed or `create-admin` during deployment.

After the manual dashboard/environment/storage actions, deploy **backend first**,
verify its health and renderer, then deploy frontend from the same commit.
Dashboard Git deployments select the correct nested configs automatically.
For CLI, start from the repository root and select the target explicitly:

```powershell
Set-Location D:\G3b
vercel link --yes --project g3b-backend
vercel project inspect g3b-backend
# Optional local packaging check; local Secret placeholders do not verify runtime:
vercel pull --yes --project g3b-backend --environment production
vercel build --local-config server/vercel.json --project g3b-backend --prod --standalone
# Manual deployment only; not run by this task:
vercel --prod --local-config server/vercel.json
Invoke-RestMethod https://g3b-backend.vercel.app/api/health

vercel link --yes --project g3-b
vercel project inspect g3-b
vercel --prod --local-config client/vercel.json
Invoke-RestMethod https://g3beducation.com/api/health
```

## Production verification

- Both health URLs must return JSON; database check must report `up`.
- `/api` and unknown `/api/...` must return JSON 404, never the SPA shell.
- Preflight allowed Origin must allow credentials; an untrusted Origin must return 403.
- Test admin login, refresh, logout, role restrictions and rejected missing CSRF.
- Test student login, reload/session persistence, logout and private ownership.
- Confirm browser requests and cookies stay on `g3beducation.com`.
- View source for homepage, CMS pages and articles: published canonical/OG metadata
  must use `g3beducation.com`. Confirm real redirect status/location and unknown-page 404.
- Fetch sitemap and robots: generated contents, frontend canonical origin.
- Verify public images/video/variants, private report downloads and learning files;
  include legacy references and files large enough to expose platform limits.
- Verify approved email recipients/sender, failed-send queues and cron authentication.

Read-only pre-change production probes in this task found backend
`https://g3b-backend.vercel.app/api/health` returning **404**, while frontend
`https://g3beducation.com/api/health` returned **200 HTML**. `vercel inspect` could
not find a deployment assigned to the intended backend hostname in the current
team. Confirm that alias on the backend's production deployment before frontend
cutover. These observations are not a claim that the repaired code is deployed.

## Validation results

- Backend dependency installation and full local `vercel build --prod --standalone`
  with `server/vercel.json`: **passed**. Function runtime is `nodejs24.x`.
- Frontend dependency installation and full local Vercel production build with
  `client/vercel.json`: **passed**. Local public build settings were normalized
  to production/relative API; inaccessible Secret placeholders do not verify live values.
- Backend build's frontend production build/copy: **passed**.
- Frontend tests rerun after installations: **56 passed, zero failed**.
- Frontend lint: **passed**, zero errors and 41 existing warnings.
- Full backend suite against unreachable localhost port 1: **73 passed, 38 skipped,
  5 failed**. All five failures are existing public-media tests requiring a live
  database but not skipping when unavailable; no test touched production data.
- All **10 two-project deployment/security tests passed**: method/path/query proxy
  mapping, CORS, redirects, canonical metadata, API JSON 404s, production cookie
  attributes, admin/student CSRF, sanitized errors, auth guards and site rendering.
- Existing mocked upload persistence, SMTP and PostgreSQL TLS tests passed.
- All three Vercel JSON files passed official schema validation; diff whitespace
  check passed. JavaScript syntax and JSON parsing were checked separately.
- Backend artifact: bundled `server/site-dist/index.html`; recursive inspection
  found **zero dotenv files and no local CA file**. The actual built function
  imported successfully; unknown API JSON 404, private student HTML/noindex and
  canonical robots responses passed using an unreachable test DB and dummy local
  service values. No fake credentials were saved to application `.env` files.
- Frontend artifact: static output and ordered proxy routes passed inspection;
  private-value scan of 22 JS/HTML files found no tested private local credentials.
- Verified-TLS read-only `SELECT 1` against the existing database: **passed**.
- Initial local attempts failed because of a subdirectory/root mismatch and a
  Windows native-module lock from overlapping installation/tests. Corrected
  repository-root/sequential reruns passed; these failures are not remote deployments.
- Production health probes remain **backend 404 / frontend HTML** until deployment.
- Local execution uses installed Node 25.2.1; packaged backend targets Node 24.x.
  A deployed Node 24 smoke test was not run.
- Dependency installation reported one high runtime server advisory (seven total
  with development dependencies) and three low frontend advisories. No automatic
  dependency upgrades or credential changes were performed.

Not run: remote deployment, credentialed browser login/refresh/logout through the
live proxy, production form/database writes, real upload/download/migration,
live SMTP delivery, or actual scheduled synchronization. The exact remaining
dashboard/environment/alias and Storage actions are listed above.

Sources: [Vercel monorepo source inclusion](https://vercel.com/docs/monorepos/monorepo-faq),
[Vercel rewrites](https://vercel.com/docs/routing/rewrites).
