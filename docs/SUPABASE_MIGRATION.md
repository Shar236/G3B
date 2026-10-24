# Supabase PostgreSQL migration runbook

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
