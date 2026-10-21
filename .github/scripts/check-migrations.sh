#!/usr/bin/env bash
# EXT-019: fail when apps/backend/prisma/migrations no longer produce the
# schema in apps/backend/prisma/models. Applies every migration to the empty
# database DATABASE_URL names, then diffs that database against the schema.
# The diff is never empty: ten composite foreign keys live only in raw
# migration SQL (apps/backend/prisma/known-drift.sql, each kept on purpose
# because Prisma cannot model them), so the check compares the diff with
# that file instead of asking for an empty one. Any other statement fails.
set -euo pipefail

cd "$(dirname "$0")/../../apps/backend"

pnpm exec prisma validate
pnpm exec prisma migrate deploy

statements() {
  grep -v -e '^--' -e '^$' "$1"
}

actual="$(mktemp)"
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --script > "$actual"

if diff -u <(statements prisma/known-drift.sql) <(statements "$actual"); then
  echo "the migrations produce the schema (only the known drift remains)"
else
  echo "::error::the migrations and the Prisma schema differ beyond prisma/known-drift.sql; add a migration, or update that file on purpose" >&2
  exit 1
fi
