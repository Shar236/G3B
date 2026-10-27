-- Preserve case-insensitive email identities previously enforced by MySQL's
-- default collation. No records are rewritten or deleted. Existing collisions
-- deliberately stop this migration for an owner-reviewed resolution.
CREATE UNIQUE INDEX users_email_casefold_unique ON users (lower(email));
CREATE UNIQUE INDEX students_email_casefold_unique ON students (lower(email));
