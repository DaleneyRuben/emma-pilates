# Pilates

Pilates is a TypeScript pnpm workspace containing the mobile app, admin web, and backend API.

## Applications

- `apps/mobile` — Expo and React Native
- `apps/admin-web` — Vite and React
- `apps/backend` — NestJS

## Local setup

Install dependencies from the repository root:

```sh
pnpm install
```

The backend uses the locally installed PostgreSQL server. Create its development
database once, then copy the example configuration:

```sh
createdb emma_pilates
cp apps/backend/.env.example apps/backend/.env
```

No Docker container or hosted database is required for local development.

Start one application:

```sh
pnpm dev:mobile
pnpm dev:admin
pnpm dev:backend
```

Run the workspace checks:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Validate the Prisma schema or regenerate its ignored client output:

```sh
pnpm --filter @pilates/backend prisma:validate
pnpm --filter @pilates/backend prisma:generate
```

The backend end-to-end smoke test is available separately:

```sh
pnpm --filter @pilates/backend test:e2e
```

Architecture decisions and the remaining work queue live in [`docs/architecture/README.md`](./docs/architecture/README.md).
