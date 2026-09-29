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

## 2. Freeze deploys

Stop new releases so the evidence and the state stay as they are: pause
automatic deployment for the API and worker in Northflank and disable the
deployment workflow in GitHub Actions. Do not run migrations. Resume only when
the incident is closed.

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
worker pick up the same values:

| Secret | Where | Effect of rotating |
| --- | --- | --- |
| `DATABASE_URL` credentials | Aiven, then Northflank | Create the new user/password first, update both services, then remove the old one |
| R2 access keys (dumps, uploads) | Cloudflare, then Northflank | Old keys stop working at once; check the next dump succeeds |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | Northflank (API and worker, same value) | Recipient throttle history no longer matches; it restarts empty, which is harmless |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` and `…_KEY_ID` | Northflank (API and worker, same value) | Queued but unsent links cannot be decrypted: invalidate unused links (step 3) and let people ask again |
| Email provider key, Better Stack tokens, Northflank and Vercel deploy tokens | Each provider | Rotate in the provider, then update where it is stored |

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
