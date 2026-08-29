# IDN-001 — System Identity schema proposal

Status: proposed for explicit approval. This document creates no migration and
does not alter the Prisma schema.

## Ownership and links

`system` owns `Account`, `AccountCredential`, `AuthenticationLink`,
`AuthenticationSession`, and `AuthenticationThrottle`. Booking & Membership
continues to own `Client` and `StaffMember`.

`system.Account` has exactly one nullable cross-context link: `clientId` or
`staffMemberId`. A database `CHECK` requires exactly one non-null value; unique
indexes prevent either domain identity from being linked to more than one
Account. The approved migration must create the initial `booking.Client` table
in the same transaction so `clientId` can use a foreign key. Staff linkage is
prepared as nullable until the Booking & Membership Staff Member migration.

## Proposed `system` tables

| Table                    | Essential columns and constraints                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Account`                | UUID primary key; normalized unique email; nullable unique `clientId`; nullable unique `staffMemberId`; `emailVerifiedAt`; `activatedAt`; `disabledAt`; `pendingExpiresAt`; timestamps; exactly-one-link check once Staff Member exists.               |
| `AccountCredential`      | Account primary-key foreign key; Argon2id password hash; `passwordChangedAt`; timestamps. No plaintext or reversible password.                                                                                                                         |
| `AuthenticationLink`     | UUID primary key; Account foreign key; purpose (`verification`, `activation`, `password_recovery`); one-way token digest; issued, expires, used, invalidated timestamps. A partial unique index permits only one current link per Account and purpose. |
| `AuthenticationSession`  | UUID primary key; Account foreign key; one-way credential digest unique; created, last meaningful activity, idle expiry, absolute expiry, revoked timestamps; installation/browser metadata only when privacy-approved.                                |
| `AuthenticationThrottle` | UUID primary key; lane kind (`recipient`, `client`, `network`, `login`); normalized lane key; purpose; failure count; window start; blocked-until; timestamps; unique lane identity. No raw credential or link token.                                  |
| `PendingAccountAudit`    | UUID primary key; Account reference retained only as non-identifying audit metadata where cancellation/expiry removes the Account; actor kind; action; occurred timestamp.                                                                             |

## Required invariants

- Email is the sole login identifier and is normalized before the unique check.
- Link and session secrets are generated once, returned only to the intended
  client/email flow, and stored only as one-way digests.
- A new link invalidates every unused link of the same Account and purpose.
- Recovery completion revokes all Authentication Sessions before issuing its
  replacement session; activation and verification do not sign a person in.
- Account authorization resolves Client or Staff Member state from Booking &
  Membership; no Role, Branch, payment, or Booking data is copied into `system`.

## Migration impact for approval

1. Add the listed `system` tables, enum/check/index constraints, and foreign
   keys to `system.Account`.
2. Add the initial `booking.Client` table and its Account relation in the same
   migration; Staff Member linkage is added with its owning table later.
3. Add no seed credentials, no runtime schema push, and no provider credentials.
4. The later pg-boss schema proposal remains separate and is required before
   transactional authentication email delivery is implemented.

Approval authorizes IDN-002 to create the corresponding Prisma models and one
reviewed migration. It does not authorize the migration itself until its exact
generated SQL and impact are presented.
