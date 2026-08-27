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

The backend end-to-end smoke test is available separately:

```sh
pnpm --filter @pilates/backend test:e2e
```

Architecture decisions and the remaining work queue live in [`docs/architecture/README.md`](./docs/architecture/README.md).
