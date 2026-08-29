# IDN-001 — System Identity schema proposal

Status: proposed for explicit approval. This document creates no migration and
does not alter the Prisma schema.

## Ownership and links

`system` owns `Account`, `AccountCredential`, `AuthenticationLink`,
`AuthenticationSession`, and `AuthenticationThrottle`. Booking & Membership
continues to own `Client` and `StaffMember`.

This first identity slice does not link an Account to a Client or Staff Member.
Those records do not exist yet, and Booking & Membership remains responsible for
creating and owning them. A later, separately approved Booking & Membership
change will add each relationship when the corresponding domain record exists.

## Proposed `system` tables

| Table                    | Essential columns and constraints                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Account`                | UUID primary key; normalized unique email; `emailVerifiedAt`; `activatedAt`; `disabledAt`; `pendingExpiresAt`; timestamps.                                                                                                                             |
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
- This slice does not decide whether an Account belongs to a Client or Staff
  Member. That connection is added when Booking & Membership introduces the
  corresponding records; no role, branch, payment, or booking data is copied
  into `system`.

## Migration impact for approval

1. Add the listed `system` tables, enums, indexes, and foreign keys within the
   `system` schema only.
2. Add no Client or Staff Member tables, links, or cross-context foreign keys.
3. Add no seed credentials, no runtime schema push, and no provider credentials.
4. The later pg-boss schema proposal remains separate and is required before
   transactional authentication email delivery is implemented.

Approval authorizes IDN-002 to create the corresponding Prisma models and one
reviewed migration. It does not authorize the migration itself until its exact
generated SQL and impact are presented.
