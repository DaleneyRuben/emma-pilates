# BKM-014 — Guest Pass migration review

Status: **written 2026-10-23 as `20261023220000_guest_passes`**.
Applying it to a shared, staging, or production database still needs the
owner's approval. Until then it is applied only to disposable databases this
item creates: `pilates_bkm014_migration_review` (the diff review),
`pilates_test_bkm014_admin` (the integration admin database), and
`pilates_bkm014_dev` (the API smoke). All three are dropped when the item
finishes.

## Why a table

Courtesy Access (`prisma-courtesy-access.ts`) does not fit. It is the hidden
16-class «Acceso de prueba» Plan an Administrator grants, and it refuses a
Client who already holds a Subscription. A Guest Pass is one courtesy class,
granted by registration with a Client's Referral Code, and it must not count
as a first Plan. Reusing that grant would hand a friend sixteen classes and
block her from buying.

The smallest honest path is a `GuestPass` row that links the host, the
friend, and the Booking, plus a hidden one-class courtesy Subscription whose
extra class is an `AllowanceAdjustment` of reason `courtesy` (BKM-008). The
gift decision already declines a courtesy Payment, so the pass never takes a
founder place and never triggers the gift class. The host's reward reuses
`recordAllowanceAdjustment` with reason `invite_converted`.

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `booking.guest_passes` | new table | One invitation: host, friend, the courtesy Subscription, the Booking once she spends it, and the host's reward once it lands |
| `guest_passes_friend_live_key` | partial unique on `friend_client_id` where `deleted_at` is null | A second Guest Pass for the same friend is refused (ADR-0086) |
| `guest_passes_booking_live_key` | partial unique on `booking_id` where not null and not removed | One Booking spends one pass |
| `guest_passes_one_reward_per_host_per_friend` | partial unique on `(host_client_id, friend_client_id)` where `rewarded_at` is not null | A retried confirmation grants the host nothing more |
| foreign keys | `ON DELETE RESTRICT` to `clients`, `subscriptions`, `bookings`, `subscriptions` | ADR-0086: nothing is removed by a cascade |

No column changes on existing tables. Credit stays as PAY-005 leaves it:
deprecated zeros, written by the confirmation that already exists, removed
when #157 merges.

## Rollout

Expand-only (ADR-0078). The previous release never reads the table. Applied
only to `pilates_test_bkm014_*` and `pilates_bkm014_dev`, both dropped when
the item finishes. Needs owner approval before any shared, staging, or
production database.
