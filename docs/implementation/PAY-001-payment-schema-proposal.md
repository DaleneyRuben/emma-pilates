# PAY-001 — Payment, Purchase Intent, Credit, Referral, and receipt proposal

Status: **approved on 2026-09-11** — the proposed schema, lifecycle,
constraints, ownership boundaries, API direction, Bs 60 Referral reward, and
AW16 reporting behavior may be used to prepare PAY-002's exact Prisma and
generated-SQL migration review. This approval does not authorize creating,
modifying, or applying a migration or writing implementation code.

This is the implementation-ready design for PAY-001. It follows the accepted
[Booking & Membership language](../../booking/CONTEXT.md), especially Payment,
Subscription, Credit, and Referral; [manual QR payments](../../booking/docs/adr/0002-manual-qr-payments-for-v1.md);
and the existing upload, money, audit, authorization, idempotency, and
transaction decisions. This revision resolves the first review's lifecycle,
relation, integrity, and API gaps. It deliberately does not create a migration,
change a Prisma model or generated contract, or modify a design prompt or
generated `design/` artifact.

## Ownership and vocabulary

Payment, Purchase Intent, Subscription activation, Credit, Referral, and their
business rules are owned by **Booking & Membership** and live in the `booking`
PostgreSQL schema. `system.ImageAsset`, the proposed `system.ImageVariant`,
`system.IdempotencyRecord`, `system.AuditRecord`, and notifications remain
owned by System Identity.

Booking & Membership uses transaction-aware public System Identity ports for
image attachment, idempotency, audit, and notification work. The application
composition layer supplies one Prisma transaction capability to those ports so
the owning modules retain their boundaries while their PostgreSQL writes commit
atomically. Booking code must not import System Identity repositories or use
Prisma as permission to bypass the owning module.

Back Office may read confirmed Payment income through an explicit read-only
reporting dependency. It never writes Payment records.

The following words have precise meanings:

- A **Purchase Intent** is a technical, resumable record created before a Client
  transfers money. It freezes the selected Plan snapshots, exact Credit
  reservation, and amount shown beside the QR for 24 hours. It is not a Payment
  and grants no access.
- A **Payment** is the financial record created when a Client submits proof of a
  transfer, an Assistant records cash in hand, or Credit covers the full Plan
  price. Its commercial snapshots never change; only its accepted lifecycle
  fields may transition.
- A **Subscription** is created only by confirming a Payment and is the record
  that grants access. A Purchase Intent, pending Payment, or rejected Payment
  grants nothing.
- A **Credit ledger entry** is an immutable award, reservation, spend, or
  release. Ledger rows are the source of truth; there is no separately writable
  Client balance.
- A **Credit reservation** is a positive amount bound to one Purchase Intent or
  immediate Payment. Reserved Credit is not available to another purchase.
- A **Referral** is the immutable signup attribution from a referrer to a
  referred Client. It awards the referrer exactly once when the referred
  Client's first Payment is confirmed.
- A **receipt** is a private, finalized `system.ImageAsset` with purpose
  `transfer_receipt`, attached to one Purchase Intent and retained as the proof
  for its eventual transfer Payment. No provider URL, object bytes, bank details,
  or original filename belongs on Payment.

## Proposed enums

```prisma
enum PurchaseIntentState {
  OPEN      @map("open")
  SUBMITTED @map("submitted")
  EXPIRED   @map("expired")

  @@schema("booking")
}

enum PaymentMethod {
  TRANSFER    @map("transfer")
  CASH        @map("cash")
  CREDIT_ONLY @map("credit_only")

  @@schema("booking")
}

enum PaymentState {
  PENDING   @map("pending")
  CONFIRMED @map("confirmed")
  REJECTED  @map("rejected")

  @@schema("booking")
}

enum CreditLedgerEntryKind {
  REFERRAL_AWARD      @map("referral_award")
  PAYMENT_RESERVATION @map("payment_reservation")
  PAYMENT_SPEND       @map("payment_spend")
  PAYMENT_RELEASE     @map("payment_release")

  @@schema("booking")
}

enum CreditLedgerActorKind {
  ACCOUNT @map("account")
  WORKER  @map("worker")

  @@schema("booking")
}

enum CreditReservationState {
  RESERVED @map("reserved")
  SPENT    @map("spent")
  RELEASED @map("released")

  @@schema("booking")
}

enum ReferralState {
  PENDING @map("pending")
  AWARDED @map("awarded")

  @@schema("booking")
}
```

`CREDIT_ONLY` extends the two external payment methods. It avoids asking for a
Bs 0 transfer receipt when Credit covers the entire Plan.

## Prisma-level entity proposal

Names follow existing `camelCase` Prisma fields, `snake_case` database names,
UUID primary keys, `timestamptz(3)` instants, restrictive foreign keys, and
integer BOB centavos.

### `PurchaseIntent`

| Field | Type / constraint | Purpose |
| --- | --- | --- |
| `id` | UUID primary key | Stable resumable identity. |
| `clientId`, `planId` | required restrictive FKs | Buyer and selected catalog Plan. |
| `planNameSnapshot`, `durationMonthsSnapshot`, `classAllowanceSnapshot`, `planPriceCentavos` | required immutable snapshots | Terms displayed before the transfer. |
| `creditReservedCentavos`, `amountDueCentavos` | required non-negative ints | Exact frozen calculation: `amountDue = planPrice - creditReserved`. |
| `receiptImageAssetId` | nullable unique FK → `system.ImageAsset` | A ready receipt attached while the Intent is open. |
| `state` | required enum, default `open` | Open, submitted, or expired. |
| `createdByAccountId` | required FK → `system.Account` | The Client Account that opened it. |
| `createdAt`, `expiresAt`, `submittedAt`, `expiredAt`, `updatedAt` | lifecycle timestamps | Open lifetime and exactly one terminal transition. |

Indexes and constraints:

- `@@unique([id, clientId])` and `@@unique([id, clientId, planId])` support
  ownership-preserving foreign keys;
- partial unique `(client_id) WHERE state = 'open'` permits one open Purchase
  Intent per Client;
- `@@index([state, expiresAt, id])` supports cleanup reconciliation;
- `@@index([planId])`, `@@index([createdByAccountId])`, and a unique receipt
  index support normal relations;
- price, Credit, and amount are non-negative, Credit cannot exceed Plan price,
  and the arithmetic equality must hold;
- `expires_at > created_at`; `open` has no terminal timestamp; `submitted`
  requires `submitted_at`; `expired` requires `expired_at`; and terminal times
  cannot precede creation; and
- a receipt is optional while open, required at submission, and cannot be
  replaced after submission. Cross-table asset purpose, state, and owner checks
  occur in the attachment transaction.

A hidden or edited Plan does not alter an existing open Purchase Intent. The
snapshot remains valid until expiry because the Client may already have acted
on the displayed amount.

### `Payment`

| Field | Type / constraint | Purpose |
| --- | --- | --- |
| `id` | UUID primary key | Stable Payment identity. |
| `clientId`, `planId` | required restrictive FKs | Buyer and historical catalog reference. |
| `purchaseIntentId` | nullable unique composite FK with Client/Plan | Required for transfer; absent for cash and Credit-only. |
| `planNameSnapshot`, `durationMonthsSnapshot`, `classAllowanceSnapshot`, `planPriceCentavos` | required immutable snapshots | Commercial terms at purchase. |
| `creditAppliedCentavos`, `amountDueCentavos` | required non-negative ints | Exact amount requested after Credit. |
| `method`, `state` | required enums | Transfer begins pending; cash and Credit-only are created confirmed. |
| `collectedAtBranchId` | nullable restrictive FK → `booking.Branch` | Required only for cash; records where the Assistant accepted it without making the Payment Branch-scoped. |
| `submittedByAccountId`, `submittedAt` | required FK / instant | Client submitting transfer, Assistant recording cash, or Client completing Credit-only purchase. |
| `decidedByAccountId`, `decidedAt`, `rejectionReason` | nullable FK / instant / text | Final decision metadata. Rejection reason is trimmed Unicode text of 1–300 characters. |
| `createdAt`, `updatedAt` | standard timestamps | Operational timestamps; snapshot values are immutable. |

There is **no** `Payment.subscriptionId`. `Subscription.paymentId` below is the
single database relationship and Payment receives only the reverse Prisma
relation. This removes the former cyclic foreign keys.

Payment indexes and database protections:

- `@@unique([id, clientId])` and `@@unique([id, clientId, planId])` support
  ownership-preserving composite foreign keys;
- `@@index([clientId, state, submittedAt, id])` supports Client history;
- `@@index([state, submittedAt, id])` supports the pending review queue;
- `@@index([method, decidedAt, id])`, `@@index([planId])`,
  `@@index([collectedAtBranchId, decidedAt])`, and
  `@@index([decidedByAccountId, decidedAt])` support history/reporting;
- partial unique `(client_id) WHERE state = 'pending'` permits one pending
  transfer per Client;
- transfer requires a matching submitted Purchase Intent, starts pending, and
  never has a cash Branch; cash and Credit-only are created confirmed and have
  no Purchase Intent; only cash requires a collection Branch;
- cash has `submittedByAccountId = decidedByAccountId`; Credit-only is submitted
  and confirmed by the same Client Account;
- confirmation requires decision actor/time and no rejection reason; rejection
  requires decision actor/time/reason; pending has none;
- `decided_at >= submitted_at`; `amountDueCentavos = 0` exactly for Credit-only;
  transfer and cash require a positive amount due; and
- transfer snapshots and amounts must equal the referenced Purchase Intent.
  Client/Plan equality is a composite FK; snapshot equality is checked by the
  submission use case and covered by PostgreSQL integration tests.

A focused immutability trigger rejects changes to Payment ownership, method,
commercial snapshots, amounts, Purchase Intent, collection Branch, submitter,
submission time, and creation time after insert. It permits only the one pending
transfer decision and the normal `updatedAt` change. Purchase Intent receives
equivalent protection for its owner, Plan/snapshots, amounts, creator, creation,
and expiry time while still allowing receipt attachment/replacement and its one
terminal transition. Referral attribution and award evidence become immutable
once written. Financial and attribution rows use restrictive deletion; they are
retained rather than cascade-deleted.

### `Subscription` amendment

Add one required `paymentId String @unique @map("payment_id") @db.Uuid` and its
restrictive relation. Add a composite foreign key from
`Subscription(paymentId, clientId, planId)` to
`Payment(id, clientId, planId)`. Payment has a reverse `subscription`
relation without another scalar foreign key.

The existing partial unique active-Subscription constraint remains. The
activation transaction copies the Payment snapshots into the existing
Subscription snapshot fields and verifies equality. An index on `paymentId` is
not duplicated if its unique index already covers lookup.

### `CreditReservation`

| Field | Type / constraint | Purpose |
| --- | --- | --- |
| `id`, `clientId`, `amountCentavos` | required; positive amount | Stable Client-owned reservation. |
| `purchaseIntentId`, `paymentId` | nullable composite ownership FKs | Exactly one source: transfer Purchase Intent, or immediate cash/Credit-only Payment. |
| `state`, `reservedAt`, `settledAt` | required state / lifecycle times | Reserved transitions once to spent or released. |
| `createdAt`, `updatedAt` | standard timestamps | Operational state-change history; ledger entries preserve the immutable events. |

Use unique nullable indexes on `purchaseIntentId` and `paymentId`, plus
`@@unique([id, clientId])`, `@@index([clientId, state])`, and
`@@index([state, reservedAt, id])`. Composite foreign keys ensure the source
belongs to the same Client. Checks require exactly one source, a positive
amount, no `settledAt` while reserved, and one `settledAt >= reservedAt` for a
terminal state.

Transfer reservations remain linked to the Purchase Intent after submission;
the resulting Payment reaches them through `purchaseIntentId`. The relationship
is not rewritten merely to make Payment direct.

### `CreditLedgerEntry`

`CreditLedgerEntry` is append-only and has no update timestamp.

| Field | Type / constraint | Purpose |
| --- | --- | --- |
| `id`, `clientId`, `kind`, `amountCentavos`, `occurredAt` | required; positive amount | Immutable Credit event. |
| `reservationId`, `referralId` | nullable composite ownership FKs | Exactly the parent required by the entry kind. |
| `actorKind`, `actorAccountId`, `correlationId` | required kind, nullable Account FK, UUID | Account or expiry-worker provenance without copying request or personal data. |

Use `@@index([clientId, occurredAt, id])`, `@@index([reservationId])`, and
`@@index([referralId])`. Composite FKs enforce that the entry Client owns its
Reservation and, for an award, is the Referral's referrer. Partial unique
indexes allow exactly one reservation entry and at most one terminal entry per
Reservation; `referralId` is unique for `referral_award`.

Checks require:

- `referral_award` has Referral only;
- reservation, spend, and release have Reservation only;
- `account` actor kind requires an Account and `worker` forbids one;
- every amount is positive; and
- a spend/release amount equals the Reservation amount, enforced in the
  settlement transaction and integration tests because a row check cannot read
  another table.

The migration must add update, delete, and truncate rejection triggers for
`credit_ledger_entries`, matching the established append-only audit-table
protection. `CreditReservation` is deliberately mutable through one conditional
state transition; its ledger is not.

Available Credit is:

`sum(referral_award) - sum(payment_reservation) + sum(payment_release)`.

Spend does not subtract again because reservation already removed the amount
from availability. Reserved Credit is the sum of Reservations still in
`reserved`; lifetime spent Credit is the sum of `payment_spend`. Read models may
cache projections but never introduce a second writable balance.

### Deferred cross-row integrity

Several invariants cannot be expressed by a row `CHECK`. The migration should
use narrowly scoped, deferrable PostgreSQL constraint triggers, evaluated at
transaction commit, to require:

- every confirmed Payment has exactly one Subscription, every Subscription
  references a confirmed Payment, and pending/rejected Payments have none;
- every submitted Purchase Intent has exactly one transfer Payment, every
  transfer Payment references a submitted Intent, and open/expired Intents have
  no Payment;
- every reserved Credit Reservation has exactly its reservation ledger entry,
  while each spent/released Reservation has that entry plus exactly one matching
  terminal entry; and
- every awarded Referral points to a confirmed Payment for the referred Client
  and has exactly one matching award entry for the referrer.

The triggers inspect identifiers, states, kinds, ownership, and amounts only.
They do not implement workflow decisions or call application code. Their SQL is
reviewed with the migration and covered by real PostgreSQL tests.

### `Referral`

| Field | Type / constraint | Purpose |
| --- | --- | --- |
| `id`, `referrerClientId`, `referredClientId`, `createdAt` | required | Immutable signup attribution. |
| `state`, `qualifiedPaymentId`, `qualifiedAt` | state / nullable composite FK | Evidence of the referred Client's first confirmed Payment. |
| `awardCentavos`, `awardedAt` | nullable immutable award evidence | Snapshotted configured reward amount and event time. |

Use:

- `@@unique([referredClientId])` so one Client has at most one referrer;
- `@@unique([id, referrerClientId])` for Credit-entry ownership;
- composite FK `(qualifiedPaymentId, referredClientId)` →
  `Payment(id, clientId)` so another Client's Payment cannot qualify it;
- unique `qualifiedPaymentId` and `@@index([referrerClientId, createdAt, id])`;
  and
- a self-referral check plus state checks requiring all qualification/award
  fields in `awarded` and none in `pending`.

The signup transaction normalizes and resolves the code, rejects self-referral,
and inserts the immutable relationship. Attribution cannot be changed after
successful signup. The Referral award ledger entry, linked uniquely through
`referralId`, is the exact Credit evidence; Referral does not need a second
`creditLedgerEntryId` back-reference.

## Receipt and upload integration

PAY-002 depends on approval and implementation of UPL-001's `ImageVariant`
metadata. Receipts require one private thumbnail and one private readable
high-resolution variant, each unique by Image Asset and variant kind. Variant
metadata includes immutable opaque storage key, verified media type, byte size,
dimensions, creation time, and deletion time. Provider URLs remain derived and
are never stored as canonical identifiers.

The receipt sequence is:

1. An authenticated Client creates a Purchase Intent and receives its frozen
   amount plus the studio's transfer instructions.
2. The Client requests a `TRANSFER_RECEIPT` upload intent tied to that open
   Purchase Intent. The signed upload URL lasts 15 minutes; renewing it does not
   extend either the Image Asset or Purchase Intent deadline.
3. The Client uploads directly. Idempotent finalization moves the Image Asset to
   processing; the worker verifies, decodes, strips metadata, rebuilds both
   variants, deletes the temporary original, and leaves the asset `READY`.
4. An idempotent attachment command checks that the Purchase Intent is still
   open, the Account owns both records, and the asset is ready and has purpose
   `transfer_receipt`. It sets `receiptImageAssetId` and moves the asset to
   `ATTACHED` atomically. Replacing it before submission attaches a new ready
   asset and schedules the old one for deletion; submission prevents replacement.
5. Submitting the transfer creates the pending Payment from the unchanged
   Purchase Intent snapshots and marks the Intent submitted atomically.

Accepted receipt validation remains JPEG, PNG, or WebP; at most 10 MB and 6,000
pixels on either axis; declared and verified size/type/checksum checks; bounded
decode; and fixed safe output formats. A server-generated display name such as
`comprobante-<short-payment-id>.<safe-extension>` may be shown. The original
filename is not stored because it can leak personal information.

Only the owning Client may create, finalize, attach, replace, or submit their
receipt. A Client Payment status response never contains a private receipt URL.
Only an Administrator reviewing that Payment may request a five-minute private
view URL. Trainers, Nutritionists, Assistants, lists, reports, notifications,
analytics, logs, and audit metadata receive no URL, object key, checksum, or
receipt content.

An open Purchase Intent expires after 24 hours. Expiry releases its Credit and
schedules every attached or unattached receipt artifact for idempotent deletion.
A submitted pending Payment never expires automatically after the Client may
have transferred real money; it remains for an Administrator decision and is
surfaced by stale-queue monitoring.

After confirmation or rejection, receipt objects and live variant keys are
deleted at the later of 45 days after successful finalization or seven days
after the decision. The Payment → Purchase Intent → Image Asset tombstone
relationships and non-image verified metadata remain; the asset/variants are
marked deleted, and private-view issuance rejects them. This preserves
financial provenance without retaining banking screenshots.

Administrators may re-open a settled Payment and view its receipt only while
the retained variants still exist. Clients do not receive a receipt viewer.

## Transfer instructions

The single fixed studio QR, beneficiary, bank label, and account label are not
receipt metadata and are never inferred from uploaded images. PAY-002 exposes a
read-only transfer-instructions projection through a Booking-owned provider.
The initial adapter reads validated deployment configuration and serves a
trusted, versioned QR through a backend-owned endpoint. It exposes no bucket or
provider URL and has no administrator mutation surface in v1. Changing these
instructions requires an operational configuration rollout; a future admin-
managed resource requires a separate security and product decision.

## Commands and transaction boundaries

All commands reload current state and use the PostgreSQL clock. Bolivia calendar
rules use `America/La_Paz`. Every allocation or money transition uses a short
Prisma interactive transaction at `Serializable`, with bounded retry only for
recognized serialization failures or deadlocks. Transactions enqueue durable
work but perform no network, upload, image-processing, or push call.

Purchase commands lock every affected Client row in stable UUID order before
mutating state. Referral qualification can affect both buyer and referrer, so
both are locked in that order. This prevents inconsistent lock ordering across
simultaneous purchases and Credit awards.

| Command | Idempotency | Preconditions and atomic result |
| --- | --- | --- |
| Create Purchase Intent | Required | Client owns Account; no effective active Subscription, open Intent, or pending Payment; Plan is visible. Expire a stale Subscription if its domain rule is currently met. Snapshot Plan, reserve `min(available Credit, Plan price)`, append reservation entry, insert 24-hour Intent, and store response. Exact replay returns the same Intent. |
| Attach/replace ready receipt | Required | Intent is open/unexpired and owned by Client; asset is ready, correctly purposed, and owned by the same Account. Attach it; replacement schedules the former asset for cleanup. |
| Submit transfer Payment | Required | Intent is open/unexpired with attached receipt; no effective active Subscription or pending Payment. Copy exact frozen snapshots, create pending transfer Payment, mark Intent submitted, store response, create one notification/inbox event for every active Administrator Account, and enqueue delivery. Do not reprice or recalculate Credit. |
| Expire Purchase Intent | Stable internal job key | At/after expiry, conditionally change one open Intent to expired, release its reserved Credit once, append release entry, and enqueue receipt cleanup. A submitted Intent is a no-op. |
| Confirm transfer Payment | Target-addressed transition | Administrator reloads pending Payment/receipt and eligibility. Mark confirmed, spend reservation, create/link Subscription, qualify and award Referral, append audit, schedule receipt deletion, and queue Client success notification. Equivalent retry returns the existing Payment and Subscription; rejection or conflicting repeat returns stable conflict. |
| Reject transfer Payment | Target-addressed transition | Administrator supplies normalized 1–300 character reason. Mark pending transfer rejected, release reservation, append audit, schedule receipt deletion, and queue Client rejection notification. Equivalent same-reason retry returns the existing result; a different reason or decision conflicts. |
| Record cash Payment | Required | Assistant selects a Branch currently assigned to them, has cash in hand, and Client has no effective active Subscription, open Intent, or pending Payment. Snapshot visible Plan; reserve then spend Credit; create confirmed cash Payment with collection Branch; create Subscription; qualify Referral; append audit; store response. |
| Complete Credit-only purchase | Required | Client has available Credit at least equal to visible Plan price and no effective active Subscription, open Intent, or pending Payment. Create confirmed zero-due Payment, reserve/spend exact Plan price, create Subscription, qualify Referral, append audit, and store response. No QR or receipt is involved. |

Every purchasable v1 Plan must have a positive price. The existing catalog
schema technically permits zero, so a visible zero-price Plan returns
`plan-not-purchasable` until a complimentary-Plan workflow is separately
designed. This also ensures Credit-only reservations and ledger entries remain
strictly positive.

All successful commands commit business state, ledger entries,
`system.IdempotencyRecord` where required, required audit, notifications, and
durable jobs together or commit none. Transaction-aware module ports participate
in the caller's transaction; external adapters run only after commit.

Idempotency records for Purchase Intent creation, receipt attachment, transfer
submission, cash, and Credit-only commands are retained for at least 48 hours
after the owning record reaches a terminal state. This lets a lost mobile
response replay after review rather than merely colliding with a uniqueness
constraint. Final implementation may retain them longer through the ordinary
cleanup policy, but never less.

## Activation and eligibility invariants

1. No purchase starts while the Client has an effective active Subscription.
   Eligibility evaluates dates, remaining allowance, and future booked Sessions;
   it does not trust a stale `state` value alone.
2. If the previous Subscription now meets its expiration rule, the purchase
   transaction marks it expired and sets `expiredAt` before inserting the new
   allocation record.
3. Open Purchase Intent, pending-transfer, cash, and Credit-only gates all use
   the same Client lock and eligibility function. Cash cannot overtake an open
   transfer Intent or pending Payment.
4. Confirmation rechecks that no effective active Subscription exists. A
   conflict creates no Subscription, spend, Referral award, audit success, or
   notification. The pending Payment remains for an Administrator to resolve.
5. A confirmed Payment creates exactly one Subscription through the single
   unique `Subscription.paymentId` relationship.
6. `startsOn` is the Bolivia date of confirmation. `endsOn` is the same inclusive
   calendar day after the snapshotted 1, 3, 6, or 12 months, clamped to the last
   day when the target month lacks that day. No day is subtracted: January 31 →
   February 28 is the accepted one-month example.
7. Subscription Plan/allowance snapshots equal Payment snapshots. It starts
   with the full class allowance and never extends, resets, or merges a prior
   Subscription.
8. A rejected transfer is settled and final. A new attempt requires a new
   Purchase Intent and receipt; released Credit becomes available again.

## Credit and Referral invariants

- The available, reserved, and spent projections are derived from ledger and
  Reservation state inside one consistent query/transaction.
- No command may reserve more than available Credit; conditional state changes
  and ledger uniqueness make spend/release exactly once.
- Purchase Intent expiry and Payment rejection release the full reservation.
  Confirmation spends the full reservation. There are no partial decisions.
- Referral attribution is immutable after signup, one referred Client has at
  most one referrer, and self-referral is prohibited.
- Any first confirmed Payment method, including cash or Credit-only, qualifies
  the Referral. Pending and rejected transfer Payments do not.
- The award transaction verifies the qualifying Payment belongs to the referred
  Client, changes one pending Referral to awarded, snapshots the configured BOB
  reward, and inserts exactly one award ledger entry for the referrer.
- The reward is Bs 60 (`6_000` centavos), read from the required validated
  deployment configuration value `REFERRAL_REWARD_CENTAVOS`. Startup rejects a
  missing value or any value other than `6000` in v1. A future reward change
  requires separate product approval and affects only future awards; existing
  `awardCentavos` snapshots never change.

## Authorization and API implications

Use explicit `/api/v1` commands and screen-shaped reads, not generic CRUD.
Mutations, transfer instructions, and private receipt URLs use
`Cache-Control: no-store`; suitable authenticated list/detail responses are
private and revalidated.

### PAY-002 and MOB-012

- read visible Plan purchase projections with available and reserved Credit;
- create/read one owned Purchase Intent and its frozen amount;
- read current transfer instructions;
- request/renew/finalize upload, attach/replace receipt, and submit transfer;
- complete a Credit-only purchase without entering the transfer screen;
- read own Payment detail/status for pending, confirmed, and rejected states;
- read active/last Subscription;
- read referral code and cursor-paginated Referral list using referred first
  name plus surname initial; and
- read Credit summary (`availableCentavos`, `reservedCentavos`) plus recent
  cursor-paginated award/spend/release activity. A reserved-zero state explains
  that Credit is held for a Payment under review instead of showing the
  zero-balance referral encouragement.

Client Payment status exposes snapshots, expected amount, submission/decision
time, state, resulting Subscription, and own rejection reason where applicable.
It never exposes receipt URLs, object keys, or Administrator identity.

### STAFF-001 and MOB-013

- cursor-paginated pending transfer queue ordered oldest first by
  `submittedAt ASC, id ASC`;
- pending review projection with Client, Plan snapshots, expected amount,
  submission time, and receipt availability;
- five-minute receipt-view URL authorized per request;
- explicit confirm and reject commands with the replay semantics above; and
- stale-pending age in the queue so unresolved real transfers remain visible.

Both staff mobile and admin web call the same decision use cases. The first
decision wins; all other surfaces observe the settled state immediately.

### Assistant cash and administrator web

- Assistant Plan quote and idempotent cash command require selected Client and
  operating Branch; authorization verifies current Assistant assignment.
- AW28 uses offset pagination and lists all Payment methods with allowlisted
  search, state, method, and date filters. Only pending transfers open review;
  settled rows may open read-only detail while their retained receipt exists.
- AW26 uses offset pagination over Referrals. AW27 returns only Clients with
  nonzero available or reserved Credit, with separate totals and a last-activity
  projection derived from ledger events.
- Administrator lists remain studio-wide. `collectedAtBranchId` is provenance,
  not a resource-authorization scope.

### Reporting

Only confirmed Payments count as income. Income is recognized at `decidedAt`
and assigned to its Bolivia civil date. Cash has an attributable collection
Branch; transfer and Credit-only income are studio-wide/unallocated. AW16
includes those unallocated records only when its filter is “Todas las
sucursales.” A single-Branch report excludes them rather than assigning them to
a fabricated Branch. Credit-only Payments contribute Bs 0 cash income while
remaining visible in Payment history and Credit reporting.

### Stable error codes

At minimum: `subscription-not-expired`, `purchase-intent-open-exists`,
`purchase-intent-expired`, `purchase-intent-not-open`, `payment-pending-exists`,
`payment-not-pending`, `payment-receipt-not-ready`,
`payment-receipt-invalid-owner`, `payment-receipt-required`,
`credit-insufficient`, `plan-not-purchasable`, `referral-code-invalid`,
`referral-self-reference`, `idempotency-key-reused`, and
`payment-confirmation-conflict`. Exact transport names receive contract review
during PAY-002.

## Audit, notification, and cleanup rules

Focused audit actions are `payment.transfer_confirmed`,
`payment.transfer_rejected`, `payment.cash_confirmed`, and
`payment.credit_only_confirmed`. Transfer submission is ordinary Client activity
and is represented by immutable domain/idempotency records rather than the
focused administrative audit catalog. Referral award provenance is complete in
Referral and the append-only ledger; a separate audit row adds no actor or
effect not already captured.

Payment-decision audit metadata includes method, prior/new state, expected
amount, Credit applied, and collection Branch where applicable. It never copies
the free-text rejection reason, receipt content, filename, URL, object key, bank
details, or personal snapshots. The Payment retains the Client-visible reason.

Submitting one transfer creates one `SUBSCRIPTION_PAYMENT` inbox Notification
per active Administrator Account using a per-Account/Payment business-event key.
Confirmation and rejection create one Client notification each. Notifications
contain privacy-safe state and destination identifiers, not financial images or
banking details. Delivery happens after commit.

Reconcilers cover open Purchase Intent expiry, stale pending-Payment alerts, and
receipt deletion due dates. Jobs recheck authoritative state and use stable
business keys so duplicate delivery is a no-op.

## Required design follow-ups

The schema/API proposal intentionally follows accepted ADRs where the current
generated design has drifted. Before MOB-012/MOB-013 implementation, focused
follow-ups should:

1. add a rejected Client Payment-status frame with the reason and a route to a
   new Purchase Intent;
2. add Credit reserved-for-review state and align recent activity with the
   proposed Credit projection;
3. change receipt guidance from JPG/PNG and 5 MB to JPEG/PNG/WebP and 10 MB;
4. remove unowned/invented payer-bank labels from Administrator receipt review;
5. correct the S10 eight-class Plan price to the approved catalog value;
6. skip the QR screen when Credit fully covers the Plan; and
7. show all Payment methods and the method filter on AW28, while keeping receipt
   review exclusive to transfer Payments.

These are prompt/follow-up changes under the design workflow, not edits to
generated files.

## Approval record

On 2026-09-11, the user approved the schema direction and the rules listed under
Approved scope below, then approved the recommended Referral reward and AW16
Branch-filter treatment. That approval permits the next documentation step: an
exact Prisma and generated-SQL migration review. It does not authorize
creating, modifying, or applying a migration or implementation work.

Approved scope:

1. the five new Booking tables (`purchase_intents`, `payments`,
   `credit_reservations`, `credit_ledger_entries`, `referrals`), their enums,
   constraints, and the single `subscriptions.payment_id` amendment;
2. a Bs 60 (`6_000` centavos) Referral reward supplied by the required validated
   `REFERRAL_REWARD_CENTAVOS` deployment configuration value;
3. `credit_only` as a third Payment method and the no-QR zero-due flow;
4. the 24-hour Purchase Intent/reservation lifetime, with no automatic expiry
   after a real transfer is submitted;
5. one open Purchase Intent and one pending Payment per Client, including the
   rule that cash cannot overtake either;
6. immutable Referral attribution after signup;
7. cash collection Branch provenance and AW28 listing all Payment methods;
8. backend-configured fixed transfer instructions with no v1 admin editor;
9. Administrator-only receipt viewing through deletion and no Client viewer;
10. reporting confirmed income at `decidedAt`; unallocated transfer and
    Credit-only records appear in AW16 only under “Todas las sucursales” and are
    excluded from single-Branch results;
11. positive-price purchase eligibility for v1, leaving any zero-price or
    complimentary Plan workflow out of scope; and
12. the required UPL-001 `ImageVariant` schema dependency and the seven design
    follow-ups above.

## Validation required after approval

PAY-002 must first produce an exact Prisma and generated-SQL migration review.
Before application, real PostgreSQL integration tests must cover:

- simultaneous Purchase Intent creation for one Client;
- Plan edit/hide and Referral award after an amount is frozen;
- Purchase Intent expiry racing receipt attachment/submission;
- transfer submission retry after a lost response;
- cash racing an open Intent or pending transfer;
- two Administrators deciding one Payment, including equivalent and conflicting
  retries across mobile/web;
- activation racing stale Subscription expiration;
- concurrent Credit reservations, exactly-once spend/release, and ledger
  mutation rejection;
- composite Client/Plan/Referral ownership violations;
- first-Payment Referral award racing duplicate command delivery;
- receipt owner/purpose/state enforcement and post-deletion URL denial; and
- confirmed-income date/method/Branch report projections.

Contract tests must cover every required idempotency key, exact replay,
conflicting reuse, all three Client Payment states, default-deny receipt access,
pagination/order, RFC 9457 codes, and current/previous mobile compatibility.

## Governing sources

- [Booking & Membership context](../../booking/CONTEXT.md)
- [Manual QR payments ADR](../../booking/docs/adr/0002-manual-qr-payments-for-v1.md)
- [Prisma ADR](../adr/0015-use-prisma-for-postgresql-access.md),
  [Serializable transactions ADR](../adr/0056-use-serializable-transactions-selectively.md),
  and [idempotency ADR](../adr/0060-require-idempotency-keys-for-retry-sensitive-commands.md)
- [Object-storage ADR](../adr/0026-store-uploaded-images-in-s3-compatible-object-storage.md)
  and receipt/upload ADRs [0071](../adr/0071-limit-signed-object-urls.md),
  [0072](../adr/0072-limit-images-by-upload-purpose.md),
  [0073](../adr/0073-rebuild-images-during-finalization.md),
  [0074](../adr/0074-delete-abandoned-uploads-after-one-day.md), and
  [0075](../adr/0075-delete-receipt-images-after-forty-five-days.md)
- [Money representation ADR](../adr/0082-represent-money-as-bob-centavos.md),
  [authorization ADR](../adr/0054-enforce-contextual-authorization-in-use-cases.md),
  and [audit ADR](../adr/0055-store-focused-audit-records-in-postgresql.md)
- Affected [client Payment prompt](../design/prompts/client/10-payment.md),
  [Client Payment-status prompt](../design/prompts/client/11-payment-status.md),
  [Client Credit prompt](../design/prompts/client/17-credit-balance.md),
  [staff Payment review prompt](../design/prompts/staff/12-admin-payment-review.md),
  [admin Payment list prompt](../design/prompts/admin-web/28-pagos.md), and
  [admin Payment review prompt](../design/prompts/admin-web/29-revisar-pago.md)
