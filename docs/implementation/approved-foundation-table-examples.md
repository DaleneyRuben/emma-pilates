# Approved foundation table examples

Status: approved implementation reference

This guide preserves the concrete examples used while reviewing the first
persistence foundation. It explains why each approved table exists, which
application event creates a row, what a representative row contains, and what
usually changes afterward.

The word **trigger** below means a business or application event. It does not
mean that PostgreSQL automatically inserts the row through a database trigger.
The owning use case or worker performs the insert, normally inside the same
transaction as the related state change.

Examples use readable aliases such as `account_ana` in place of UUIDs. Digest
and checksum labels represent one-way or keyed binary values, never plaintext
credentials, link secrets, email addresses, installation identifiers, or
network addresses. The authoritative fields and constraints remain the Prisma
models and committed migration; these rows are explanatory examples, not seed
data or API contracts.

## System Identity and shared infrastructure

### `accounts`

**Purpose:** Own the login email, password hash, Account lifecycle, and the link
to exactly one domain identity. Profile data stays on either `clients` or
`staff_members`.

**Typical insert trigger:** Ana submits Client registration. One transaction
creates her `clients` row, her pending `accounts` row, the current verification
token, the accepted throttle event, and the email job.

| Field                      | Example after insert   |
| -------------------------- | ---------------------- |
| `id`                       | `account_ana`          |
| `email`                    | `ana@example.com`      |
| `password_hash`            | `<argon2id hash>`      |
| `password_changed_at`      | `null`                 |
| `email_verified_at`        | `null`                 |
| `activated_at`             | `null`                 |
| `disabled_at`              | `null`                 |
| `pending_expires_at`       | `2026-09-05T14:00:00Z` |
| `client_id`                | `client_ana`           |
| `staff_member_id`          | `null`                 |
| `created_at`, `updated_at` | `2026-08-29T14:00:00Z` |

When Ana opens a valid Verification Link, `email_verified_at` and
`activated_at` are set. A Staff Member Account instead has `staff_member_id`
and no `client_id`. The database rejects rows with both links or neither link.

### `authentication_tokens`

**Purpose:** Represent single-use Verification, Activation, and
Password-Recovery Links, plus the private continuation held by the app during a
self-registration, without storing any usable raw secret.

**Typical insert triggers:**

| Event                                      | Purpose                     | Lifetime   | Resulting row                                                                                                                                                     |
| ------------------------------------------ | --------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ana self-registers                         | `verification`              | 24 hours   | `account_id=account_ana`, `token_digest=<digest_v1>`, `issued_at=2026-08-29T14:00:00Z`, `expires_at=2026-08-30T14:00:00Z`, `used_at=null`, `invalidated_at=null`  |
| Ana self-registers                         | `registration_continuation` | 7 days     | `account_id=account_ana`, `token_digest=<digest_c1>`, `issued_at=2026-08-29T14:00:00Z`, `expires_at=2026-09-05T14:00:00Z`, `used_at=null`, `invalidated_at=null`  |
| An Administrator creates Staff Member Luis | `activation`                | 7 days     | `account_id=account_luis`, `token_digest=<digest_a1>`, `issued_at=2026-08-29T15:00:00Z`, `expires_at=2026-09-05T15:00:00Z`, `used_at=null`, `invalidated_at=null` |
| Ana requests password recovery             | `password_recovery`         | 30 minutes | `account_id=account_ana`, `token_digest=<digest_r1>`, `issued_at=2026-10-02T18:00:00Z`, `expires_at=2026-10-02T18:30:00Z`, `used_at=null`, `invalidated_at=null`  |

Issuing a replacement link sets `invalidated_at` on the older unused row before
inserting the replacement. Successful consumption sets `used_at`. Expired rows
remain unusable even if both fields are still null. The partial unique index
allows only one current row per Account and purpose.

The app receives the raw registration continuation once when it creates the
self-registered pending Account; PostgreSQL retains only `<digest_c1>`. A
repeated public registration receives the same neutral **Revisa tu correo**
response but never receives the existing continuation, so knowing Ana's email
does not authorize another person to correct or cancel her registration.

When Ana corrects her email, the backend verifies the continuation digest,
updates the pending Account, invalidates the old Verification Link, issues and
queues a new one, and restarts both the continuation's seven-day expiry and the
Account's seven-day inactivity window. Cancellation requires the same valid
continuation. It removes the pending Account and Client; the foreign-key cascade
removes their token rows, while `audit_records` retains the minimal cancellation
event. An Assistant-created Client has an Activation Link but no
`registration_continuation`, so a public request cannot change or cancel that
invitation.

This approved IDN-003 extension adds only the
`registration_continuation` enum value. It adds no table or column.

### `authentication_sessions`

**Purpose:** Store independently expiring and revocable server-side sign-ins.
The opaque credential held by the app or browser is represented only by a
one-way digest.

**Typical insert trigger:** Ana supplies valid credentials after her Account is
verified and active.

| Field                             | Example after insert          |
| --------------------------------- | ----------------------------- |
| `id`                              | `auth_session_ana_phone`      |
| `account_id`                      | `account_ana`                 |
| `account_device_id`               | `device_ana_iphone`           |
| `surface`                         | `mobile`                      |
| `credential_digest`               | `<session credential digest>` |
| `created_at`                      | `2026-09-01T13:00:00Z`        |
| `last_meaningful_activity_at`     | `2026-09-01T13:00:00Z`        |
| `idle_expires_at`                 | `2026-10-01T13:00:00Z`        |
| `absolute_expires_at`             | `2026-11-30T13:00:00Z`        |
| `revoked_at`, `revocation_reason` | `null`, `null`                |

Logout sets `revoked_at` and `revocation_reason=logout`. Password replacement,
Account disablement, and “logout other devices” revoke the affected rows with
their corresponding reasons. Failed Login never creates a row.

### `authentication_throttle_events`

**Purpose:** Count recent authentication activity across API instances without
storing raw email, client-installation, or network identifiers.

**Typical insert triggers:**

| Event                                       | Example after insert                                                                                                                                                                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failed Login for a claimed email and origin | `purpose=login`, `event_kind=failed_credential_check`, `login_lane_digest=<claimed-email/origin lane>`, `client_digest=<app installation digest>`, `network_digest=<network digest>`, `occurred_at=2026-09-01T13:02:00Z`, `expires_at=<end of longest rolling window>` |
| Verification email actually issued          | `purpose=verification`, `event_kind=message_issued`, `recipient_digest=<email digest>`, `client_digest=<app installation digest>`, `network_digest=<network digest>`, `occurred_at=2026-09-01T13:05:00Z`, `expires_at=<end of longest rolling window>`                 |

A request rejected by a recipient, client, or network limit does not insert a
`message_issued` event because no link or email was issued. Successful Login
clears only the matching claimed-email/origin lane according to the accepted
abuse-control policy.

### `email_suppressions`

**Purpose:** Stop authentication email to an address after a hard bounce or
complaint. Suppression belongs to the normalized address, not to one Account.

**Typical insert trigger:** An authenticated SendPulse webhook reports a hard
bounce for Ana’s address.

| Field                  | Example after insert       |
| ---------------------- | -------------------------- |
| `id`                   | `suppression_ana_bounce`   |
| `email_digest`         | `<ana@example.com digest>` |
| `reason`               | `hard_bounce`              |
| `provider`             | `sendpulse`                |
| `provider_event_id`    | `sp-event-8742`            |
| `provider_occurred_at` | `2026-09-01T13:07:20Z`     |
| `suppressed_at`        | `2026-09-01T13:07:22Z`     |
| resolution fields      | `null`                     |

Repeated delivery of the same provider event does not duplicate the row.
Authorized resolution fills `resolved_at`, `resolved_by_account_id`,
`resolution_reason`, and optionally `resolution_note`. Soft failures do not
create permanent suppressions.

### `audit_records`

**Purpose:** Preserve a focused, immutable security or business history without
copying secrets or complete personal records.

**Typical insert trigger:** An Administrator disables Luis’s Staff Member
Account.

| Field                      | Example after insert                    |
| -------------------------- | --------------------------------------- |
| `id`                       | `audit_disable_luis`                    |
| `action_code`              | `account.disabled`                      |
| `outcome`                  | `succeeded`                             |
| `actor_kind`               | `account`                               |
| `actor_account_id`         | `account_admin_maria`                   |
| `actor_role`               | `administrator`                         |
| `target_type`, `target_id` | `account`, `account_luis`               |
| `branch_id`                | `null`                                  |
| `correlation_id`           | `request_6420`                          |
| `metadata`                 | `{"reasonCategory":"employment_ended"}` |
| `occurred_at`              | `2026-10-10T16:30:00Z`                  |

The successful state change and audit insert share one transaction. Failed
sensitive attempts may also create `outcome=failed` records when the event
catalog requires them. PostgreSQL rejects update, delete, and truncate attempts
against this table.

### `idempotency_records`

**Purpose:** Return the same completed result when an authenticated client
retries a command that must not produce the business effect twice.

**Typical insert trigger:** Ana successfully creates a Booking using command
key `4f57…`. The transaction commits the Booking and this completed response
together.

| Field             | Example after insert                                          |
| ----------------- | ------------------------------------------------------------- |
| `id`              | `idempotency_booking_ana`                                     |
| `account_id`      | `account_ana`                                                 |
| `command`         | `booking.create`                                              |
| `idempotency_key` | `4f57d524-4b85-4c9d-8a6a-726d8de78d67`                        |
| `request_hash`    | `<canonical request digest>`                                  |
| `response_status` | `201`                                                         |
| `response_body`   | `{"bookingId":"booking_ana_204"}`                             |
| `created_at`      | `2026-10-12T12:00:00Z`                                        |
| `expires_at`      | `<retention deadline chosen with the command's retry window>` |

An identical retry replays this response. Reusing the key with a different
request hash is rejected. Rolled-back, authorization, throttle, and transient
failures are not retained as completed outcomes.

### `notifications`

**Purpose:** Store the durable Account inbox and the authoritative unread badge
count independently of push delivery.

**Typical insert trigger:** A Session booked by Ana changes schedule and the
Booking workflow queues a notification in the same transaction.

| Field                                | Example after insert                   |
| ------------------------------------ | -------------------------------------- |
| `id`                                 | `notification_schedule_204`            |
| `account_id`                         | `account_ana`                          |
| `category`                           | `booking_schedule`                     |
| `type`                               | `session.rescheduled`                  |
| `business_event_key`                 | `session_204.rescheduled.v3`           |
| `title`                              | `Cambió el horario de tu clase`        |
| `message`                            | `Tu clase ahora comienza a las 18:30.` |
| `destination_type`, `destination_id` | `session`, `session_204`               |
| `created_at`                         | `2026-10-12T15:00:00Z`                 |
| `read_at`                            | `null`                                 |

Opening the inbox item sets `read_at`. Retrying the same business event does not
duplicate it because the Account and business-event key are unique. The row is
created even when the Account has no active push-capable device.

### `account_devices`

**Purpose:** Track an Account’s active app installations and Expo push tokens
without storing advertising or raw hardware identifiers.

**Typical insert trigger:** After Ana signs in on her iPhone and grants
notification permission, the app registers its installation and current Expo
push token.

| Field                                   | Example after insert         |
| --------------------------------------- | ---------------------------- |
| `id`                                    | `device_ana_iphone`          |
| `account_id`                            | `account_ana`                |
| `installation_id_digest`                | `<installation digest>`      |
| `expo_push_token`                       | `ExponentPushToken[example]` |
| `platform`                              | `ios`                        |
| `registered_at`                         | `2026-09-01T13:00:00Z`       |
| `token_updated_at`                      | `2026-09-01T13:00:00Z`       |
| `last_seen_at`                          | `2026-09-01T13:00:00Z`       |
| `deactivated_at`, `deactivation_reason` | `null`, `null`               |

Token rotation updates the same installation row. Logout or a provider response
that says the device is no longer registered clears the push token and fills
the matching deactivation timestamp and reason. One Account may have several
active devices, but an active installation digest or push token is globally
unique.

### `notification_deliveries`

**Purpose:** Track each attempt to push one durable Notification to one Account
Device. It does not replace the inbox Notification.

**Typical insert trigger:** The notification dispatcher finds two active
devices for Ana and creates one queued delivery row for each device.

| Field                          | Example after insert           |
| ------------------------------ | ------------------------------ |
| `id`                           | `delivery_schedule_204_iphone` |
| `notification_id`              | `notification_schedule_204`    |
| `account_device_id`            | `device_ana_iphone`            |
| `state`                        | `queued`                       |
| `provider_ticket_id`           | `null`                         |
| `attempt_count`                | `0`                            |
| attempt/receipt/failure fields | `null`                         |
| `created_at`                   | `2026-10-12T15:00:01Z`         |
| `completed_at`                 | `null`                         |

Expo acceptance changes the row to `submitted`, records its ticket and attempt
time, and increments `attempt_count`. A later receipt changes it to `delivered`
or `failed` and fills `completed_at`. No active device means no delivery row,
but the Notification remains in the Account inbox.

### `image_assets`

**Purpose:** Track the controlled upload and verification lifecycle while image
bytes remain in object storage.

**Typical insert trigger:** Ana begins uploading a new profile photo. The
backend creates the pending metadata row before returning a signed upload URL.

| Field                                   | Example after insert                          |
| --------------------------------------- | --------------------------------------------- |
| `id`                                    | `image_ana_profile_v2`                        |
| `owner_account_id`                      | `account_ana`                                 |
| `purpose`                               | `profile_photo`                               |
| `state`                                 | `pending`                                     |
| `pending_object_key`                    | `pending/account_ana/image_ana_profile_v2`    |
| declared media fields                   | `image/jpeg`, `842113`, `<declared checksum>` |
| verified media fields and dimensions    | `null`                                        |
| `created_at`                            | `2026-10-14T11:00:00Z`                        |
| `expires_at`                            | `2026-10-14T11:15:00Z`                        |
| finalization/attachment/deletion fields | `null`                                        |

Successful processing fills verified metadata and `finalized_at`, then attaching
the asset to a Client or Staff Member fills `attached_at`. Failed, expired,
replaced, and deleted assets advance through their lifecycle without storing
the image bytes in PostgreSQL.

## Booking and Membership foundation

### `clients`

**Purpose:** Store Client profile data separately from login credentials and
Account security.

**Typical insert trigger:** Ana self-registers, or an Assistant creates Ana as
a Client. The Client and pending Account are created in one transaction.

| Field                      | Example after insert   |
| -------------------------- | ---------------------- |
| `id`                       | `client_ana`           |
| `name`                     | `Ana Pérez`            |
| `phone`                    | `null`                 |
| `profile_image_asset_id`   | `null`                 |
| `referral_code`            | `ANA7K2`               |
| `created_at`, `updated_at` | `2026-08-29T14:00:00Z` |

Profile editing may update the name, phone, and finalized profile-image link.
Login email and password never move into this table. Retrying compatible pending
Account creation reuses this row rather than creating another Client.

### `staff_members`

**Purpose:** Store a Staff Member’s profile and exactly one fixed Role while
keeping their login security on Account.

**Typical insert trigger:** An Administrator creates Luis as a Trainer and
invites him through an Activation Link.

| Field                      | Example after insert   |
| -------------------------- | ---------------------- |
| `id`                       | `staff_luis`           |
| `name`                     | `Luis Rojas`           |
| `phone`                    | `+59170000000`         |
| `role`                     | `trainer`              |
| `profile_image_asset_id`   | `null`                 |
| `created_at`, `updated_at` | `2026-08-29T15:00:00Z` |

The same transaction creates `account_luis` with `staff_member_id=staff_luis`.
A later profile-photo upload can fill `profile_image_asset_id`. Roles are fixed
enum values; there is no Role or permission table.

### `branches`

**Purpose:** Represent a physical studio location used to scope schedules,
operations, and non-Administrator Staff access.

**Typical insert trigger:** An Administrator creates the Sopocachi studio
location.

| Field                      | Example after insert      |
| -------------------------- | ------------------------- |
| `id`                       | `branch_sopocachi`        |
| `name`                     | `Sopocachi`               |
| `address`                  | `Av. Example 123, La Paz` |
| `created_at`, `updated_at` | `2026-08-29T16:00:00Z`    |
| `archived_at`              | `null`                    |

Archiving fills `archived_at` instead of deleting history. While active,
`Sopocachi`, `sopocachi`, and `Sopocachi` are treated as the same unique name.
All Branches use the accepted Bolivia business timezone; no timezone table or
column is required.

### `staff_branch_assignments`

**Purpose:** Grant a Trainer, Nutritionist, or Assistant operational membership
in a Branch without duplicating the Staff Member or Branch.

**Typical insert trigger:** An Administrator assigns Luis to work at the
Sopocachi Branch.

| Field             | Example after insert   |
| ----------------- | ---------------------- |
| `staff_member_id` | `staff_luis`           |
| `branch_id`       | `branch_sopocachi`     |
| `assigned_at`     | `2026-08-29T16:10:00Z` |

The Staff Member and Branch pair is the primary key, so retrying the assignment
cannot create a duplicate. Removing access deletes the current assignment and
records the sensitive change in `audit_records`. Administrators receive no
assignment rows because their accepted Role grants implicit access to all
Branches.

## How the rows work together

### Self-registering Client

One successful new-registration transaction creates the `clients` and
`accounts` rows, inserts separate Verification Link and registration
continuation rows in `authentication_tokens`, records the accepted
`authentication_throttle_events` event, and queues the separately reviewed
email job. Repeating registration for the same self-registered pending Account
reuses the existing Client and Account, preserves the private continuation,
and replaces only the Verification Link when the email limits permit it. The
flow creates no `authentication_sessions` row. A session exists only after
verification and a later successful Login.

### Staff invitation

One authorized creation transaction creates `staff_members`, `accounts`, the
initial `staff_branch_assignments` rows when applicable, an Activation Link in
`authentication_tokens`, the accepted throttle event, an `audit_records` row,
and the email job. Administrators receive no Branch assignments.

### Durable notification and push

A business event creates one `notifications` inbox row per recipient Account.
The dispatcher then creates one `notification_deliveries` row per active
`account_devices` row. A missing or failed push delivery never removes the
durable Notification.

### Profile photo

Starting an upload creates `image_assets`. Verification and safe processing
advance that row. Only a finalized asset may then be referenced by
`clients.profile_image_asset_id` or `staff_members.profile_image_asset_id`.
Replacement detaches and schedules deletion of the old object according to the
accepted upload lifecycle.
