# G3B single-project Vercel deployment

> Historical audit, superseded by [the two-project runbook](VERCEL_TWO_PROJECTS.md).
> Do not apply the single-project dashboard settings below to the current projects.

Audit date: 28 October 2026. No deployment, schema migration, production data writes,
credential rotation, or migration/deletion of existing uploads was performed.

## Confirmed causes and project settings

1. `server/vercel.json` contained both legacy `builds` and `functions`. Vercel
   rejects that combination. The root file did not contain that conflict.
2. Read-only `vercel project inspect g3-b-clp1` confirmed the linked project's Root
   Directory was `server`, Framework Preset `Express`, Build Command
   `echo "no build"`, and Output Directory `.`. Those settings selected the
   conflicting nested configuration and could not build the frontend.
3. The root configuration only built the frontend and sent every route to
   `/index.html`, so choosing the root alone would have swallowed API requests.
4. `client/vercel.json` proxied to a separately deployed API project, which does
   not match the required single-project deployment. Nested configs are now
   valid inert schema-only files; deploy from the root only.
5. `client/.env` specified `http://localhost:5001`; it now leaves `VITE_API_URL`
   empty for same-origin requests. Never configure localhost as the production API.

Make these changes manually in the **existing** Vercel project, Settings > Build
and Deployment. The dashboard was inspected but not changed:

| Setting | Required value |
| --- | --- |
| Git repository | Existing G3B repository; do not create another project |
| Root Directory | Empty / repository root (not `client`, not `server`) |
| Framework Preset | Other |
| Node.js Version | 24.x |
| Install Command override | `npm ci --prefix server && npm ci --prefix client --include=dev` |
| Build Command override | `npm run build --prefix client` |
| Output Directory override | `client/dist` |
| Domains | `g3beducation.com` and `www.g3beducation.com` on this same project |

The root `vercel.json` also pins install/build/output settings. The client needs
dev dependencies at build time even when `NODE_ENV=production`.

The final deploy configuration is [../vercel.json](../vercel.json). The function
is [../api/index.mjs](../api/index.mjs):

```js
import { createApp } from '../server/src/app.js';
import { validateEnv } from '../server/src/config/env.js';

validateEnv();
export default createApp({ renderSite: true });
```

It initializes once per warm instance. It imports no listener, migration, seed,
admin-creation or interval-scheduler entry point. `server/src/server.js` remains
the standalone local server. The PostgreSQL pool is shared at module scope,
capped at two connections by the recommended environment, and transaction clients
are released in `finally`; the function does not close the pool on each request.

API routing has no HTTP method filter. The existing 169 explicit route
declarations across public, health, auth, admin, student and cron routers are
retained. CMS-generated admin collection routes are retained too. API and upload
paths reach Express before filesystem handling. Static assets use Vercel hosting;
the final page fallback reaches Express to preserve published CMS metadata,
redirects, sitemap/robots generation, private noindex and real public 404s.
`SERVE_CLIENT=false` remains set; the function's explicit `renderSite` option
retains HTML rendering, with `client/dist` included in the function bundle.

## Production environment variables

Set these in the same project's **Production** environment. Preview deployments
need their own nonproduction database/storage and explicitly allowed origins;
production credentials should not be casually copied into Preview.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGINS` | `https://g3beducation.com,https://www.g3beducation.com` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` |
| `PUBLIC_SITE_URL` | `https://g3beducation.com` |
| `SERVE_CLIENT` | `false` |
| `DB_SSL` | `true` |
| `DB_CONNECTION_LIMIT` | `2` |
| `DB_SSL_CA` | Full PEM CA from the verified `server/.env` value / Supabase Database SSL settings; paste decoded PEM, or literal `\n` between lines |
| `DB_SSL_CA_FILE` | Unset / empty; no `D:/...` path |
| `SUPABASE_DB_URL` | Private: exact URI from Supabase Dashboard > Connect > Transaction pooler for this existing database |
| `DATABASE_URL` | Unset if using `SUPABASE_DB_URL`; when present it takes precedence and must point to the same intended PostgreSQL database |
| `JWT_SECRET` | Existing private strong secret, at least 32 characters; keep the current value |
| `JWT_EXPIRES_IN` | Preserve existing configured value |
| `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Preserve existing private administrator values; these do not reset existing database users |
| `ADMIN_ROUTE` | Preserve the existing route; match public `VITE_ADMIN_ROUTE` if set |
| `SUPABASE_URL` | Existing project's HTTPS API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Private backend Storage key; existing `SUPABASE_SECRET_KEY` alias is supported |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key; `SUPABASE_ANON_KEY` alias supported |
| `SUPABASE_MEDIA_BUCKET` | `g3b-media` |
| `SUPABASE_PRIVATE_BUCKET` | `g3b-private` |
| `UPLOAD_STORAGE_PROVIDER` | `supabase` after provider credentials/buckets are configured; Vercel runtime selects Supabase automatically |
| `UPLOAD_DIR` | `uploads` |
| `ASSESSMENT_REPORTS_DIR` | `private/assessment-reports` |
| `MAX_UPLOAD_MB` | Preserve existing `5` limit unless deliberately changed |
| `CRON_SECRET` | Private, at least 32 random characters, configured manually; protects scheduled YouTube refresh |
| `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` | Private, actual SMTP provider configuration; local values are currently empty |
| `MAIL_PORT` | Provider port, normally `587` for STARTTLS or `465` for implicit TLS |
| `MAIL_SECURE` | `false` for port 587 / `true` for port 465, according to provider |
| `MAIL_REQUIRE_TLS` | `true` |
| `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Preserve approved sender and recipient; provider must authorize sender |
| `VITE_API_URL` | Unset / empty |
| `VITE_ADMIN_ROUTE` | Existing public admin UI route if customized; never a credential |
| `YOUTUBE_API_KEY`, `YOUTUBE_SHORTS_PLAYLIST_ID` | Preserve private backend values if used |
| `YOUTUBE_AUTO_SYNC` | Existing desired value, normally `true` |
| `ALLOW_SUPABASE_SCHEMA_CREATE` | Unset or `false`; never enable as part of deployment |

Retain existing rate-limit, YouTube paging/timeout, and other feature-specific
settings. The runtime does not need `PORT` on Vercel. Legacy `DB_HOST/DB_PORT/...`
are unnecessary with a complete Supabase URL. No private key, password, JWT secret,
or connection URI belongs in any `VITE_*` variable.

The current dashboard lists Supabase DB/API/publishable/secret keys, auth/admin,
mail and other settings as **Secret**; their values cannot be pulled for
inspection. The inspected list did not contain `DB_SSL`, `DB_SSL_CA`, or
`CRON_SECRET`. Configure those before deploying. Presence of a secret name does
not verify that its value is correct. Vercel's local pull wrote `[SENSITIVE]`
placeholders into ignored `.vercel/.env.production.local`; these are not usable
runtime credentials and were not copied into `server/.env`.

`server/.env` now has the eight requested production settings, a two-connection
pool limit and the verified CA in PEM form. Existing private values and the
existing local upload provider setting were preserved. Production cookies and
origins make that file unsuitable for ordinary HTTP localhost login; use explicit
development environment overrides when running locally.

## Database and certificates

The existing driver is `pg`, not a MySQL runtime driver. Its PostgreSQL adapter,
SQL translation, schema and queries are preserved. `mysql2` remains available to
the existing maintenance/migration scripts; none were run.

The local Supabase URL already selects the shared transaction pooler on port
6543. Copy the exact URL from the dashboard; do not invent the project host/user,
change database, or replace it with a direct/session URL. Passwords in URIs must
be correctly URL encoded. Queries are unnamed, avoiding transaction-pooler named
prepared-statement issues. Connection counts multiply across warm instances, so
the upstream Supabase pool size must still suit the project load.

Read-only TLS probes established:

- System trust alone failed with `SELF_SIGNED_CERT_IN_CHAIN` on this connection.
- The existing certificate parses as a CA, is within its validity period
  (expires April 2031), and passed verified TLS plus `SELECT 1`.
- Conversion of that certificate to inline PEM in `server/.env` also passed
  verified TLS plus `SELECT 1`.

Therefore this deployment needs that CA via `DB_SSL_CA`. The certificate file was
not deleted or committed into the deployment. `rejectUnauthorized: true`, hostname
verification and TLS 1.2 minimum remain enabled. URL SSL parameters cannot override
that policy. Local files use `DB_SSL_CA_FILE` only if explicitly configured;
the inline PEM takes priority and avoids machine-specific paths.

## Upload and feature audit

Existing upload flows:

| Flow | Persistent destination with Supabase configured |
| --- | --- |
| CMS content images / media library / optimized variants | Public `g3b-media`, `content/` and `optimized/` |
| Gallery photos, bulk photos, videos and custom thumbnails | Public `g3b-media`, `gallery/` |
| Student assessment reports | Private `g3b-private`, `reports/<assignment>/` |
| Learning attachments and student submission staging | Private bucket `learning/` / `submissions/`; existing final PDF bytes remain stored in PostgreSQL |
| Existing local uploads/reports | Unchanged; must be inventoried and migrated explicitly before cutover |

The browser already uses backend-issued signed upload URLs for large files.
Legacy multipart routes are now also adapted to persist request-created files to
the configured cloud bucket before calling the existing controller finalizer;
they no longer save temporary Vercel paths as permanent records. Provider failures
return errors. Local development can still use local disk storage. Private report
download authorization, student ownership, admin role checks and CSRF are retained.

No cloud migration was executed. Local inspection found two existing files under
`server/uploads` and `server/private`; remote files/DB references may include more.
Before cutover, manually configure/verify Storage credentials, a public media
bucket and a private reports bucket, then inventory all database file references,
copy originals and variants, verify checksums/download permissions, and approve
reference updates. Do not expose private PDFs through a public bucket or simply
rename all existing database paths. Keep originals until verification completes.
Existing `/uploads/...` and Windows filesystem report paths will not become
available on Vercel automatically.

Set bucket file-size/MIME restrictions to match each flow. Video uploads up to
100 MB require a Supabase plan/bucket limit that permits that size. Vercel's
function request/response payload limit still applies to legacy multipart uploads
and proxied downloads; use direct signed uploads for larger files. Large private
PDF downloads near/above that platform limit need a separately verified signed
download flow. No claim is made that those provider-dependent flows were tested.

No Cloudinary integration is configured or claimed. Supabase Storage code is
present and adapter behavior is tested with mocks; live bucket uploads, provider
policies, image processing, media rename/delete and migration remain unverified.

SMTP delivery uses certificate verification and awaits sends during requests.
Enquiries are persisted before notifications; delivery failures remain queued.
Local SMTP settings are empty. Partner enquiries retain their existing behavior
(database save, no newly invented email workflow). Newsletter and password-reset
mail paths are preserved. Live sends and notification retries were not executed.

Admin JWT/refresh sessions, student opaque sessions, HttpOnly/Secure/SameSite
cookies, CSRF guards and server authorization are preserved. Anonymous access and
invalid-input checks pass. Actual login, session persistence, enquiry/subscriber
writes, assignment/report persistence and production browser cookies still need
an isolated test database or an explicitly approved production smoke test.

The protected YouTube cron is retained at 02:00 UTC / 07:30 IST daily. It awaits
the refresh service rather than creating a permanent timer. Deployment timeout is
300 seconds; long catalog synchronization may require more than one invocation.
Existing rate limiters remain per-instance in memory, so their limits are not a
global distributed guarantee across Vercel instances.

## Files changed in this task

The workspace already contained many uncommitted Storage/cron/UI changes. They
were retained. This list records this task's edits, not authorship of all Git diffs:

| File | Reason |
| --- | --- |
| `vercel.json` | Modern single-project install/build/output, one Node function, ordered API/site/static routing and cron |
| `api/index.mjs` | Initialize/export Express once without listener or startup side effects |
| `client/vercel.json`, `server/vercel.json` | Neutralize obsolete nested deployment architectures; remove `builds/functions` conflict |
| `package.json` | Node 24 runtime; frontend-only `vercel-build` without repeated explicit dependency installation |
| `package-lock.json` | Root dependency lock generated by the Vercel local builder |
| `.vercelignore` | Exclude backups/QA data in addition to existing secret/local-file exclusions |
| `server/src/app.js` | Opt-in serverless site rendering preserves CMS SEO, redirects and site files |
| `server/src/config/db.js` | Conservative idle timeout, serverless idle exit, sanitized idle pool error handler |
| `server/src/config/postgres.js` | Accept inline CA PEM with strict verification; prioritize it over local paths |
| `server/src/middleware/upload.js` | Preserve legacy multipart routes using durable cloud finalization |
| `server/src/middleware/persistUpload.js` | Persist request-created temp files before finalization, clean temp files, propagate cloud failures |
| `server/.env` (ignored) | Requested production settings, pool limit, inline verified CA; preserve private values |
| `client/.env` (ignored) | Remove localhost API origin; use same-origin requests |
| `server/.env.example` | Vercel pooler guidance, conservative pool size, inline CA option |
| `server/tests/postgres.test.js` | Verify inline CA precedence and retained TLS verification |
| `server/tests/vercel.test.js` | Verify API methods/routing, auth guards, validation, server HTML/site files/private noindex |
| `server/tests/persistUpload.test.js` | Mocked public/private/bulk/local upload behavior and provider failure handling |
| `README.md` | Replace obsolete two-project instructions; point here; correct Node runtime |
| `docs/VERCEL_PRODUCTION.md` | Audit, exact dashboard settings, limitations and validation/deployment commands |

Ignored `.vercel/` also contains fetched project metadata, secret placeholders and
local build artifacts. Dashboard settings were restored in local metadata after
temporary build overrides; the remote dashboard still needs the root change.

## PowerShell commands

Use Node 24.x. Validation does not deploy:

```powershell
Set-Location D:\G3b
npm ci --prefix server --include=dev
npm ci --prefix client --include=dev
npm run lint --prefix client
npm test --prefix client
npm run build --prefix client

# Pure/mocked deployment tests; these files never connect to the real database.
npm test --prefix server -- tests/vercel.test.js tests/persistUpload.test.js
```

For the complete backend suite without any production database access, use a
fresh PowerShell window and override the database target BEFORE starting Node:

```powershell
Set-Location D:\G3b
$env:NODE_ENV = 'test'
$env:DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/g3b_test'
$env:SUPABASE_DB_URL = $env:DATABASE_URL
$env:DB_SSL = 'false' # unreachable local test target only
$env:DB_SSL_CA_FILE = ''
$env:DB_SSL_CA = ''
$env:COOKIE_SECURE = 'false'
$env:SERVE_CLIENT = 'false'
npm test --prefix server
# DB-dependent tests skip or fail because there is deliberately no test database.
# To verify persistence, supply an isolated test database, never production.
```

To verify mail connectivity after manually adding real local SMTP credentials,
`npm run verify:mail --prefix server` performs SMTP verification without sending.

After fixing the dashboard root/environment and completing storage migration
and verification, use a fresh PowerShell window:

```powershell
Set-Location D:\G3b
vercel project inspect g3-b-clp1
vercel env ls --environment production
vercel pull --yes --environment production
# Secret values may be placeholders locally. Never deploy a prebuilt artifact
# containing placeholders as if it had validated runtime credentials.
# NODE_ENV was also stored as a Secret, so restore this public build setting:
$localBuildEnvPath = (Resolve-Path '.vercel/.env.production.local').Path
$localBuildEnv = Get-Content -LiteralPath $localBuildEnvPath -Raw
$localBuildEnv = [regex]::Replace($localBuildEnv, '(?m)^NODE_ENV=.*$', 'NODE_ENV=production')
[System.IO.File]::WriteAllText($localBuildEnvPath, $localBuildEnv)
$env:NODE_ENV = 'production'
vercel build --prod --standalone

# Deployment: run manually only when ready. Not run by this task.
vercel --prod

# Read-only post-deploy health check (run after the manual deployment):
Invoke-RestMethod https://g3beducation.com/api/health
Invoke-WebRequest https://g3beducation.com/services
Invoke-WebRequest https://g3beducation.com/sitemap.xml
```

Do not run migrations, `db:setup`, seeding or `create-admin` as a deployment step.

## Validation results

Results are updated below after final checks. A build pass proves packaging, not
that private dashboard credentials, buckets, live SMTP or browser sessions work.

- Frontend production build: passed; output `client/dist`.
- Frontend lint: passed, zero errors and 41 existing warnings.
- Frontend tests: 56 passed, zero failures.
- Official Vercel schema validation: root and both nested configurations passed.
- Initial local `vercel build --prod`: passed with temporary local settings for
  the proposed root. The generated function runtime is `nodejs24.x`.
- Standalone Vercel build: passed with `NODE_ENV=production`; function includes
  `client/dist/index.html` and the upload adapter. An artifact smoke test passed
  unknown API JSON 404 and student page HTML/noindex with an unreachable test DB.
  Artifact inspection revealed local dotenv tracing; a function-level
  `excludeFiles: "**/.env*"` was added to prevent bundling environment files.
- Final standalone rebuild after that exclusion: passed. Recursive artifact
  inspection found zero `.env*` files and no local CA file; bundled HTML and the
  upload adapter were present. Homepage routing precedes filesystem handling.
  Final packaged API JSON 404 and private student HTML/noindex smoke checks passed.
- Local CLI/smoke execution used the installed Node 25.2.1; the generated Vercel
  function targets Node 24.x. A deployed Node 24 runtime smoke test was not run.
- JSON parsing: 15 source/config JSON files passed (dependencies, generated
  artifacts, backups and private deployment metadata excluded).
- JavaScript syntax: 122 backend/entry files passed at the initial syntax check.
- Read-only production database probes: verified CA TLS/hostname checks and
  `SELECT 1` passed, including inline PEM; no writes.
- New targeted tests: 11 passed (routing/auth/site rendering, upload adapter,
  and PostgreSQL TLS tests).
- Final full backend run against unreachable local test DB: 67 passed,
  38 skipped, 5 failed. All five failures are existing public media tests that
  require reachable data but do not skip on database unavailability.
- Not run: production writes, full credentialed login/session tests, live
  uploads/migrations/SMTP sends, production deployment, or production browser QA.

Dependency installation reported existing server dependency audit findings
(3 moderate, 2 high, 2 critical) and 3 low frontend findings. No automatic
dependency upgrades or `npm audit fix --force` were performed in this minimal
deployment fix; review the advisories separately before cutover.

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).
