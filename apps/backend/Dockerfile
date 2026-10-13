# Backend image for the API, the worker, and the migration job (ADR-0052).
# Build from the repository root:
#   docker build -f apps/backend/Dockerfile --build-arg RELEASE_ID=<commit> .

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
COPY --from=build --chown=node:node /out ./
# Readiness and every log line report the commit this image was built from
# (ADR-0080, ADR-0081).
ARG RELEASE_ID=unknown
ENV RELEASE_ID=${RELEASE_ID}
USER node
EXPOSE 3100
# The worker runs `node dist/src/worker-main.js` and the migration job
# `node_modules/.bin/prisma migrate deploy` from this same image.
CMD ["node", "dist/src/main.js"]
