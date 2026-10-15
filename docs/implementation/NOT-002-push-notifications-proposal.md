# NOT-002 push notifications proposal

Status: approved by the user on 2026-10-14, including the one pg-boss queue migration and committing `google-services.json`.

Governing decisions: [ADR-0016](../adr/0016-support-current-and-previous-mobile-releases.md) (additive API), [ADR-0024](../adr/0024-use-pg-boss-for-durable-background-jobs.md) (pg-boss, jobs in the caller's transaction), [ADR-0025](../adr/0025-use-expo-push-service-for-mobile-notifications.md) (Expo Push Service, Account-owned endpoints), [ADR-0036](../adr/0036-use-verified-https-links-through-a-central-mobile-ingress.md) (central mobile ingress), [ADR-0058](../adr/0058-reconcile-due-work-into-pg-boss.md), [ADR-0064](../adr/0064-use-bounded-retry-policies-by-job-family.md), [ADR-0065](../adr/0065-retain-failed-jobs-for-thirty-days.md), [ADR-0066](../adr/0066-monitor-workers-with-actionable-signals.md), [ADR-0067](../adr/0067-request-notification-permission-in-context.md), [ADR-0068](../adr/0068-enable-all-initial-notification-categories.md), [ADR-0069](../adr/0069-drive-badges-from-account-unread-count.md), [ADR-0070](../adr/0070-use-sound-only-for-actionable-notifications.md), [ADR-0078](../adr/0078-stage-production-database-migrations.md), [ADR-0079](../adr/0079-keep-runtime-secrets-in-environment-providers.md), [ADR-0086](../adr/0086-soft-delete-every-database-row.md).

## Schema

No table changes. `system.account_devices`, `system.notification_deliveries`, and `system.authentication_sessions.account_device_id` exist since the foundation migration, unused, with their CHECKs, partial unique indexes, and `RESTRICT` foreign keys (made `RESTRICT` by `20260928000000_soft_delete`).

## Migration

One migration, which only calls `pgboss.create_queue`, in the same shape as `20260921000000_uploads_finalize_queue`:

| Queue | Options |
| --- | --- |
| `notifications.push-dispatch.failed.v1` (dead letter, created first) | `retryLimit 0`, `retentionSeconds 2592000`, `deleteAfterSeconds 2592000` (30 days, ADR-0065) |
| `notifications.push-dispatch.v1` | `retryLimit 5`, `retryDelay 30`, `retryBackoff true`, `retryDelayMax 900`, `expireInSeconds 60`, `retentionSeconds 691200`, `deleteAfterSeconds 604800` (the uploads queue's values), `deadLetter notifications.push-dispatch.failed.v1` |

Both `policy 'standard'`, `partition false`, `notify false`. Production applies it through the staged migrate job (ADR-0078); it adds rows to `pgboss.queue` only and is backward compatible with the running release.

## Device endpoints

Notifications context, additive under ADR-0016, authenticated by the current Authentication Session.

- `PUT /api/v1/notifications/devices/current` with `{installationId, expoPushToken, platform}`:
  - Stores the SHA-256 digest of the installation id, never the raw value.
  - Same Account and digest: updates the token, `token_updated_at`, and `last_seen_at`.
  - A shared device that switches Account deactivates the old row with `account_changed` and inserts a new row.
  - A token that moved to another installation deactivates the other row with `token_replaced`.
  - Links the current Authentication Session to the device (`account_device_id`).
  - Runs in one transaction; a race on the partial unique indexes retries once.
- `POST /api/v1/notifications/devices/current/deactivate` with `{installationId}`: reason `permission_revoked`.
- Revoking a session deactivates its linked device in the same transaction. The session revocation reasons map to the two device reasons that exist: `account_disabled` and `account_closed` → `account_disabled`; `logout`, `logout_other_devices`, `password_changed`, `password_recovered`, and `security_action` → `logout`.
- Deactivation clears `expo_push_token`, as `account_devices_active_state_check` requires. Rows are never deleted.

## Dispatch

- `recordNotification` enqueues the dispatch job in the caller's transaction, with payload `{version: 1, accountId, businessEventKey}` and a singleton key, so a duplicate record does not send twice. The renewal reminder (`subscription-reminder-job.ts`) currently passes the Prisma client instead of a transaction; it gets a transaction for this.
- The worker reloads the notification, creates one `notification_deliveries` row per active device (`queued`), sends up to 100 messages per request to Expo, and stores the tickets (`submitted` with `provider_ticket_id`).
- A ticket with `DeviceNotRegistered` deactivates the device (`device_not_registered`) and fails the delivery.
- Network errors, 429, and 5xx are retried through the queue's backoff. Payload and credential errors fail permanently, are logged with a sanitized failure category, and are reported to Better Stack through the existing error reporting.
- Expo sits behind a project-owned provider interface (ADR-0025); its types stay in the adapter.

## Receipts

- A worker sweep every 5 minutes checks deliveries `submitted` more than 15 minutes ago, up to 1000 ticket ids per Expo call.
- Results become `delivered` or `failed`; `DeviceNotRegistered` in a receipt also deactivates the device. A delivery still `submitted` after 24 hours becomes `discarded`.
- The sweep joins the heartbeat progress gate, and the dispatch queue joins `watchedQueues` (ADR-0066).

## Catalog

A tested `notification-catalog.ts` sets each type's sound and lock-screen text as separate fields (ADR-0070). A type missing from the catalog is silent with generic copy.

| Type | Sound |
| --- | --- |
| `waitlist_promoted`, `session_cancelled`, `session_rescheduled_by_studio`, `session_assigned`, `evaluation_reminder_day`, `evaluation_reminder_hour`, `evaluation_cancelled_by_studio`, `payment_submitted`, `payment_rejected` | sound |
| `evaluation_booked`, `evaluation_cancelled` (Nutritionist), `payment_confirmed`, `subscription_expiring` | silent |

These are the 13 types the backend records today. Lock screens never show Evaluation details, Client names, rejection reasons, or amounts; those types use generic copy («Tienes una novedad sobre tu evaluación», and so on), and the full text stays in the inbox.

## Payload

- `data` holds only `{notificationId, type, destinationType, destinationId}`, with no URL (ADR-0036).
- `badge` is the Account's unread count at send time (ADR-0069).
- Android uses the channels `actionable` (default sound) and `updates` (silent).

## Configuration

- An optional `EXPO_ACCESS_TOKEN`, `nullable().default(null)` like the other optional providers; without it, sends go unauthenticated.
- Recommended: enable Expo's enhanced push security, which then requires the token.
- The token goes in Northflank's `production` secret group, never in the repository (ADR-0079). Production needs a manual restart after secret edits.

## Mobile

Shared code goes in `mobile-core`.

- Add `expo-notifications` and its config plugin to both apps, plus the Firebase `google-services.json`. Proposed: commit it, since Firebase documents that it isn't a secret.
- Permission explanation sheet (ADR-0067), shown only while the OS status is undetermined:
  - Client: after a Booking is confirmed, after joining a Waitlist, and after an Evaluation is confirmed.
  - Staff: when the role's home first loads.
  - «Ahora no» hides it for 30 days. Once permission is denied, the inbox shows an «Abrir Ajustes» notice instead.
- Register at startup, on foreground, and on token change.
- Handle taps from cold and warm start through a strict parser next to the existing link ingress (`packages/mobile-core/src/ingress`): unknown types or malformed ids fall back to the role home. A valid tap marks the entry read, then routes with the inbox's own destination map, extracted from the two notifications screens so push and the inbox share it.
- Add the Staff Administrator's `payment` route.
- Set the app-icon badge from the unread count, and clear it on sign-out.
- Queue design follow-up **91** in `docs/design/prompts/followups/` for the new sheet and notice.

## Builds

One native rebuild is needed: 2 iOS Simulator and 2 Android development builds (6 of this month's 30 are spent). I will say so before spending them.

## Console steps for the user

Done by the user in Brave, guided one step at a time with exact clicks. I never create accounts or enter credentials.

1. A free Firebase project with both Android apps (`com.emmapilates.client`, `com.emmapilates.staff`), `google-services.json`, and an FCM V1 service-account key.
2. Upload that key to each EAS project's Android credentials.
3. Optionally enable push security and create the access token.
4. Put the token in Northflank and restart.

## Verification

- Red → green → refactor with atomic commits through the commit skill. Files under 400 lines. Soft delete only.
- Backend: unit, integration, e2e, and queue-option tests.
- Mobile: RNTL tests.
- Android emulator: a real push to both development builds, covering sound versus silent, tap routing, and the badge.
- iPhone 16 Pro and iPad Pro 11 Simulators: the permission prompt, plus `xcrun simctl push` payloads for display, taps, and routing. Real iOS delivery is recorded as waiting for gate 9 (APNs key).
- Maestro with `JAVA_HOME` set to Android Studio's JBR; `adb` by hand if its Android driver won't start on the API 36.1 emulator.
- Update `docs/testing-guide.md` and `docs/architecture/infrastructure.md`, mark the item done with evidence and a handoff addendum, and open a pull request for the user to merge.
