# G3B audit and implementation continuation — 2026-10-27

## Status

Application improvements have been implemented and locally checked. The full definition of done is **not reached**: explicit current MySQL source settings are missing, and complete integrity/CMS/business-workflow verification remains pending. Secure Supabase connectivity was restored using the provided certificate as recorded below. No source data or backup was deleted, no importer was rerun, and no hosting configuration was changed.

## Certificate follow-up — verified 2026-10-27

The user supplied `server/prod-ca-2021.crt`. Inspection identified **Supabase Root 2021 CA**, valid through April 26, 2031. The private `server/.env` now sets `DB_SSL=true` and `DB_SSL_CA_FILE=D:/G3b/server/prod-ca-2021.crt`.

`node server/scripts/diagnose-database.js` confirmed that the pool and actual PostgreSQL client loaded the same certificate bytes, certificate/hostname verification remained enabled, TLS 1.3 negotiation succeeded, and a read-only query succeeded. The earlier missing trust anchor caused `SELF_SIGNED_CERT_IN_CHAIN`; the unrelated Downloads `ca.pem` did not validate this server.

All five previously failing public media GET endpoints were retested through Express and returned HTTP **200** with `success: true`: overview, paginated photos, category-filtered photos, paginated videos and categories. This checks the endpoints directly; the complete backend suite has not yet been rerun after this certificate correction.

The existing read-only verifier discovered **60 destination tables**, **42 foreign keys**, and **0 detected issues** in its current checks. Its exit status remains 1 because explicit `SOURCE_DB_*` settings are absent and source equivalence cannot be established. Report: `server/migration-reports/supabase-verification-1793104222840.json`. These results supersede the earlier connection-blocked destination counts below. Full record/index/constraint equivalence, authenticated workflows, CMS requirements and genuine email delivery still require completion. No importer or application migration was executed.

The repository had substantial existing modifications and untracked learning/CMS files when this continuation began. Those were preserved. This report distinguishes this continuation's changes from the broader working tree.

## Architecture and functionality inventory

| Area | Existing implementation | Evidence and limitation |
| --- | --- | --- |
| Public frontend | React 19, Vite 8, React Router, component CSS, shared header/footer, CMS-backed homepage | Production build succeeds; source and rendered public pages inspected |
| Services | Ten data-driven service detail routes, audience, offerings, process, outcomes, FAQs, related links, booking modal | Nine footer-linked pages rendered and navigated; India admissions rendered separately |
| API | Express, validators, middleware, repositories, PostgreSQL `pg` pool | Syntax/startup checked; database-dependent API calls currently return 503 because of CA validation |
| Administrator access | JWT/cookies, CSRF, revocable sessions, role middleware and route gates | Baseline integration run exercised these flows; final secure DB rerun is pending |
| Student portal | Separate student sessions/CSRF, ownership filtering, enquiries, shortlists, assessments | Frontend tests pass; current live DB verification blocked |
| Learning portal | Existing assignment, target, private PDF, submission, feedback and notification implementation | Preserved existing work; baseline backend run exercised ownership protection, final rerun blocked |
| CRM/forms | Public enquiries/counselling, partner enquiries, newsletter guide, filtering/export | Client validation and duplicate-submit tests pass; persistence must be rechecked after CA setup |
| CMS/SEO | Published pages/sections, drafts/revisions, SEO manager, sitemap/robots and server metadata renderer | Managed page rendering preserved, unsafe protocol-relative CTA paths rejected, 404 is noindex |
| Media | Authorized uploads/gallery, local originals, sharp variants, private assessment/learning PDFs, YouTube registry | Filename/MIME consistency and inert static media responses tightened; full upload lifecycle needs DB verification |
| Legacy theme | `g3b-wordpress-theme/` | Left unchanged; active application remains React/Express |

## Problems corrected

- Certificate validation had been disabled in PostgreSQL runtime and migration scripts. Shared configuration now verifies certificates and supports `DB_SSL_CA_FILE` without exposing credentials.
- The old count verifier did not inspect constraints, identity sequences, RLS or grants and could mistake runtime settings for MySQL source settings. It now writes a read-only report, records missing source verification, checks destination-only tables and returns nonzero for incomplete verification.
- Import failures after COMMIT could incorrectly report a rollback. Transaction state is now tracked and committed destinations are explicitly preserved for investigation.
- Import preparation now requires a backup file, records its streamed SHA-256, uses a repeatable source snapshot and UTC session, preserves large integers as strings, widens unsigned integer types, checks counts before commit, and refuses several unsupported schema objects. Source data is read-only. RLS and browser-role table grant revocation are included for new imports.
- MySQL's case-insensitive email behavior was lost on PostgreSQL. Lookups now use `LOWER(email)` and a new application migration prepares unique case-folded indexes without rewriting records.
- The initial application bundle included dashboard/catalogue/gallery tools. Lazy routes reduced the main bundle from roughly 711 kB to roughly 470 kB before compression; the build's 500 kB chunk warning is gone.
- The client start command used POSIX shell expansion and failed on Windows. A small Node launcher now reads and validates `PORT`; `npm start --prefix client` was observed serving on port 8080.
- Bundled `/images`, logos, fonts and resource URLs were incorrectly redirected to a separate API host. They now remain frontend assets. Uploaded media retains API-origin resolution.
- Homepage service details linked to numeric anchors without sections. Existing known services now link to their relevant detail routes; unknown services lead to the overview.
- Service image alt text falsely described students/campuses where the files showed city views. Existing assets were visually inspected and descriptions corrected. Detail pages now include a sized, lazy-loaded image with a missing-image fallback.
- Service heroes now use pale backgrounds, navy text and contrasting CTAs. Existing logos, navigation, business workflows and comprehensive copy were retained.
- Homepage fallback content no longer shows unverified success counters, fee/work-right figures, credentials or testimonials. CMS records remain intact. Google rating cards and testimonial stars no longer default to invented five-star scores.
- Media uploads reject HTML/executable extensions disguised by image MIME types. Public media responses use `nosniff` and a sandboxed content security policy, including SVGs. Existing supported image/video formats remain available.
- Several database tests silently returned and appeared to pass when dependencies were unavailable. Those cases now explicitly skip. The frontend interaction fixture now handles SEO requests separately from submitted form mutations.

## Service-page review

All ten pages retain service-specific introductions, audiences, offerings, processes, outcomes, FAQs, existing booking CTAs and related links. Shared daylight styling and media handling apply to every route.

| Route suffix under `/services/` | Content reviewed |
| --- | --- |
| career-counselling | Subject/course/career decisions, context session, pathway comparison and action plan; 7 FAQs |
| psychometric-assessment | Aptitude/interests/working style, guided interpretation and limitations; 6 FAQs; unverified appointment durations removed |
| profile-building | Academic planning, authentic projects, activities and records; 6 FAQs |
| study-abroad | Destination/course shortlist, requirements and preparation; 7 FAQs |
| admissions | Documents, statements, application portals and deadline planning; 7 FAQs |
| india-admissions | Indian institution selection, eligibility/application preparation; 3 FAQs |
| scholarships | Research, eligibility, evidence and remaining-cost planning; 6 FAQs |
| visa-guidance | Document organisation, official decision boundaries and preparation; 6 FAQs; fixed preparation window replaced with official-guidance check |
| pre-departure | Travel, housing research, documents, arrival and adjustment; 6 FAQs |
| english-test-preparation | Test choice, diagnosis, skill development and mock tasks; 6 FAQs; unsupported universal score range removed |

Existing testimonials, institutional claims, certifications, programme availability and asset licensing still require business-owner confirmation. No new partner relationship, photograph of G3B people, success rate, fee or guarantee was invented.

## Database evidence

- Historical local report: `server/migration-reports/supabase-migration-1792848165500.json`, dated October 24, reports **53 source and 53 imported tables** with matching per-table counts and no count warnings.
- That report establishes historical counts only. It does not prove current source/destination equivalence, field values, foreign-key definitions, date conversions, collation behavior or application workflows.
- Current secure verifier failed with `SELF_SIGNED_CERT_IN_CHAIN`; report: `server/migration-reports/supabase-verification-1793058136583.json`.
- Current source table count: **unverified**. Current destination table count: **unverified**. Discrepancies, missing records and aggregate totals: **unverified** until connections are available. Additional learning/footer tables may legitimately differ from the historical import after application migrations; do not infer corruption from total table count alone.
- Existing verified backup file was preserved. SHA-256 observed: `37542228EB72CDD2D6E0BBC60E4904C823E6D7CDD5D3F8AFB55B8845052A045C`. This continuation did not restore-test that dump or create a fresh source backup.
- Neither the updated importer nor `pg_015` was executed against the destination.

## Validation

- Frontend suite: **55/55 passed**, including the added asset-origin regression test. Focused API-client run: **13/13 passed**.
- Backend baseline: 71 reported passing, 5 skipped, plus an unexpected worker exit; not a passing suite. A focused rerun did not reproduce the worker exit.
- Subsequent focused backend run: **26 passed, 6 skipped** across API, utility, YouTube and TLS tests. The six skips were unavailable database-backed flows.
- New TLS and upload-extension tests: **4/4 passed**.
- Full secure backend rerun: **51 passed, 38 skipped, 5 failed (94 total)**. All five failures are public media endpoints returning **503 instead of 200**, caused by certificate validation. Other database-dependent tests skip. Machine-readable results: `docs/qa-output/backend-final.json`. Legacy early-return cases were corrected to skip before the final run.
- Backend startup: process listens successfully in development; database is unhealthy. Production startup correctly requires a working database.
- Frontend production build: succeeds. Main bundle approximately **470 kB**, roughly **127 kB gzip**; code-split routes emit separate chunks. This is bundle evidence, not a measured Core Web Vitals score.
- Lint: zero errors after changes; existing React-effect and Fast Refresh warnings remain (baseline 41 warnings).
- `node --check` on both migration scripts and the preview launcher: passes. `git diff --check`: passes apart from Git's line-ending notices.
- Rendered production preview: all ten service routes have one H1 and no horizontal overflow at the checked desktop width. Career service checked at **320, 375, 768, 1024, 1440 px** with no horizontal document overflow and no clipped footer link/text boxes. Booking CTA opens the real consultation modal with the service preselected. These are fallback/public rendering checks, not verified database persistence.
- The in-app browser crashed during an initial development-server check; a fresh production-preview tab recovered. No full automated accessibility audit, authenticated dashboard breakpoint matrix or Core Web Vitals measurement is claimed.
- Homepage breakpoint checks found a 320 px overflow from fixed-width process cards and horizontal FAQ label/question rows. The grid now permits a column narrower than 320 px, FAQ labels stack above questions, and collapsed answer regions remain valid ARIA targets. Recheck at 320 px: document scroll width **305 px** within the **320 px** viewport, no clipped FAQ text. Other tested homepage widths (375/768/1024/1440 px) showed no horizontal document overflow or clipped footer text.
- Browser recheck confirmed the service photo now loads from `/images/services-campus.jpg`, with `naturalWidth > 0`, rather than an invalid API-origin URL. Homepage fallback has one H1, no unverified success counters/rating card, no numeric service anchors, and local destination image URLs.
- A later PowerShell verification attempt hit a system `OutOfMemoryException`; no pass is claimed for that attempt. Temporary API/dev/preview servers were stopped. Previously completed syntax/build/lint checks and the final passing frontend test result remain the evidence above. `git diff --check` was repeated successfully with the lighter command shell.

## Files changed by this continuation

Created: `client/scripts/start-preview.js`; `server/src/config/postgres.js`; `server/src/db/migrations/pg_015_case_insensitive_login.sql`; `server/tests/postgres.test.js`; `server/tests/uploadSecurity.test.js`; this report.

Modified frontend: `client/package.json`, `client/src/App.jsx`, `client/src/api/client.js`, `client/src/components/About.jsx`, `Approach.jsx`, `Destinations.jsx`, `FaqSection.jsx`, `Reviews.jsx`, `Services.jsx`, `client/src/data/services.js`, `client/src/pages/Home.jsx`, `ManagedPage.jsx`, `NotFound.jsx`, `ServiceDetailPage.jsx`, `client/src/styles/service-detail.css`, `services.css`, `client/tests/api-client.test.mjs`, `public-interactions.test.mjs`.

Modified backend/documentation: `server/.env.example`, both `server/scripts/*supabase*.js` scripts, `server/src/app.js`, `server/src/config/db.js`, `env.js`, `server/src/middleware/errorHandler.js`, `upload.js`, `server/src/repositories/studentRepository.js`, `userRepository.js`, `server/tests/api.test.js`, `seo.test.js`, `partner.test.js`, `mediaGallery.test.js`, `docs/SUPABASE_MIGRATION.md`.

No existing application file, source record or backup was removed. Other files in `git status` predated this continuation and must not be attributed to it.

## Required remaining steps

1. Download the database's root CA certificate from Supabase Database Settings → SSL Configuration. Set `DB_SSL_CA_FILE` to its absolute path in private `server/.env`; keep `DB_SSL=true`. See the updated migration runbook for placeholder-only connection settings.
2. Configure explicit read-only `SOURCE_DB_*` credentials privately if a current source comparison is required. Do not paste passwords into chat or commit them.
3. Run `npm run verify:supabase --prefix server`. Investigate every table mismatch, disabled RLS, unvalidated constraint, sequence issue, policy or browser grant. Verify the runtime DB role is appropriately restricted.
4. Review pending application migrations, duplicate case-folded email identities, verification discrepancies and a recoverable destination backup with the owner. Do not apply migrations before that review. Do not rerun the base importer on the populated destination.
5. Complete record/key/date/aggregate comparisons and a backup restore test. Review MySQL collations and unsupported source objects explicitly before any future import.
6. Rerun both test suites and authenticate as administrator and two different students to verify ownership, CSRF, sessions, CMS publish/edit, enquiries, media, private PDFs, bookings, shortlists and learning workflows.
7. Business owner: confirm actual service formats, timings, credentials, fees, testimonials, institutional relationships, policy claims and rights to existing imagery. Publish reviewed privacy/terms content through the existing CMS and add its footer links; no legal text was invented.
8. Complete a full accessibility audit, authenticated mobile/tablet dashboard review and measured performance audit once database-backed content is reachable.

## Local commands (PowerShell from `D:\G3b`)

```powershell
npm run dev                    # API :5000 and frontend :5173
npm run build --prefix client
npm run lint --prefix client
npm test --prefix client
npm test --prefix server
npm run verify:supabase --prefix server
npm start --prefix client       # static preview :8080; PORT environment variable supported
```

Use `npm start --prefix server` for the API. To test Express serving the built SPA and crawler metadata locally, set `SERVE_CLIENT=true` in private server configuration after building, then start the server. SMTP is currently absent: notifications cannot be considered delivered. Preview alone does not verify form persistence or dynamic crawler metadata.

The existing CORS configuration permits development ports 5173/5174, but the production-preview origin `http://127.0.0.1:4173` was rejected during browser checks. If using a separate preview frontend for real API testing, add that **exact** origin (or the exact :8080 origin you use) to private `CLIENT_ORIGINS` and restart the API. Serving the built frontend from Express uses the same origin. The rendered preview checks above used public fallback content, not a working live database response.

## Latest continuation results — 27 October 2026

The database connection is healthy with the actual `server/prod-ca-2021.crt` loaded by the PostgreSQL client. Private configuration now sets `DB_SSL=true` and `DB_SSL_CA_FILE=D:/G3b/server/prod-ca-2021.crt`. Peer and hostname verification remain enabled. The earlier trust failure was caused by the missing matching CA; the unrelated Downloads CA did not validate this chain. All five tested public media endpoints return HTTP 200.

Final backend report: **93 passed, 0 failed, 5 skipped, 98 total** (`docs/qa-output/backend-connected-final.json`). The skips protect existing YouTube registry/cache data: those snapshot tests require a disposable database and were not counted as passes. Authenticated integration tests covered admin access, two distinct students, ownership restrictions, assignment submission/private PDF access, enquiries, and CMS create/publish/edit/image/SEO persistence. These are API integration results, not a complete authenticated browser review.

Frontend suite: **56 passed, 0 failed, 0 skipped**. Final production build and ESLint error check (`--quiet`) passed after correcting a missing assessment icon import. A fresh connected browser/mobile review of this final build remains outstanding.

Homepage filtering now excludes the retired partner statistic and newsletter CMS sections; the default guide no longer requires an email subscription. Tests cover CMS naming variants. Homepage process steps and FAQs use persistent database content. Admin SEO now supports JSON-LD and pending drafts, and a public route catalogue exposes pages that still need registration for editing. Managed pages support persistent sections, links, image replacement and SEO. **This does not establish that every field of every default page is editable: a complete field-by-field CMS review and remaining bindings are still required.**

Read-only destination verification inspected 60 tables and 42 foreign keys and reported zero detected destination issues. Report: `server/migration-reports/supabase-verification-1793104852991.json`. Current source comparison remains unverified because explicit `SOURCE_DB_HOST`, `SOURCE_DB_NAME`, `SOURCE_DB_USER`, and `SOURCE_DB_PASSWORD` are absent. Destination-only checks cannot prove source/destination records, constraints, indexes or policies match. Existing backup remains preserved; restoration has not been tested. No importer, migration or deployment was run.

SMTP verification is available through `npm run verify:mail --prefix server`. Transport requires verified TLS (STARTTLS by default for a non-implicit-TLS connection). Actual check reported configured=false, verified=false, messageSent=false because credentials are absent. Configure real `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_REQUIRE_TLS`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` and an authorized notification recipient privately before a delivery test. Verification alone does not send email.

Next safe commands from `D:\G3b`:

```powershell
npm run diagnose:db --prefix server
# Configure explicit read-only SOURCE_DB_* credentials before comparison:
npm run verify:supabase --prefix server
# Configure genuine SMTP credentials before connection verification:
npm run verify:mail --prefix server
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run dev
```

Overall task remains incomplete and must not be described as production-ready. Remaining gates are current source parity and backup review, complete CMS field coverage, final rendered/mobile and authenticated browser checks, safe execution of five isolated YouTube tests, and genuine email delivery with supplied credentials.
