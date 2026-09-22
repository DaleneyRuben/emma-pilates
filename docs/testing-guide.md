# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area                         | What you can test now                                                                                                           | Current limit                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client mobile app            | Use the real email-only Login, registration, pending-email, recovery-request, verification, activation, and password-recovery screens in the iOS Simulator, then Home, Plans, Plan detail, Mi plan, Perfil, and Editar perfil with the fixture Accounts | Class browsing and bookings are still placeholders; paying for a Plan from the app is not available yet |
| Staff mobile app             | Open the separate Staff Login app in the iOS Simulator, log in with a fixture Staff Account, and verify that Client registration is unavailable                  | Assistant, Administrator, and Nutritionist destinations are still placeholders                                                                |
| Local development fixtures   | Load deterministic Branches, Plans, Class Types, Sessions, Subscription states, and active Client and Staff Accounts with one command                            | Promotions and receipt images are not included until image delivery is specified                                                              |
| Backend health               | Confirm that the API is running                                                                                                 | This checks only that the HTTP process is alive, not the database or worker                                                                                   |
| API documentation            | Open Swagger and inspect or send requests to every current endpoint                                                             | Swagger does not make unfinished journeys complete                                                                                                            |
| Client registration          | Register from the mobile app or Swagger and use change-email, resend, and cancellation actions                                  | The captured verification email does not have a beginner-facing inbox yet                                                                                     |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration                | Resend deliberately gives the same neutral response whether it sends or suppresses an email                                                                   |
| Email verification           | Confirm that an unknown token returns `invalid`                                                                                 | A valid token cannot be obtained manually until local email capture is runnable                                                                               |
| Login and logout             | Log in from the mobile app, restore the protected credential at startup, inspect identity in Swagger, and revoke it             | Visible logout is not available from the placeholder destination screens yet                                                                                  |
| Login throttling             | Confirm repeated failures temporarily stop password checks and return `Retry-After`                                             | Use a made-up email so you do not throttle an Account you need                                                                                                |
| Account security             | Request recovery from mobile, reject expired links before password entry, and exercise activation/recovery link screens with automated tests | Valid activation and recovery links cannot yet be copied from the in-process local email capture                                                    |
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
| Client Expo server      |       `8081` |
| Staff Expo server       |       `8082` |
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

## Test 1: open both mobile apps in the iOS Simulator

### A. Open the Client app

Start the Client app:

```sh
pnpm --filter @pilates/client-mobile ios
```

Expo should start an iOS Simulator and install the development app. The first
build can take a few minutes.

You should see:

- a light warm-beige background;
- the **Emma** wordmark in Lora;
- email and password fields;
- the **Iniciar sesión** button; and
- **Olvidé mi contraseña** and **Crear cuenta** actions.

Tap **Crear cuenta**. Confirm that the form asks only for name, email,
password, and password confirmation. It must not ask for a phone number. Return
to Login, tap **Olvidé mi contraseña**, and confirm that recovery asks only for
email. These navigation checks do not need the backend.

### B. Open the Staff app

Leave the Client Expo server running and open a second Terminal window. From the
project directory, start the Staff app:

```sh
pnpm --filter @pilates/staff-mobile ios
```

Expo Go displays one project at a time, so the Simulator switches from the
Client project to the Staff project. Both development servers may remain
running. You should see the same approved Login styling, **Iniciar sesión**, and
**Olvidé mi contraseña**, but you must not see **Crear cuenta**. Staff Accounts
are created by authorized Staff workflows, never through Client registration.

The two projects also have different native application identifiers, so Client
and Staff development or release builds can be installed side by side. Expo Go
is only a shared preview host and does not demonstrate that side-by-side
installation.

On a clean installation, these checks prove that each Expo project starts, the
approved fonts load, the design background and safe area are applied,
SecureStore contains no active credential for that app, startup restoration
finishes safely, and the correct unauthenticated flow is selected. Both
development apps use
`http://127.0.0.1:3100/api/v1` by default; non-local API URLs must use HTTPS.

### Quick accessibility check

On the simulated iPhone, open **Settings > Accessibility > VoiceOver** and turn
VoiceOver on. Return to the app and tap the primary button. VoiceOver should
announce “Iniciar sesión, button.” Turn VoiceOver off when finished.

To submit registration, Login, or recovery, keep Expo open and complete
**Test 2: prepare the local backend** in a second Terminal window.

### If the Simulator does not open

1. Open Xcode once and accept any requested license or component installation.
2. In Xcode, open **Window > Devices and Simulators** and confirm that an iPhone
   simulator exists.
3. Run the applicable Client or Staff command again.
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

The mobile email-link UI is connected, but the local captured-email viewer is
not available yet. For this local test only, create a second registration and
mark it verified directly in your local database. Never use this shortcut on a
shared or production database.

### A. Load the local development fixtures

With the migrations applied (Test 2), load the deterministic development data:

```sh
pnpm --filter @pilates/backend db:fixtures
```

The command refuses to run when `NODE_ENV=production`, and running it again is
safe: it updates the same rows instead of duplicating them. It creates three
Branches (Centro, Equipetrol, Urubó), three Class Types, the four designed
Plans, weekly Session Schedules with the next 30 days of Sessions, and these
active Accounts. Every fixture Account uses the password `emma-local-2026`.

| Email                        | Role          | Representative state                          |
| ---------------------------- | ------------- | --------------------------------------------- |
| `lucia@example.com`          | Client        | Active Plan with 5 of 8 classes left          |
| `valeria@example.com`        | Client        | Active Plan expiring in 3 days, 2 classes left |
| `isabel@example.com`         | Client        | Active Plan with no classes left              |
| `sofia@example.com`          | Client        | Expired Plan                                  |
| `mariana@example.com`        | Client        | Never purchased a Plan                        |
| `emma.vargas@example.com`    | Trainer       | Leads Sessions in all three Branches          |
| `daniela.ortiz@example.com`  | Trainer       | Leads Sessions in Centro and Urubó            |
| `andrea.suarez@example.com`  | Trainer       | Leads Pilates Prenatal in Equipetrol          |
| `camila.rojas@example.com`   | Assistant     | Assigned to Centro                            |
| `paola.mendoza@example.com`  | Administrator | Covers every Branch                           |
| `gabriela.flores@example.com`| Nutritionist  | Assigned to Centro                            |

These fixtures exist only for your local `emma_pilates` database. Never load
them into a shared-development or production database.

### B. Log in from the mobile app

Keep the backend and Client Expo server running. In the iOS Simulator, open the
Client app, enter `lucia@example.com` and the fixture password, then tap
**Iniciar sesión**. The app should open **Inicio** with "Hola, Lucía", the
"Paquete de 8 clases" card marked **Activa** with 5 of 8 classes and its
paid-through date, and an enabled **Reservar una clase** action. Log in as
`mariana@example.com` to see the **Comprar un plan** card and the disabled
booking action instead. Close and reopen the app; startup Session restoration
should return to **Inicio** without asking for the password again.

From Home, **Ver detalle** opens **Mi plan** and **Comprar un plan** opens
**Elige tu plan**; tapping a Plan shows its detail with the price breakdown
(the payment step is not available yet). The **Perfil** tab shows the Account
summary, a **Mi plan** row, and **Cerrar sesión**; **Editar** lets you change
the name and phone (the email stays read-only) and saves through the API.

The **Reservar** tab lists the fixture Sessions for the selected Branch, day,
and Class Type (past Sessions of today are hidden; full ones show **Lleno**).
Tapping a Session opens its detail; **Reservar** creates a real Booking and
lands on **Mis reservas** with a "Reserva confirmada" notice and the updated
class balance. A full Session offers **Unirme a la lista de espera**, and a
Client without remaining classes sees the disabled button with a link to the
Plans.

**Mis reservas** lists upcoming Bookings and Waitlist entries. A Booking more
than 2 h 30 before its start offers **Cancelar** behind a confirmation sheet
(the class returns to the balance); one inside that window shows **No
cancelable** and **Reprogramar** to another Session of the same day; a
Waitlist entry offers **Salir de la lista de espera**. With nothing upcoming,
the screen offers **Reservar una clase**. **Ver historial** opens the attended
classes grouped by month (empty for the fixtures until a Trainer records
attendance).

That Client Account must not authenticate in the Staff app. Use a Staff fixture
such as `emma.vargas@example.com` in the Staff app instead; it must be rejected
by the Client app.

For an incorrect password, the mobile app must show the same neutral message
regardless of whether the Account exists. After the backend returns `429`, the
button is disabled and the app counts down using the server's `Retry-After`
value.

### C. Log in through Swagger

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

### D. Inspect the signed-in identity

Select **Authorize** at the top of Swagger and paste the raw credential into
the `bearer` field. Swagger adds the `Bearer` prefix for you.

Open `GET /api/v1/authentication-sessions/current`. Expected response code:
`200`. The response should identify the Account as a Client and include its
`clientId`.

### E. Log out

Open `DELETE /api/v1/authentication-sessions/current`. Expected response code:
`204`. Calling the current-session endpoint again with the old credential
should now return `401` with `authentication_required`.

### F. See progressive throttling safely

Use a made-up email such as `nobody.login-test@example.com`. Submit the same
wrong Login six times. Those attempts return the same neutral `401`
`authentication_failed` response. Submit once more before 30 seconds pass.
That request should return `429`, stable code `login_throttled`, and a
`Retry-After` header. The response does not reveal whether the email belongs to
an Account.

## Test 6: try Account security

Keep the backend running and use Swagger. For the signed-in step, complete
Test 5 through **D. Inspect the signed-in identity** first and leave its bearer
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

## Test 7: read the Client discovery data

Load the fixtures (Test 5A), log in through Swagger as `lucia@example.com`, and
authorize the returned credential. These read-only endpoints back the Client
Home, class browsing, Plan, and profile screens:

| Endpoint                                | What you should see                                                       |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `GET /api/v1/clients/current`           | Lucía's name, email, phone, and referral code                             |
| `GET /api/v1/clients/current/subscription` | `status: active` with 5 of 8 classes left and `YYYY-MM-DD` dates      |
| `GET /api/v1/plans`                     | The four Plans with prices in centavos (`56000` is Bs 560)                |
| `GET /api/v1/branches`                  | Centro, Equipetrol, and Urubó with addresses                              |
| `GET /api/v1/class-types`               | Mat, Prenatal, and Reformer Pilates with descriptions                     |
| `GET /api/v1/sessions?branchId=…`       | Sessions in a Branch with Class Type and Trainer names and free seats     |
| `GET /api/v1/sessions/{sessionId}`      | One Session with its Branch, Class Type description, Trainer, and seats   |

Log in as `valeria@example.com`, `sofia@example.com`, or `mariana@example.com`
to see the `expiring_soon`, `expired`, and `none` Subscription statuses. A Staff
credential receives `403` with `booking_access_denied` from the two
`clients/current` endpoints.

The notification inbox is available to every signed-in Account:
`GET /api/v1/notifications` (cursor pages), `GET /api/v1/notifications/unread-count`,
`POST /api/v1/notifications/{id}/read`, and `POST /api/v1/notifications/read-all`.
A Client promoted from a Waitlist receives "¡Tienes un cupo!…" inside the same
transaction, and the worker records "Tu plan vence en 3 días." once for every
Subscription that ends in three days (Valeria's fixture qualifies today).

### Buying a Plan through Swagger (PAY-002)

Log in through Swagger as `mariana@example.com` (no Subscription). Every
command below needs an `idempotency-key` header with a fresh UUID; sending the
same key again returns the same result instead of a duplicate.

| Step | Endpoint                                              | What you should see                                                                     |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | `GET /api/v1/transfer-instructions`                   | Beneficiary, bank, account number, and `qrImageUrl` (`…/transfer-instructions/qr`)      |
| 2    | `POST /api/v1/purchase-intents` `{ "planId": … }`     | `201` with frozen Plan snapshots, `amountDueCentavos`, `state: open`, 24 h `expiresAt`  |
| 3    | `GET /api/v1/purchase-intents/current`                | The same open Intent; `404 purchase_intent_not_found` once it is submitted or expired    |
| 4    | `POST /api/v1/uploads` + `PUT …/object` + `…/finalize`| A `TRANSFER_RECEIPT` image asset that the worker leaves `READY` (Test 6 upload flow)     |
| 5    | `POST /api/v1/purchase-intents/{id}/receipt`          | `receiptAttached: true`; another asset replaces the first one                            |
| 6    | `POST /api/v1/purchase-intents/{id}/submit`           | `201` pending transfer Payment; the Administrator inbox gets "Comprobante por revisar"  |
| 7    | `GET /api/v1/payments/current`                        | Your latest Payment with `state`, amounts, and `rejectionReason` once decided            |
| 8    | `GET /api/v1/clients/current/credit`                  | `availableCentavos`, `reservedCentavos` (held while a transfer is under review), activity |
| 9    | `GET /api/v1/clients/current/referrals`               | Your referral code and referred Clients as "Nombre A."                                  |

Rules you can check: a second open Intent returns `409 purchase_intent_open_exists`;
`lucia@example.com` (active Plan) gets `409 subscription_not_expired`; a Client
whose Credit covers the price can call `POST /api/v1/credit-purchases` and is
activated immediately without a QR. Registration accepts an optional
`referralCode` (another Client's code); an unknown code fails the whole
registration with `400 referral_code_invalid`. Open Intents expire 24 h later
through the worker, releasing their Credit.

### Reviewing transfers as the Administrator (STAFF-001)

Log in through Swagger as `paola.mendoza@example.com` (Administrator) and
authorize that credential:

| Endpoint                                              | What you should see                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/v1/administrator/payments/pending`          | Pending transfers oldest first with client, Plan, amount, `submittedAt`, receipt flag  |
| `GET /api/v1/administrator/payments/{paymentId}`      | The review projection plus `receiptUrl`                                                |
| `GET …/payments/{paymentId}/receipt`                  | The receipt image itself (`Cache-Control: no-store`); Trainers and Clients get `403`   |
| `POST …/payments/{paymentId}/confirm`                 | `state: confirmed`, a new Subscription starting today, the Client notified             |
| `POST …/payments/{paymentId}/reject` `{ "reason" }`   | `state: rejected` with the trimmed reason; the Client's Credit is released             |
| `POST /api/v1/administrator/sessions/{id}/cancel`     | `{ affectedBookings }`: every Booking refunded, waitlist closed, Clients + Trainer told |

Repeating the same decision returns the same result; the opposite decision
answers `409 payment_confirmation_conflict`. A Session without Bookings answers
`409 session_has_no_bookings` (the worker's empty check handles those), and a
started or cancelled one `409 session_not_cancellable`.

## Test 8: run the automated checks

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
pnpm --filter @pilates/mobile-core exec jest --runInBand
pnpm --filter @pilates/client-mobile exec jest --runInBand
pnpm --filter @pilates/staff-mobile exec jest --runInBand
```

The shared mobile-core tests verify ordinary and biometric SecureStore
credential persistence, explicit Face ID/fingerprint unlock, biometric-key
invalidation, generated-client bearer requests, startup Account restoration,
logout and Account cache cleanup, safe authentication-link parsing, and
startup/foreground native link ingress. They also exercise the visible Login,
registration, pending-email correction/resend/cancellation, verification,
activation, recovery-request, password-recovery, neutral rejection, and
server-timed throttling flows.

The Client and Staff app tests verify that each application has its own
credential namespace, links, navigation, and identity eligibility. They also
prove that Client registration exists only in the Client app, Client Accounts
cannot enter the Staff app, and Staff Roles cannot enter the Client app.

### Biometric testing limitation

The iOS Simulator can prove that the app starts, bundles, and displays the Face
ID entry when a protected credential exists, but it does not enforce SecureStore
biometric authentication like a physical iPhone. Expo Go also cannot test this
Face ID configuration because it does not contain this project's native Face ID
permission message.

A complete manual biometric test therefore requires a physical iPhone and a
Pilates development or release build. Run the mobile automated tests above for
the protected-session opt-in, locked, unlock, invalidation, and logout behavior
without exposing a real credential.

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

Without Docker, point the suite at your local PostgreSQL server through a
throwaway admin database whose name starts with `pilates_test_`:

```sh
createdb pilates_test_admin
TEST_DATABASE_URL="postgresql://$USER@localhost:5432/pilates_test_admin" \
  pnpm --filter @pilates/backend test:integration
```

Every test file still gets its own freshly migrated `pilates_test_*` database
on that server and drops it when it finishes, so files never see each other's
rows; the admin database itself stays empty. Any other database name is
refused.

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

## Test 9: try Perfil, the inbox, and password change in the apps

Load the fixtures (Test 5A) and start the API and the Client app (Test 5B).

### A. Client Perfil

Log in as `sofia@example.com` and open the **Perfil** tab. Below the summary
card you should see the rows **Mi plan**, **Notificaciones**, and **Cambiar
contraseña**, an outlined **Cerrar sesión** button, and the footer
"Emma Pilates Studio · versión 1.0". The Notificaciones row shows a small badge
with the unread count when it is greater than zero.

### B. The notification inbox

Sofia has no notifications by default, so the inbox shows "No tienes
notificaciones." with its supporting line. To see the full screen, create a few
rows for her Account with `psql` (development database only):

```sql
insert into system.notifications
  (id, account_id, category, type, business_event_key, title, message, created_at)
select gen_random_uuid(), a.id, 'booking_schedule', 'session_cancelled',
       'manual:' || gen_random_uuid(), 'Clase cancelada',
       'Tu clase de Reformer Pilates fue cancelada. Tu clase fue reembolsada a tu plan.',
       now() - interval '40 minutes'
from system.accounts a where a.email = 'sofia@example.com';
```

Pull the Perfil tab again: the badge shows `1`, and **Notificaciones** lists the
row under **Sin leer** with a dot and a relative time such as "Hace 40 minutos"
(yesterday's rows read "Ayer, 18:05", older ones "Hace 2 días"). Tap **Marcar
leídas**: the action disappears, everything moves under **Anteriores**, and the
badge is gone when you go back. Tapping a single row also marks it read.

### C. Change the signed-in password from the app

Open **Cambiar contraseña**. The **Guardar contraseña** button stays disabled
until the three fields are filled and the two new passwords match; a mismatch
shows "Las contraseñas no coinciden." under the last field. A wrong current
password returns you to the form with "La contraseña actual no es correcta."
under the first field. A correct change returns to Perfil, and the new password
works on the next login. Reload the fixtures afterwards to restore the shared
test password.

### D. Log out with confirmation

Tap **Cerrar sesión**. The app asks "¿Cerrar sesión?" first; **Cancelar** keeps
you signed in and **Cerrar sesión** returns to Login.

### E. Staff Perfil

Start the Staff app on port 8082 (`pnpm --filter @pilates/staff-mobile start`)
and open `exp://127.0.0.1:8082` in Expo Go. Log in as
`emma.vargas@example.com`. Every role root shows a circular avatar with two
initials at the top right (accessibility label "Tu cuenta"); tap it to open
**Perfil**. The screen is read-only: name, email, "Tus datos los actualiza
administración.", **Rol** (`Entrenadora`), **Sucursales** (`Centro, Equipetrol,
Urubó`), the **Notificaciones** and **Cambiar contraseña** rows, the outlined
**Cerrar sesión** button, and the version footer. Log in as
`paola.mendoza@example.com` to see **Administración** with "Todas las
sucursales". The staff inbox uses the empty-state line "Te avisaremos aquí
cuando haya algo que necesite tu atención."

### F. Offline behaviour

The apps are online-first. When the device loses connectivity, a banner reads
"Sin conexión. Mostrando la última información guardada." and only the class
schedule, upcoming Bookings, and the Subscription summary stay visible from the
Account-scoped cache; everything else needs the connection back. The iOS
Simulator shares the Mac's network, so this is easiest to see on a device with
airplane mode.

### Time zones

The backend pins every Prisma connection to UTC. If a timestamp you inserted
with `psql` shows up four hours off in the app, the API you are running is
older than this guide: rebuild it with `pnpm --filter @pilates/backend build`.

## What you cannot test yet

The following are not ready for manual product testing:

- receiving or viewing the locally captured verification email;
- opening a real verification link and completing successful verification;
- automatic cleanup of expired pending accounts through a running worker;
- retrieving a valid activation or password-recovery link from a local inbox;
- completing successful activation or password recovery manually;
- enforcing a SecureStore Face ID prompt in Expo Go or the iOS Simulator;
- opening a production Universal Link or Android App Link before the public
  mobile-link domain and native association files are configured;
- Promotions on Client Home, payments, or push notifications (the in-app inbox
  works, see Test 9);
- authenticated Assistant, Administrator, or Nutritionist journeys beyond
  Perfil and the inbox;
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
