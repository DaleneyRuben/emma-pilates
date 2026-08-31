# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area | What you can test now | Current limit |
| --- | --- | --- |
| Mobile app | Open the Expo app in the iOS Simulator and inspect the initial screen, fonts, colors, safe-area layout, and accessibility label | The visible screen is only a foundation placeholder; registration, Login, Client, and Staff screens are not connected yet |
| Backend health | Confirm that the API is running | This checks only that the HTTP process is alive, not the database or worker |
| API documentation | Open Swagger and inspect or send requests to every current endpoint | Swagger does not make unfinished journeys complete |
| Client registration | Create a pending Client registration in a local PostgreSQL database | The verification email cannot be viewed yet |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration | Resend deliberately gives the same neutral response whether it sends or suppresses an email |
| Email verification | Confirm that an unknown token returns `invalid` | A valid token cannot be obtained manually until local email capture is runnable |
| Automated checks | Run backend, API-contract, type, lint, and build checks | Mobile Jest currently has a dependency-wiring problem; database integration tests require Docker Desktop or an explicitly disposable PostgreSQL test database |
| Admin web | Open the Vite starter page and verify that the development server works | No Pilates admin features have been built yet, so this is not a product test |

## Before you begin

You need:

- macOS with Xcode and an iOS Simulator to test the iPhone app;
- Node.js, Corepack, and pnpm;
- PostgreSQL for manual backend testing; and
- Docker Desktop only if you want to run the automated database integration
  tests with their default setup.

The local services use these default ports:

| Service | Default port |
| --- | ---: |
| Backend API and Swagger | `3100` |
| Expo development server | `8081` |
| Admin web starter | `5173` |
| PostgreSQL | `5432` |

These defaults avoid the `8080`, `3000`, `3005`, and `3015` ports used by the
other local project.

Open Terminal and move into the project:

```sh
cd /Users/rubendaleney/projects/Pilates
```

Install the project dependencies:

```sh
corepack enable
pnpm install
```

You only need to install dependencies again when `pnpm-lock.yaml` changes or
you start from a new copy of the project.

## Test 1: open the mobile app in the iOS Simulator

Start the mobile app:

```sh
pnpm --filter @pilates/mobile ios
```

Expo should start an iOS Simulator and install the development app. The first
build can take a few minutes.

You should see:

- a light warm-beige background;
- the heading **Iniciar sesión** in the Lora font;
- the content inside the iPhone safe area; and
- no working form or buttons yet.

This simple screen proves that Expo starts, the approved font loads, the design
background is applied, and the unauthenticated navigation flow is selected.

### Quick accessibility check

On the simulated iPhone, open **Settings > Accessibility > VoiceOver** and turn
VoiceOver on. Return to the app and tap the heading. VoiceOver should announce
“Iniciar sesión.” Turn VoiceOver off when finished.

Do not report the missing form as a bug. It belongs to a later mobile backlog
item.

### If the Simulator does not open

1. Open Xcode once and accept any requested license or component installation.
2. In Xcode, open **Window > Devices and Simulators** and confirm that an iPhone
   simulator exists.
3. Run the mobile command again.
4. If Expo was already running, press `i` in its Terminal window.

Press `Ctrl+C` in Terminal when you want to stop Expo.

## Test 2: prepare the local backend

These steps create and update a database named `emma_pilates` on your own
computer. Never run them with a shared-development or production database URL.

First, make sure PostgreSQL is running:

```sh
pg_isready
```

A response containing `accepting connections` means it is ready. Then create
the local database and configuration file:

```sh
createdb emma_pilates
cp -n apps/backend/.env.example apps/backend/.env
```

If `createdb` says the database already exists, that is fine. The `-n` option
keeps an existing `.env` file instead of overwriting your local settings.

If you created `apps/backend/.env` before the default changed, open it and make
sure it contains:

```dotenv
PORT=3100
```

If PostgreSQL is installed through Homebrew but `pg_isready` does not report
`accepting connections`, run `brew services list`, find the service whose name
starts with `postgresql`, and start that exact service with
`brew services start SERVICE_NAME`.

Apply the project's already approved, committed migrations:

```sh
pnpm --filter @pilates/backend db:migrate:deploy
```

This creates the current Pilates tables and the pg-boss job-queue tables in
your local database.

Start the backend:

```sh
pnpm dev:backend
```

Keep this Terminal window open. The API normally uses
`http://localhost:3100`.

## Test 3: check the API and use Swagger

Open these addresses in a browser:

- Health check: [http://localhost:3100/health/live](http://localhost:3100/health/live)
- Interactive API documentation: [http://localhost:3100/docs](http://localhost:3100/docs)

The health check should show:

```json
{"status":"ok"}
```

Swagger is the easiest way to test the backend without learning command-line
HTTP tools:

1. Open an endpoint row.
2. Select **Try it out**.
3. Edit the example JSON if the endpoint needs input.
4. Select **Execute**.
5. Read the response code and response body shown below the form.

## Test 4: try the current registration journey

Use the endpoints in this order. Use a new email address for a clean test, such
as `your-name+1@example.com`.

### A. Start registration

In Swagger, open `POST /api/v1/client-registrations` and send:

```json
{
  "name": "Ana Clienta",
  "email": "ana+1@example.com",
  "password": "a local test password"
}
```

Expected response code: `202`.

The response looks like this:

```json
{
  "status": "verification_required",
  "email": "ana+1@example.com",
  "registrationContinuation": "a-long-secret-value"
}
```

Copy `registrationContinuation`. It is the temporary secret used for the next
three actions. Treat it like a password and do not commit it to Git or share it
in screenshots.

### B. Correct the pending email

Open `POST /api/v1/client-registrations/email-corrections` and send your copied
secret with a different email:

```json
{
  "registrationContinuation": "paste-your-secret-here",
  "email": "ana.corrected+1@example.com"
}
```

Expected response code: `202`. The response should contain
`verification_required` and the corrected email.

### C. Request another verification email

Open `POST /api/v1/client-registrations/verification-resends` and send:

```json
{
  "registrationContinuation": "paste-your-secret-here"
}
```

Expected response code: `202`, with:

```json
{"status":"verification_required"}
```

The response is intentionally neutral. For privacy and abuse prevention, it
does not reveal whether an email was queued or temporarily rate-limited.

### D. Test an invalid verification token

Open `POST /api/v1/client-email-verifications` and send:

```json
{
  "verificationToken": "not-a-real-verification-token"
}
```

Expected response code: `200`, with:

```json
{"status":"invalid"}
```

### E. Cancel the pending registration

Do this last because it deletes the pending registration. Open
`POST /api/v1/client-registrations/cancellations` and send:

```json
{
  "registrationContinuation": "paste-your-secret-here"
}
```

Expected response code: `204`. A `204` response has no body. Reusing that
continuation afterward should not expose whether the old pending registration
still exists.

### Check request validation

To see the standard error format, try registration with an empty name, an
invalid email, and an empty password:

```json
{
  "name": "",
  "email": "not-an-email",
  "password": ""
}
```

Expected response code: `400`. The response uses Problem Details and includes
the stable code `invalid_request`.

Press `Ctrl+C` in the backend Terminal when you are finished.

## Test 5: run the automated checks

You do not need to understand the test code to run it. A successful Jest run
ends with green `PASS` lines and no failed suites.

### Backend unit tests

```sh
pnpm --filter @pilates/backend test
```

This currently covers backend domain behavior, security helpers, registration
rules, job behavior, and worker building blocks. It does not run the separate
backend end-to-end or database integration suites.

### Known mobile test-runner problem

Mobile component tests exist for the shell, navigation decisions, UI
primitives, API adapter, and local persistence boundaries. However, this command
currently fails before those tests start:

```sh
pnpm --filter @pilates/mobile test
```

The current error is `Cannot find module 'jest/package.json'`. The mobile
package invokes Jest without declaring the Jest executable it needs. Because of
that same issue, the root `pnpm test` command also stops at the mobile package.
This is a project setup problem, not a failure caused by your computer or by a
mobile feature you are testing.

### Backend HTTP end-to-end tests

```sh
pnpm --filter @pilates/backend test:e2e
```

These start the NestJS HTTP application inside Jest and verify routes, status
codes, validation, and response shapes. The registration use cases are mocked
in this suite, so this is an HTTP contract check rather than a real database
journey.

The Node.js `ExperimentalWarning` about VM Modules is expected for this command.

### Real PostgreSQL integration tests

Start Docker Desktop, wait until it reports that Docker is running, then run:

```sh
pnpm --filter @pilates/backend test:integration
```

These tests create a temporary PostgreSQL container, apply the committed
migrations, verify real constraints and transactions, and remove the container
afterward. They do not use or erase your `emma_pilates` database.

### Quality and generated-contract checks

Run these from the project root:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm check:api
```

What they mean:

- `lint` checks code-style and common programming mistakes;
- `typecheck` checks TypeScript types without running the apps;
- `build` proves that the current applications compile; and
- `check:api` proves that the committed OpenAPI document and generated API
  client match the backend controllers.

## What you cannot test yet

The following are not ready for manual product testing:

- receiving or viewing the locally captured verification email;
- opening a real verification link and completing successful verification;
- automatic cleanup of expired pending accounts through a running worker;
- Login, logout, session restoration, password recovery, or password change;
- working Client Home, class browsing, booking, plans, payments, profile, or
  notifications;
- working Trainer, Assistant, Administrator, or Nutritionist mobile screens;
- role-based navigation driven by a signed-in Account;
- mobile-to-backend requests from the visible app;
- running the existing mobile Jest tests until their Jest dependency is fixed;
- any Pilates admin-web workflow;
- real SendPulse email, Expo push notifications, or production deployment; and
- Maestro release-journey tests.

Some underlying rules for these areas may already have unit tests or approved
architecture, but that does not make the feature manually usable.

## When reporting a problem

Please include:

1. which numbered test you were following;
2. the exact command or Swagger endpoint;
3. what you expected;
4. what happened instead;
5. the response code and response body, if applicable; and
6. a screenshot for visual issues.

Do not include passwords, registration continuations, verification tokens,
database URLs containing credentials, or values from `.env`.
