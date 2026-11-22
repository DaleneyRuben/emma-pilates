# Run Script (REL-016)

One-off scripts against staging or production, after TurboTenant's Run
Script workflow: reviewed in a pull request, started by hand from GitHub,
recorded in the database, and never run twice by accident.

## How it works

- Scripts live in `apps/backend/src/script-runner/scripts/`, one file each,
  listed in `scripts/index.ts` under a name that starts with the date it was
  written (`20261031-store-review-accounts`). A script is a
  `ScriptDefinition`: optional `requiredParams` and an async `run(context)`
  that gets Prisma, the params, `dryRun`, `now`, and `log`. A dry run must
  write nothing. When the job carries the secret group's three
  `AUTHENTICATION_*` keys, the context also has `authenticationEmail`
  (pg-boss, the email digest, and the link cipher), so a script can queue the
  Activation Link email the API queues; the keys have no local default here.
- The **Run Script** workflow (`.github/workflows/run-script.yml`) starts a
  run of Northflank's `migrate` job with the command
  `node dist/src/script-runner-main.js <name> …`. The free allowance has no
  job slot left, so the script borrows `migrate` for that run only; the job
  keeps `prisma migrate deploy` for the next release. GitHub holds only the
  Northflank token, never a database credential.
- The job runs the image of the **last release** of that environment, so a
  script runs only after the release that carries it.
- Every run is a row in `system.script_runs`: params, dry run, the GitHub run
  link, outcome, and error. A script that succeeded is refused
  (`already_succeeded`) unless the run is forced; one still marked running
  for less than two hours is refused (`already_running`). Dry runs are
  recorded but never count.
- The dispatch refuses while the `migrate` job has a run that has not ended,
  so a script never starts beside a release's migration. It has its own
  concurrency group, since joining the release's would cancel a release
  waiting there. Do not start a release while a script runs.
- The workflow waits 30 minutes for the run. If it stops waiting (or is
  cancelled), the run keeps going in Northflank: check it there before
  releasing or running anything else.
- Anyone with write access to the repository could dispatch an edited copy
  of the workflow from a branch with the production token, since GitHub
  environments with protection rules need a paid plan for a private
  repository. Today the owner is the only one with write access.

## Running a script

1. Merge the pull request that adds the script, and release it (staging
   releases itself; production by **Release Production**).
2. GitHub → **Actions** → **Run Script** → **Run workflow**. Pick `main` in
   «Use workflow from» (production refuses any other branch).
3. Choose the environment, type the script name, and the params as a JSON
   object. Tick **Dry run** first.
4. Open the job run in Northflank (team `emma-pilates` or
   `emma-pilates-staging` → project `default` → job `migrate` → Runs). The
   GitHub summary names it. Its log holds the script's JSON lines.
5. If the dry run reads right, run it again without **Dry run**.
6. **Force rerun** only when a script must run again on purpose, such as the
   store-review Accounts after the production reset.

The job's log is the only place a script's output lands. Northflank keeps it
for 30 days.

## Store-review Accounts (`20261031-store-review-accounts`)

Makes the Accounts Apple's and Google's reviewers sign in with, both marked
`store_review`:

- a verified Client, «Revisión tienda», holding the hidden tester Plan
  «Plan de cortesía» of 16 classes (REL-011) until `endsOn` (default: 90
  days), granted in the name of the oldest active Administrator;
- a Trainer of the same name with no Branch and no classes.

It refuses with `no_upcoming_sessions` (dry run too) while no scheduled
class lies ahead, since a reviewer who cannot book rejects the app. A rerun
renames Accounts made under the old «Revisión Google Play», but a courtesy
Subscription still active keeps the Plan name it was granted with («Acceso
de prueba» before 2026-11-22) until it ends; after the production reset
(REL-019) every grant carries the new name.

Params: `{"clientEmail": "revision-play@emmapilatesstudio.com",
"trainerEmail": "revision-staff@emmapilatesstudio.com"}`, and optionally
`"endsOn": "2027-01-31"`.

Each run gives both Accounts new passwords and logs them once, in
`store_review_account_ready` lines; copy them into Play Console → App content
→ Sign in details (and App Store Connect's review notes), never anywhere
else. A rerun reuses the Accounts and keeps a tester Plan that is still
active. The script refuses an email that belongs to any Account it did not
mark (`email_taken`), so a real person's Account is never taken over, and
one email for both (`emails_equal`). The `store_review_schedule` line counts
upcoming Sessions: the reviewer can only book if the schedule has some, so
load the test schedule on the admin web first when it says 0.

## Android closed-test studio (`20261120-android-test-studio`)

Makes production, which holds no real Clients and is reset after the Google
Play closed test, look like the open studio. Every write goes through the
service the admin web or the Staff app uses, so audits, invariants, and the
Activation Link emails are the product's own. It never sets or prints a
password, a token, or a link.

What it makes, skipping whatever already exists:

1. **Administrator** `emmapilatesstudio@gmail.com` («Emma Pilates Studio»
   unless `administratorName` says otherwise), pending with the 7-day
   Activation Link email. While no Administrator has activated it is the
   [bootstrap](./first-administrator-bootstrap.md) (`administrator_bootstrap.created`);
   once one has, she invites the address as a «Nuevo miembro» and every
   other write is in her name.
2. **Branch** «Achumani», Avenida Manuel Victor Garcia Lanza Nro 80.
3. **Class Types** «Reformer», «Mat Pilates», and «Cadillac», 8 places each.
4. **Plans**: the eight of [decisions](../decisiones-emma-pilates.md) §2.1,
   in that order, with the weekly caps of the 60- and 90-day Plans.
5. **Staff**, invited like «Nuevo miembro», each with an Activation Link
   email: `emmapilatesstudio+instructora1@gmail.com` and `+instructora2`
   (Trainers), `+asistente` (Assistant), `+coordinadora` (Coordinator, every
   Branch), `+nutricionista` (Nutritionist), all at Achumani. Names are
   «Instructora 1 (prueba)» and so on, phones the placeholders
   `+591 70000001` to `+591 70000005`, unless `staff` gives them. The
   Nutritionist publishes Monday to Saturday, 10:00 to 12:00. Pay rates and
   the evaluation price (Bs 70, Bs 50 to her) are the migrations' defaults;
   the `android_test_studio_rules` line says whether they still match the
   decisions (`matchesDecisions`).
6. **Week**: open-ended weekly series at Achumani every day at 09:00, 10:00,
   11:00, 16:00, 17:00, 18:00, 19:00, and 20:00 (60 minutes, 8 places), from
   the run's day, rotating the three Class Types and the two Trainers,
   published like «Publicar semana». A day and hour the Branch already runs is
   left alone.
7. **Minimum of Bookings** lowered from 2 to 1 for the test. The
   `android_test_minimum_bookings` line keeps the `previous` value.
8. **Clients**: each one in `clients` is invited like the Staff app's «Crear
   clienta nueva» (Activation Link email, 7 days). With
   `courtesyAccessEndsOn`, each also gets Courtesy Access (REL-011: the
   hidden Bs 0 «Plan de cortesía» of 16 classes, until that date, at
   most a year away) so she can book. The product has no way to give a
   catalog Plan without a payment, so there is no `giftPlan`: a cash sale
   would count as income.

That is 6 emails for the studio and one per Client, about 20 in all, inside
Resend's 100 a day.

### Params

All optional. The testers' data goes only in the workflow's params (kept in
`system.script_runs` and the GitHub run), never in the repository:

```json
{
  "administratorName": "Emma Pilates Studio",
  "staff": {
    "instructora1": { "name": "Ana Pérez", "phone": "71234567" },
    "nutricionista": { "name": "Carla Rojas" }
  },
  "clients": [
    { "email": "tester1@example.com", "name": "Tester Uno", "phone": "70000011" },
    { "email": "tester2@example.com", "name": "Tester Dos", "phone": "+591 60000012" }
  ],
  "courtesyAccessEndsOn": "2027-01-31"
}
```

`staff` takes the keys `instructora1`, `instructora2`, `asistente`,
`coordinadora`, and `nutricionista`, each with an optional `name` and
`phone`; a name or phone only applies to a member the run creates. A
`clients` entry needs all three fields and a Bolivian or international
mobile; at most 20 per run. An unknown param (`param_unknown: …`), an
invalid entry, or a tester address held by a Staff Member
(`client_email_taken`), or a studio address held by another kind of Account
(`administrator_email_taken`, `staff_email_taken: …`) is refused before
anything is written.

### Running it

1. The `migrate` job must carry the secret group's
   `AUTHENTICATION_EMAIL_DIGEST_KEY`, `AUTHENTICATION_LINK_ENCRYPTION_KEY`, and
   `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID`, the values the API and worker
   use; without them the script stops with `authentication_keys_missing`,
   on a dry run too, and with only some of them the runner stops before it
   records the run. The `worker` must be running to deliver the emails.
   If an Administrator with another email was bootstrapped and has not
   activated, the bootstrap refuses (`BootstrapPendingForAnotherEmailError`)
   before anything is written: she activates first, and the studio's address
   is then invited in her name.
2. **Dry run first**, with the params. Every step logs one
   `android_test_*` line with `action` (`bootstrap`, `invite`, `create`,
   `publish`, `lower`, `grant`, or `exists`, `keep`), and
   `android_test_studio_done` counts the emails it would queue.
3. Run it without **Dry run**. The studio can go first with `{}` and the
   testers later: a second run needs **Force rerun** (the first succeeded),
   skips everything that exists, and only invites the Clients it has not
   seen and gives them Courtesy Access. An existing Client is never sent
   another email.

### When an email does not arrive

- **Staff Member**: admin web › **Personal** › the pending member ›
  **Reenviar enlace**.
- **Client**: Staff app › **Buscar cliente** › her overview › **Cuenta
  pendiente de activación** › **Reenviar enlace**.
- **The studio's Administrator**: if another Administrator invited her,
  **Personal** › **Reenviar enlace** as above. If she was bootstrapped, rerun the
  [bootstrap](./first-administrator-bootstrap.md) with the same email, or
  print a still-queued link from the `api` shell
  («Read the link from the shell»). That command prints one queued
  Activation Link, whichever Account it belongs to, so use it only while
  nothing else is queued.

A link lasts 7 days; the pending Account 30.

### After the test

Restore the minimum of Bookings: admin web › **Reglas del estudio** ›
**Mínimo de reservas por clase** › 2 › **Guardar cambios** (the `previous`
value of the run's `android_test_minimum_bookings` line). The rest goes with
the production reset.
