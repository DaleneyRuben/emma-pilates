# Backend image for the API, the worker, and the migration job (ADR-0052).
# Build from the repository root:
#   docker build -f apps/backend/Dockerfile --build-arg RELEASE_ID=<commit> .
# Northflank passes NF_GIT_SHA instead, which RELEASE_ID defaults to.

FROM node:24-bookworm-slim AS base
# Prisma's schema engine needs OpenSSL for `prisma migrate deploy`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.19.0

FROM base AS build
WORKDIR /repo
# Every workspace manifest, so the frozen lockfile matches the workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-web/package.json apps/admin-web/
COPY apps/backend/package.json apps/backend/
COPY apps/client-mobile/package.json apps/client-mobile/
COPY apps/staff-mobile/package.json apps/staff-mobile/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/mobile-core/package.json packages/mobile-core/
COPY packages/studio-economics/package.json packages/studio-economics/
COPY packages/tooling/package.json packages/tooling/
RUN pnpm install --frozen-lockfile --filter @pilates/backend
COPY apps/backend apps/backend
# prisma.config.ts requires DATABASE_URL; generating never connects.
RUN DATABASE_URL=postgresql://build@localhost:1/unused \
  pnpm --filter @pilates/backend run prisma:generate \
  && pnpm --filter @pilates/backend run build
RUN pnpm --filter @pilates/backend deploy --prod --legacy /out \
  && cp -R apps/backend/dist /out/dist

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only the backup job (EXT-009) sets this, to the database's major version:
# Debian ships no pg_dump 18, so it comes from PostgreSQL's own repository.
# The API, worker, and migration images build with it empty and are unchanged.
ARG POSTGRESQL_CLIENT_MAJOR=
RUN if [ -n "$POSTGRESQL_CLIENT_MAJOR" ]; then \
    apt-get update \
    && apt-get install -y --no-install-recommends postgresql-common \
    && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
    && apt-get install -y --no-install-recommends \
      "postgresql-client-$POSTGRESQL_CLIENT_MAJOR" \
    && rm -rf /var/lib/apt/lists/*; \
  fi
COPY --from=build --chown=node:node /out ./
# Readiness and every log line report the commit this image was built from
# (ADR-0080, ADR-0081). Northflank passes the commit as NF_GIT_SHA.
ARG NF_GIT_SHA=unknown
ARG RELEASE_ID=${NF_GIT_SHA}
ENV RELEASE_ID=${RELEASE_ID}
USER node
EXPOSE 3100
# The worker runs `node dist/src/worker-main.js`, the migration job
# `node_modules/.bin/prisma migrate deploy`, and the backup job
# `node dist/src/database-backup-main.js` from this same image.
CMD ["node", "dist/src/main.js"]
