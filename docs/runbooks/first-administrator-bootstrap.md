# Runbook: bootstrap the first Administrator

Use this once per environment, after the database is migrated and before anyone
needs to operate the studio. It follows
[ADR-0083](../adr/0083-bootstrap-the-first-administrator-through-a-command.md):
the command creates a pending Administrator Account and linked Staff Member,
records a `administrator_bootstrap.*` audit (actor kind `bootstrap`), and queues
the normal seven-day Activation Link email in the same transaction. It never
accepts, prints, or generates a password. Every later Staff Member is created
by that Administrator through the product (IDN-007).

## Before you run it

- The target database has every shipped migration applied (`GET /health/ready`
  returns 200, or run the migration command first).
- The worker is deployed or will be started: it delivers the queued email
  through Resend (EXT-001). If the email does not arrive, read the link from
  the shell instead («Read the link from the shell» below).
- You know the Administrator's real email address and name. The email becomes
  their login and cannot be changed by this command afterwards.
- The environment has its real `DATABASE_URL`,
  `AUTHENTICATION_EMAIL_DIGEST_KEY`, `AUTHENTICATION_LINK_ENCRYPTION_KEY`, and
  `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID`. They must be the same values the API
  and worker use, or the worker cannot decrypt the link and the email digest
  throttle will not match.

## Run

From the deployed backend image (never as part of API or worker startup):

```sh
BOOTSTRAP_ADMINISTRATOR_EMAIL=owner@example.com \
BOOTSTRAP_ADMINISTRATOR_NAME="Nombre Apellido" \
node dist/src/administrator-bootstrap-main.js
```

Locally, `pnpm --filter @pilates/backend admin:bootstrap` builds first and runs
the same entrypoint. Always set `DATABASE_URL` explicitly on the command line
when the local `.env` points somewhere you do not intend to change.

The command prints one JSON line and exits:

| Output | Exit | Meaning and next step |
| --- | --- | --- |
| `administrator_bootstrap_completed`, `status: created` | 0 | Pending Administrator created; the Activation Link email is queued. |
| `administrator_bootstrap_completed`, `status: activation_resent` | 0 | The same email was already pending; its old link is invalidated and a new one is queued, renewing the 30-day pending window. |
| `administrator_bootstrap_refused`, `reason: administrator_already_active` | 1 | An Administrator has already activated. Nothing changed; use the product to add staff. |
| `administrator_bootstrap_refused`, `reason: bootstrap_pending_for_another_email` | 1 | Another Administrator email is pending. Nothing changed. Rerun with that email, or wait until its 30-day pending window lapses and the worker removes it. |
| `administrator_bootstrap_refused`, `reason: email_in_use` | 1 | The email belongs to a Client or another Staff Member. Nothing changed; choose another email. |
| `administrator_bootstrap_refused`, `reason: email_throttled` | 1 | The recipient throttle (one per minute, five per hour, ten per day) has no room. Nothing changed; wait and rerun. |
| `administrator_bootstrap_invalid_configuration` | 1 | The listed variables are missing or invalid. Nothing ran. |
| `administrator_bootstrap_failed` | 1 | Unexpected failure (for example the database is unreachable). The transaction rolled back; fix the cause and rerun. |

Output never includes the email address, token, or link.

## Read the link from the shell (fallback)

From EXT-002 until EXT-001 (2026-10-14 to 2026-10-19) the production worker
ran without an email provider and left the Activation Link email queued, so
the link was read from the shell. Since EXT-001 the email
arrives; keep this for one that does not (a full daily quota, a suppressed
address). In the same Northflank `api` shell (Services → `api` → Shell),
print the link:

```sh
node dist/src/administrator-activation-link-main.js
```

It prints one JSON line, `activation_link_found`, whose `link` opens the
production admin web's **Crear contraseña** page
(`https://emma-pilates-admin.vercel.app/crear-contrasena?token=…`), or
`activation_link_not_found` (exit 1) when no current Activation Link is
queued. The link is the credential: open it in your own browser, set the
password there, and never paste it into a chat, ticket, or document. It lasts
seven days; rerunning the bootstrap with the same email invalidates it and
queues a new one. An email still queued for a link you already used is
skipped, because the worker rechecks that the link is current.

## After it runs

1. The Administrator opens the email and sets their password through the
   Activation Link (the same flow as any invited Staff Member). The link lasts
   seven days; rerunning the command with the same email issues a fresh one.
2. They log in to the Staff app (or admin web once WEB-002 exists) and see the
   Administrator destinations with every Branch.
3. Confirm with `select action_code, actor_kind, occurred_at from
   system.audit_records where action_code like 'administrator_bootstrap.%'`.

Concurrent runs are safe: a transaction advisory lock serializes them, so at
most one pending Administrator is ever created.
