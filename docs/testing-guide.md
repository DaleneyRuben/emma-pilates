# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area                         | What you can test now                                                                                                           | Current limit                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile app                   | Open the Expo app in the iOS Simulator and inspect the initial screen, fonts, colors, safe-area layout, accessibility label, and signed-out startup restoration | The visible screen is still a foundation placeholder; registration and Login screens are not connected yet                                      |
| Backend health               | Confirm that the API is running                                                                                                 | This checks only that the HTTP process is alive, not the database or worker                                                                                   |
| API documentation            | Open Swagger and inspect or send requests to every current endpoint                                                             | Swagger does not make unfinished journeys complete                                                                                                            |
| Client registration          | Create a pending Client registration in a local PostgreSQL database                                                             | The verification email cannot be viewed yet                                                                                                                   |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration                | Resend deliberately gives the same neutral response whether it sends or suppresses an email                                                                   |
| Email verification           | Confirm that an unknown token returns `invalid`                                                                                 | A valid token cannot be obtained manually until local email capture is runnable                                                                               |
| Login and logout             | Create an opaque mobile Authentication Session, inspect its current Account identity, and revoke it                             | Until the mobile Login screen is built, use Swagger and the local-only activation step below                                                                  |
| Login throttling             | Confirm repeated failures temporarily stop password checks and return `Retry-After`                                             | Use a made-up email so you do not throttle an Account you need                                                                                                |
| Account security             | Inspect an invalid link, request password recovery neutrally, and change a signed-in Account password                           | Valid activation and recovery links cannot yet be copied from the in-process local email capture                                                              |
| Automated checks             | Run mobile identity, backend, API-contract, type, lint, and build checks                                                        | Database integration tests require Docker Desktop or an explicitly disposable PostgreSQL test database                                                        |
| Admin web                    | Open the Vite starter page and verify that the development server works                                                         | No Pilates admin features have been built yet, so this is not a product test                                                                                  |

## Before you begin

You need:

- macOS with Xcode and an iOS Simulator to test the iPhone app;
- Node.js, Corepack, and pnpm;
- PostgreSQL for manual backend testing; and
- Docker Desktop only if you want to run the automated database integration
  tests with their default setup.

The local services use these default ports:

| Service                 | Default port |
| ----------------------- | -----------: |
| Backend API and Swagger |       `3100` |
| Expo development server |       `8081` |
| Admin web starter       |       `5173` |
| PostgreSQL              |       `5432` |

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

On a clean installation, this simple screen proves that Expo starts, the
approved font loads, the design background is applied, SecureStore contains no
active credential, startup restoration finishes safely, and the
unauthenticated navigation flow is selected. The development app uses
`http://127.0.0.1:3100/api/v1` by default; non-local API URLs must use HTTPS.

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
{ "status": "ok" }
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
{ "status": "verification_required" }
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
{ "status": "invalid" }
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

## Test 5: try Login, current identity, throttling, and logout

The real email-link UI is not connected yet. For this local test only, create a
second registration and mark it verified directly in your local database. Never
use this shortcut on a shared or production database.

### A. Prepare one local active Account

Register a new address through Swagger, for example
`ana.login+1@example.com`, and remember the password you submitted. Then run:

```sh
psql emma_pilates -c "UPDATE system.accounts SET email_verified_at = CURRENT_TIMESTAMP, activated_at = CURRENT_TIMESTAMP, pending_expires_at = NULL WHERE email = 'ana.login+1@example.com';"
```

The command should report `UPDATE 1`. If it reports `UPDATE 0`, check that the
email exactly matches the registration response.

### B. Log in

In Swagger, open `POST /api/v1/authentication-sessions`. You may leave the
optional `x-client-identifier` header empty for this manual test. Send:

```json
{
  "email": "ana.login+1@example.com",
  "password": "the same password used during registration"
}
```

Expected response code: `201`. Copy the returned `credential`. It is a secret,
so do not commit it or include it in screenshots.

### C. Inspect the signed-in identity

Select **Authorize** at the top of Swagger and paste the raw credential into
the `bearer` field. Swagger adds the `Bearer` prefix for you.

Open `GET /api/v1/authentication-sessions/current`. Expected response code:
`200`. The response should identify the Account as a Client and include its
`clientId`.

### D. Log out

Open `DELETE /api/v1/authentication-sessions/current`. Expected response code:
`204`. Calling the current-session endpoint again with the old credential
should now return `401` with `authentication_required`.

### E. See progressive throttling safely

Use a made-up email such as `nobody.login-test@example.com`. Submit the same
wrong Login six times. Those attempts return the same neutral `401`
`authentication_failed` response. Submit once more before 30 seconds pass.
That request should return `429`, stable code `login_throttled`, and a
`Retry-After` header. The response does not reveal whether the email belongs to
an Account.

## Test 6: try Account security

Keep the backend running and use Swagger. For the signed-in step, complete
Test 5 through **C. Inspect the signed-in identity** first and leave its bearer
credential authorized in Swagger.

### A. Inspect an invalid one-time link

Open `POST /api/v1/authentication-links/inspection` and send:

```json
{ "token": "not-a-real-link-secret" }
```

Expected response code: `200`, with:

```json
{ "status": "invalid" }
```

The response deliberately contains no Account ID, email, Client, or Staff
Member information.

### B. Request password recovery

Open `POST /api/v1/password-recovery-requests` and send either a real local
Account email or a made-up address:

```json
{ "email": "ana.login+1@example.com" }
```

Expected response code: `202`, with:

```json
{ "status": "accepted" }
```

The same response is returned when the address is unknown or temporarily
rate-limited. This prevents the endpoint from revealing who has an Account.

### C. Change the signed-in Account password

Open `PATCH /api/v1/accounts/current/password`. Swagger uses the bearer
credential you authorized during Test 5. Send:

```json
{
  "currentPassword": "the same password used during registration",
  "newPassword": "a different local test password"
}
```

Expected response code: `204`. The current Authentication Session remains
active, but every other Authentication Session for that Account is revoked.
Confirm the current session still works with
`GET /api/v1/authentication-sessions/current`.

Submitting the old password to `POST /api/v1/authentication-sessions` should
now return the neutral `401` `authentication_failed` response. The new password
should create a new Authentication Session.

If `currentPassword` is wrong, the change returns `400` with stable code
`current_password_incorrect` and changes nothing.

### D. What requires automated tests for now

The backend can activate an Account and complete password recovery with valid
single-use links. However, the development email capture currently exists only
inside the worker process and has no beginner-facing inbox or command that
reveals a captured link. Until that viewer exists, use the automated tests for
successful activation, link expiry, recovery-wide session revocation, and the
replacement credential.

## Test 7: run the automated checks

You do not need to understand the test code to run it. A successful Jest run
ends with green `PASS` lines and no failed suites.

### Backend unit tests

```sh
pnpm --filter @pilates/backend test
```

This currently covers backend domain behavior, security helpers, registration
rules, job behavior, and worker building blocks. It does not run the separate
backend end-to-end or database integration suites.

### Mobile automated tests

```sh
pnpm --filter @pilates/mobile exec jest --runInBand
```

These tests verify ordinary and biometric SecureStore credential persistence,
explicit Face ID/fingerprint unlock, biometric-key invalidation, generated-client
bearer requests, startup Account restoration, every Role route, logout and
Account cache cleanup, safe authentication-link parsing, and
startup/foreground native link ingress. They do not create the complete visible
Login or recovery screens.

### Biometric testing limitation

The iOS Simulator can prove that the app starts, bundles, and displays the Face
ID entry when a protected credential exists, but it does not enforce SecureStore
biometric authentication like a physical iPhone. Expo Go also cannot test this
Face ID configuration because it does not contain this project's native Face ID
permission message.

A complete manual biometric test therefore requires a physical iPhone and a
Pilates development or release build. The visible Login flow that lets a tester
create a protected session is still waiting for `MOB-004`. Until then, run the
mobile automated tests above; they cover the opt-in, locked, unlock,
invalidation, and logout behavior without exposing a real credential.

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
- retrieving a valid activation or password-recovery link from a local inbox;
- completing successful activation or password recovery manually;
- visible mobile Login, logout, recovery, or password-change screens;
- opting a real Login into Face ID/fingerprint protection before the visible
  Login flow exists;
- enforcing a SecureStore Face ID prompt in Expo Go or the iOS Simulator;
- opening a production Universal Link or Android App Link before the public
  mobile-link domain and native association files are configured;
- working Client Home, class browsing, booking, plans, payments, profile, or
  notifications;
- working Trainer, Assistant, Administrator, or Nutritionist mobile screens;
- mobile-to-backend requests initiated from a visible form or button;
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
