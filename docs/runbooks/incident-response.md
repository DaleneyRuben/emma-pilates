# Runbook: incident response

Implements decision G10 of
[BE-007](../implementation/BE-007-data-governance-proposal.md). Use it when
something is wrong in production: personal data may have been exposed, the data
looks lost or corrupted, an account or secret is compromised, or the service is
down. The studio owner leads every incident; an Administrator they name helps.

## Severity

| Level | When | First reply |
| --- | --- | --- |
| **SEV1** | Personal data was or may have been exposed, data is lost or corrupted, or a secret or Administrator Account is compromised | Immediately; work until contained |
| **SEV2** | A security control fails (for example sessions do not revoke) without evidence of misuse, or the service is down for everyone | Within 1 hour |
| **SEV3** | Part of the service is degraded, or a job is failing, with no data at risk | Same business day |

When unsure between two levels, pick the higher one and lower it later.

## 1. Declare and record

Open a row in the incident log below with the time, who noticed, and what was
seen. Keep adding a line for every action you take, with the time. Do not
delete lines; corrections are new lines.

Save the logs the same day: Northflank keeps a container's logs for 30 days
after they are written, so copy the relevant window for `api`, `worker`, and
the jobs out of the console (or tail it with the Northflank CLI into a file
kept outside the repository and the chat) before it ages out; see
[«Logs and retention»](../architecture/infrastructure.md#logs-and-retention)
for what else holds evidence.

## 2. Freeze deploys

Stop new releases so the evidence and the state stay as they are. Since
EXT-017 production is released only when a person starts `Release
Production`, so do not start it, and disable it so nobody else does:
`gh workflow disable "Release Production" --repo DaleneyRuben/emma-pilates`.
If staging is involved too, also disable `Release Staging` (a merge to `main`
releases it). Do not run the `migrate` job by hand and do not build the
Northflank services from the console. Vercel deploys the admin web only
through those workflows (Git deployments are off), and the apps change only
through EAS, so publish no EAS Update either. When the incident is closed,
`gh workflow enable` each workflow again.

## 3. Contain

Do the smallest step that stops the harm, and write each step in the log.

**Revoke sessions in bulk.** Run inside a transaction on the production
database, with the owner's approval, and record the row counts in the log.
Revoking uses the existing `security_action` reason. An UPDATE only; rows are
never deleted (ADR-0086).

```sql
BEGIN;
-- Every session, every Account:
UPDATE system.authentication_sessions
SET revoked_at = now(), revocation_reason = 'security_action'
WHERE revoked_at IS NULL;

-- One Role only, for example administrators ('administrator', 'assistant',
-- 'trainer', 'nutritionist'); use instead of the statement above:
UPDATE system.authentication_sessions s
SET revoked_at = now(), revocation_reason = 'security_action'
FROM system.accounts a
JOIN booking.staff_members m ON m.id = a.staff_member_id
WHERE s.account_id = a.id AND s.revoked_at IS NULL
  AND m.role = 'administrator';

-- Unused links (activation, recovery, email change) can no longer be opened:
UPDATE system.authentication_tokens
SET invalidated_at = now()
WHERE used_at IS NULL AND invalidated_at IS NULL;
COMMIT;
```

Everyone must sign in again. Say so to the people affected. To lock one Account,
an Administrator deactivates the Staff Member in the admin web (IDN-007), or
closes a Client's Account from AW22 (BE-007), both of which are audited.

**Other containment:** switch the API to maintenance by scaling it to zero in
Northflank when data is being read or changed by someone who should not; block
a leaked object-storage key by rotating it (step 4).

## 4. Rotate secrets

Secrets live in the provider that runs the process
([ADR-0079](../adr/0079-keep-runtime-secrets-in-environment-providers.md)). After
a suspected leak, rotate what could have been read, then redeploy so the API and
worker pick up the same values. The step-by-step procedure for each one, the
order that avoids downtime, and the yearly calendar are the
[secrets rotation runbook](./secrets-rotation.md); this table says what each
rotation costs.

Each environment has its own values: production's are in Northflank's
`production` secret group (team `emma-pilates`), staging's in the `staging`
group (team `emma-pilates-staging`). Rotate the environment that leaked;
[infrastructure](../architecture/infrastructure.md) lists where every value
lives. Northflank needs a restart of `api` and `worker` after a secret group
changes.

| Secret | Where | Effect of rotating |
| --- | --- | --- |
| `DATABASE_URL` credentials (`avnadmin` for production, the staging role for staging) | Aiven, then Northflank (`api`, `worker`, `migrate`) | Create the new user/password first, update the group, then remove the old one |
| R2 access keys: `OBJECT_STORAGE_*` (images) and `BACKUP_STORAGE_*` (dumps) | Cloudflare, then Northflank | Old keys stop working at once; check an upload reaches READY and the next dump succeeds |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | Northflank (API and worker, same value) | Recipient throttle history no longer matches; it restarts empty, which is harmless |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` and `…_KEY_ID` | Northflank (API and worker, same value) | Queued but unsent links cannot be decrypted: invalidate unused links (step 3) and let people ask again |
| `RESEND_API_KEY` | Resend (a sending-only key per environment), then Northflank | Delete the old key in Resend after the restart; queued emails retry with the new one |
| `RESEND_WEBHOOK_SECRET` | Resend (the environment's webhook → rotate secret), then Northflank | Bounce and complaint events signed with the old secret answer 401 until the restart; Resend retries them |
| `ADMIN_WEB_PROXY_SECRET` | Vercel (the environment's project) and Northflank, same value | Until both match, the API does not trust the admin web's forwarded address (ADR-0087); redeploy the admin web through the release workflow |
| `EXPO_ACCESS_TOKEN` (the `push-sender` robot) | Expo, then Northflank (worker) | Pushes fail until the worker restarts with the new token |
| `ERROR_REPORTING_DSN`, `WORKER_HEARTBEAT_URL`, `BACKUP_HEARTBEAT_URL` | Better Stack, then Northflank | Errors and heartbeats are lost until the restart; a heartbeat may alert once |
| Deploy tokens: `NORTHFLANK_API_TOKEN`, `NORTHFLANK_STAGING_API_TOKEN`, `VERCEL_PRODUCTION_TOKEN`, `VERCEL_STAGING_TOKEN` | Northflank or Vercel, then `gh secret set` | Releases fail until the repository secret is replaced ([release runbook](./production-release.md#the-deploy-tokens)) |
| The Play submit key (`play-submit`) and `SENTRY_AUTH_TOKEN` | Google Cloud or Better Stack, then the Expo account | Store submissions or source-map uploads fail until replaced ([mobile release runbook](./mobile-release.md)) |
| `BACKUP_STORAGE_*` on the `backup` job (R2 token `northflank-production-backups`) and the owner's `mac-backup-restore` token | Cloudflare R2, then the `backup` job's variables (and the owner's password manager) | The next dump fails until replaced, then runs on the new key; the bucket lock keeps the last 25 days of dumps whatever the leaked token tries |
| `PRODUCTION_BACKUP_READ_*` (R2 token `github-staging-copy`) | Cloudflare R2, then `gh secret set` | A leaked token could read the dumps (every row of production): rotate at once; the copy workflow fails until replaced |
| `STAGING_DATABASE_PASSWORD` (the `emma_staging` role) | Aiven, then the Northflank `staging` group **and** `gh secret set` | Staging's `api` and `worker` reconnect after their restart; the copy workflow fails until the secret is replaced |
| The FCM V1 service-account key (Firebase Admin SDK) | Google Cloud, then both EAS projects' Android credentials | Android pushes fail until the new key is uploaded; no build needed |
| The Android upload keystores (EAS-held) | Play Console → App integrity → Request upload key reset | Play App Signing keeps the app signing key, so installed apps are unaffected; the next store build waits for Google's reset |
| `VERCEL_ORG_ID` and the project IDs, `AIVEN_CA_CERT`, the DSNs, `google-services.json` | — | Identifiers and public values: nothing to rotate, but note them in the log if they were in the leaked material |
| The owner's own provider logins | Each provider's account settings | Change the password and re-enrol two-factor authentication; sign out other sessions where the provider offers it (GitHub, Google, Cloudflare, Vercel, Expo); then rotate every token the account could issue |

Never paste a secret into the incident log, a chat, or a commit.

## 5. Restore from backup (only for lost or corrupted data)

Restoring loses every change after the last dump (up to 24 hours), so use it
only when the data cannot be repaired forward. Follow
[backups-and-restore-drills.md](./backups-and-restore-drills.md) to restore the
latest **verified** dump into a **new** database, run the checks there, then
point the API and worker at it by changing `DATABASE_URL`. Keep the damaged
database for the investigation. After the switch, revoke every session (step 3),
because the dump contains sessions that were valid at the time.

## 6. Tell the people affected

When personal data was or may have been exposed, email every affected Client
**within 72 hours of confirming it**, from the studio's own address:

- what happened, in plain Spanish, and when it was found;
- what data was involved (name, email, phone, plan and payment history);
- what the studio has done (sessions revoked, secrets rotated);
- what they should do (sign in again, watch for phishing that mentions the
  studio, change the password if they reuse it elsewhere);
- how to reach the studio.

Find the affected emails with the queries in
[personal-data-requests.md](./personal-data-requests.md) or a query on the
affected table. Record the send time and the number of recipients in the log.

## 7. Close and learn

Close the incident when the harm has stopped, the fix is released, and the
people affected are told. Within 5 business days, add the cause, the fix, and
one preventive action to the log row, and open a backlog item for the action.
Then unfreeze deploys.

## Incident log

| Opened | Severity | What happened | Actions taken | Affected | Notified | Closed | Cause and prevention |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |
