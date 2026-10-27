# Historical MySQL migrations

These files describe the source MySQL schema and are retained for audit history only. They are not executed by the PostgreSQL runtime.

Files named `pg_NNN_description.sql` are PostgreSQL application migrations. Run
`npm run migrate --prefix server` after the one-time import and before deploying
the corresponding application code. The runner applies each file once inside a
transaction and records it in `schema_migrations`.

For the one-time schema-and-data conversion, use `server/scripts/migrate-mysql-to-supabase.js`. It reads the source database metadata, emits equivalent PostgreSQL DDL directly inside a guarded transaction, copies all rows with explicit IDs, restores constraints/indexes/identity sequences, enables RLS, and verifies counts.
