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
  write nothing.
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
- The workflow shares the release's concurrency group, so a script never
  runs beside a release of the same environment.

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

- a verified Client, «Revisión Google Play», holding the hidden tester Plan
  of 16 classes (REL-011) until `endsOn` (default: 90 days), granted in the
  name of the oldest active Administrator;
- a Trainer of the same name with no Branch and no classes.

Params: `{"clientEmail": "revision-play@emmapilatesstudio.com",
"trainerEmail": "revision-staff@emmapilatesstudio.com"}`, and optionally
`"endsOn": "2027-01-31"`.

Each run gives both Accounts new passwords and logs them once, in
`store_review_account_ready` lines; copy them into Play Console → App content
→ Sign in details (and App Store Connect's review notes), never anywhere
else. A rerun reuses the Accounts and keeps a tester Plan that is still
active. The script refuses an email that belongs to any Account it did not
mark (`email_taken`), so a real person's Account is never taken over. The
`store_review_schedule` line counts upcoming Sessions: the reviewer can only
book if the schedule has some, so load the test schedule on the admin web
first when it says 0.
