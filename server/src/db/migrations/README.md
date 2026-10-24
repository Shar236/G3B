# Historical MySQL migrations

These files describe the source MySQL schema and are retained for audit history only. They are not executed by the PostgreSQL runtime.

For the one-time schema-and-data conversion, use `server/scripts/migrate-mysql-to-supabase.js`. It reads the source database metadata, emits equivalent PostgreSQL DDL directly inside a guarded transaction, copies all rows with explicit IDs, restores constraints/indexes/identity sequences, enables RLS, and verifies counts.
