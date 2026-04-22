#!/usr/bin/env bash
set -euo pipefail

# Creates or recreates apocryph_test database for E2E and integration tests.
# Uses DATABASE_URL_TEST if set, falls back to postgres://postgres:postgres@localhost:5432/apocryph_test.

DB_URL="${DATABASE_URL_TEST:-postgresql://postgres:postgres@localhost:5432/apocryph_test}"

# Extract db name from URL (last path segment, no query)
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^/?]+).*|\1|')
# URL without database (for connecting to postgres admin db)
ADMIN_URL=$(echo "$DB_URL" | sed -E 's|(.*)/[^/?]+|\1/postgres|')

echo "[setup-test-db] Resetting database: $DB_NAME"

psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
psql "$ADMIN_URL" -c "CREATE DATABASE \"$DB_NAME\";"

echo "[setup-test-db] Applying schema.sql"
psql "$DB_URL" -f schema.sql

echo "[setup-test-db] Applying seed-dev.sql"
psql "$DB_URL" -f seed-dev.sql

echo "[setup-test-db] Done."
