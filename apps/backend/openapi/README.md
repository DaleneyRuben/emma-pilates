# OpenAPI contract

- `openapi.json` is generated from the NestJS controllers (`pnpm generate:api`)
  and committed; `pnpm check:api` fails when it or the generated
  `packages/api-contracts` client is stale.
- `mobile-baseline.json` is the contract the **previous** published mobile
  release was built against (ADR-0016). `src/openapi/mobile-compatibility.spec.ts`
  runs in the backend unit suite and fails when `openapi.json` removes or
  changes anything that release relies on: removed operations or success
  statuses; response fields removed, made optional, made nullable, or retyped;
  new required parameters or body fields; request fields, parameters, or
  enum values removed. A new response enum value is reported as a warning only.
  Run it alone with `pnpm check:api-compat`.
- `compatibility-policy.json` names the baseline and the operations used only by
  the admin web, which moves in lockstep with the backend and is exempt.

## Moving the baseline

No mobile release is published yet, so the baseline is the contract committed
on 2026-09-23. When a new mobile release is published to the stores:

1. The release that is now **previous** defines the baseline. Copy the
   `openapi.json` from that release's commit (for example
   `git show <release-tag>:apps/backend/openapi/openapi.json > mobile-baseline.json`).
2. Update `baseline.release` in `compatibility-policy.json` with the release
   tag and date.
3. Only then may changes that break the older, now unsupported release land.

Adding an admin-web-only operation to the exemptions is allowed only when no
mobile app calls it.
