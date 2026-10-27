# Supabase PostgreSQL migration runbook

## Current verification status — 2026-10-27

The October 24 report at `server/migration-reports/supabase-migration-1792848165500.json` records matching row counts for 53 imported tables. This is historical evidence, not a fresh source comparison or proof of field-level equality. Do not rerun the importer against that populated project.

The current secure verification attempt fails with `SELF_SIGNED_CERT_IN_CHAIN`. Certificate checking is now enabled for both runtime and migration connections. Download the server root certificate from Supabase **Database Settings → SSL Configuration** and set an absolute `DB_SSL_CA_FILE` path in private `server/.env`. Do not disable certificate checking. Official guidance: https://supabase.com/docs/guides/platform/ssl-enforcement.

The current environment has `SUPABASE_DB_URL` configured, but explicit `SOURCE_DB_*` variables are absent. The verifier intentionally does not interpret runtime PostgreSQL `DB_*` settings as MySQL credentials. Until source access is restored, it can audit destination counts, validated constraints, RLS, browser grants and identity sequences but returns a nonzero exit status because source equivalence remains unverified.

```dotenv
SUPABASE_DB_URL=postgresql://<DB_USER>:<URL_ENCODED_PASSWORD>@<DB_HOST>:<DB_PORT>/postgres
DB_SSL=true
DB_SSL_CA_FILE=C:/secure/path/prod-supabase.cer
SOURCE_DB_HOST=<MYSQL_HOST>
SOURCE_DB_PORT=3306
SOURCE_DB_NAME=<MYSQL_DATABASE>
SOURCE_DB_USER=<READ_ONLY_MYSQL_USER>
SOURCE_DB_PASSWORD=<MYSQL_PASSWORD>
SOURCE_DB_SSL=true
ALLOW_SUPABASE_SCHEMA_CREATE=false
```

After configuring the certificate, run `npm run verify:supabase --prefix server`. This is read-only. Keep its generated report locally; it includes per-table counts and security metadata. A current destination-only result is not a successful migration verification.

Only for a **new, empty, independently confirmed destination**: verify a fresh source backup by restoring it to a disposable MySQL instance, set `SOURCE_BACKUP_FILE` to its absolute path and explicitly enable `ALLOW_SUPABASE_SCHEMA_CREATE=true` for the import command. The importer checks the file contains schema SQL and records its SHA-256; that check does not replace a restore test. It uses a consistent read-only source snapshot, refuses unsupported custom triggers/routines/events/generated columns, preserves the source, checks counts before committing, and distinguishes failed post-commit verification from rollback. Preserve all existing backups.

`pg_015_case_insensitive_login.sql` adds case-insensitive unique email indexes for administrator and student identities. Apply through `npm run migrate --prefix server` after the secure destination check. Duplicate case-folded emails deliberately stop that migration; resolve ownership with the business before changing any record. No application migration was applied during this continuation.

Further required checks: full record/key comparison, timestamp precision/timezone review, source collations, all source checks/views/triggers, source backup restore, authentication and business workflows. The general-purpose importer still requires review for advanced MySQL types, prefix/expression/full-text indexes, generated defaults and very large tables. It must not silently be treated as certified for an arbitrary schema.

The source was verified as MySQL 8 (`mysql2`, InnoDB, MySQL enums and `AUTO_INCREMENT`). The application continues to use its Express API and existing JWT/cookie authentication; browsers do not receive a database password or service-role key.

## Safety and backup

A verified, transaction-consistent source dump was created locally under `backups/`. That directory is ignored by Git because it contains production data. Keep an encrypted copy outside the repository before cutover. The migration script never deletes or modifies MySQL and refuses to run unless the Supabase `public` schema has no tables.

## Required private variables

Copy `server/.env.example` to `server/.env` in a secure environment. Set `SOURCE_DB_*` to the existing read-capable MySQL account and set `SUPABASE_DB_URL` to the Supabase PostgreSQL connection string from **Project Settings → Database**. Prefer the transaction-pooler URL for Railway. The public project URL and publishable browser key cannot migrate a database.

For the one-time import only, set `ALLOW_SUPABASE_SCHEMA_CREATE=true`, then run:

```sh
cd server
npm run migrate:supabase
npm run verify:supabase
```

The importer creates all tables, columns, identity sequences, defaults, primary/unique/foreign keys, checks, indexes, update-timestamp triggers and records. It preserves explicit IDs, resets every identity to the next safe value, enables RLS on every migrated table, and creates no anonymous/authenticated policies. This intentionally blocks Supabase Data API access while the backend remains the authorization boundary. It commits schema/data as one transaction and writes a count report under the ignored `server/migration-reports/` directory.

After successful verification, set the backend runtime `DATABASE_URL` to the same Supabase connection (normally the transaction pooler), remove `SOURCE_DB_*` and `ALLOW_SUPABASE_SCHEMA_CREATE`, and redeploy. Do not put `DATABASE_URL`, the database password, JWT secret, or a Supabase service-role key in Vite/Vercel variables.

## Railway runtime variables

Required: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGINS`, `PUBLIC_SITE_URL`, `COOKIE_SECURE=true`, and the existing mail/admin/upload variables needed by the deployment. Keep `DB_CONNECTION_LIMIT` conservative (for example `10`). The start command remains `npm start`; no schema mutation or seeding runs during startup.

## Cutover verification

Run the count verifier again immediately before switching traffic. Then exercise health, admin/student login and refresh, enquiry CRUD, subscribers, CMS content/media, study-abroad saved items, assessments and YouTube registry operations. Keep MySQL read-only and available for rollback until these checks and production logs are clean. Never rerun the importer against a populated Supabase schema.

## Baseline captured on 2026-10-24

The source contained 53 tables. Non-empty operational tables included: `audit_logs` 52, `auth_sessions` 80, `content_blocks` 11, `destination_points` 30, `destinations` 6, `enquiries` 3, `enquiry_notifications` 6, `media_categories` 12, `media_items` 16, `partner_enquiries` 11, `services` 6, `site_settings` 24, `testimonials` 6, `users` 1, `video_testimonials` 2 and `youtube_short_registry` 5. The migration report is the authoritative destination comparison.
