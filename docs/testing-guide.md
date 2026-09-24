# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area                         | What you can test now                                                                                                           | Current limit                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client mobile app            | Use the real email-only Login, registration, pending-email, recovery-request, verification, activation, and password-recovery screens in the iOS Simulator, then Home, class browsing and booking, Mis reservas, history, Plans and transfer payment, Mi plan, referrals and Credit, Perfil, the inbox, and password change with the fixture Accounts (Tests 5, 9, 10) | The Promotions carousel and push notifications are not built yet; Evaluations are reached from Perfil and Home (Tests 15, 18) |
| Staff mobile app             | Open the separate Staff Login app in the iOS Simulator, log in with a fixture Staff Account, and verify that Client registration is unavailable; review transfers and cancel a Session as the Administrator (Test 10); search, invite, book, and take cash for a Client as the Assistant (Test 11); see the agenda and record attendance as a Trainer (Test 12) | — the Nutritionist agenda and Mi disponibilidad work too (Test 15) |
| Nutritionist Evaluations (API) | Publish, replace, and end Availability Blocks as the fixture Nutritionist; browse slots, book, list, and cancel Evaluations as a Client; see the agenda and cancel as staff through Swagger or curl (Test 7) | The same journeys work in both apps (Test 15); reminders need the worker and real time to pass |
| Local development fixtures   | Load deterministic Branches, Plans, Class Types, Sessions, Subscription states, referrals, the Nutritionist's Availability Blocks, and active Client and Staff Accounts with one command | Sessions beyond the fixtures' first 30 days appear only while the worker runs (it extends Session Schedules hourly); Promotions and receipt images wait for image delivery |
| Backend health               | Confirm that the API is alive, ready (PostgreSQL reachable and every migration applied), and passing the read-only smoke checks; read its JSON request logs | The worker is checked only through its heartbeat log; email, push, and object storage are not part of readiness |
| API documentation            | Open Swagger and inspect or send requests to every current endpoint                                                             | Swagger does not make unfinished journeys complete                                                                                                            |
| Client registration          | Register from the mobile app or Swagger and use change-email, resend, and cancellation actions                                  | The captured verification email does not have a beginner-facing inbox yet                                                                                     |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration                | Resend deliberately gives the same neutral response whether it sends or suppresses an email                                                                   |
| Email verification           | Confirm that an unknown token returns `invalid`                                                                                 | A valid token cannot be obtained manually until local email capture is runnable                                                                               |
| Login and logout             | Log in from the mobile app, restore the protected credential at startup, inspect identity in Swagger, and revoke it             | Log out from Perfil with a confirmation in both apps (Test 9)                                                                                                  |
| Login throttling             | Confirm repeated failures temporarily stop password checks and return `Retry-After`                                             | Use a made-up email so you do not throttle an Account you need                                                                                                |
| Account security             | Request recovery from mobile, reject expired links before password entry, and exercise activation/recovery link screens with automated tests | Valid activation and recovery links cannot yet be copied from the in-process local email capture                                                    |
| Automated checks             | Run mobile identity, backend, API-contract, type, lint, and build checks                                                        | Database integration tests require Docker Desktop or an explicitly disposable PostgreSQL test database                                                        |
| Admin web                    | Log in as the fixture Administrator, see the neutral rejection and the throttling countdown, request recovery, use the user menu, change the password, and log out (Test 24); then open the admin shell: the sidebar sections, the top bar, the Branch selector, and the narrow-browser drawer (Test 23) | Every section is still a placeholder until WEB-003 onward; valid activation and recovery links still cannot be read from the local email capture |

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
| Admin web               |       `5173` |
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

The readiness check at
[http://localhost:3100/health/ready](http://localhost:3100/health/ready)
answers `{ "status": "ready", "release": "local" }` once PostgreSQL is
reachable and every migration in `apps/backend/prisma/migrations` has been
applied. If you pull new code without running `pnpm db:migrate:dev`, it answers
503 with the problem code `not_ready` and names no dependency. Set `RELEASE_ID`
before starting the API to see a different release.

With the API running, the smoke check reads the same endpoints plus the
OpenAPI document and confirms that a protected route rejects anonymous callers.
It never books, pays, or changes anything:

```sh
cd apps/backend
SMOKE_EXPECTED_RELEASE=local pnpm smoke
```

It prints one JSON report and exits with status 1 when any check fails; a wrong
`SMOKE_EXPECTED_RELEASE` makes the readiness check fail with "serving release
local, expected …".

The API terminal now prints one JSON line per request with `environment`,
`service`, `release`, `reqId`, the method, and the path (never the query
string, headers, or body). Every response carries the same identifier in its
`x-request-id` header; send your own `x-request-id` (8 to 128 letters, digits,
`.`, `_`, `:`, or `-`) and it is kept. An unexpected failure answers the generic
"An unexpected error occurred" problem and logs one error line with that
`reqId` and only the error type, code, message, and stack. The worker prints
its heartbeat and failure records the same way with `service` set to `worker`.

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
safe: it updates the same rows instead of duplicating them. Re-running it also
resets every fixture Session to its scheduled start and end time while keeping
cancellations, so run it again if class times ever look shifted by four hours.
It creates three Branches (Centro, Equipetrol, Urubó), three Class Types, the
four designed Plans, weekly Session Schedules with the next 30 days of
Sessions, Gabriela's weekly Availability Blocks with their next 30 days of
Evaluation slots, and these active Accounts. Every fixture Account uses the password `emma-local-2026`.

| Email                        | Role          | Representative state                          |
| ---------------------------- | ------------- | --------------------------------------------- |
| `lucia@example.com`          | Client        | Active Plan with 5 of 8 classes left          |
| `valeria@example.com`        | Client        | Active Plan expiring in 3 days, 2 classes left; paid in cash; referred by Sofía |
| `isabel@example.com`         | Client        | Active Plan with no classes left              |
| `sofia@example.com`          | Client        | Expired Plan; Bs 60 of referral Credit; referred Valeria (awarded) and Mariana (pending) |
| `mariana@example.com`        | Client        | Never purchased a Plan; referred by Sofía     |
| `emma.vargas@example.com`    | Trainer       | Leads Sessions in all three Branches          |
| `daniela.ortiz@example.com`  | Trainer       | Leads Sessions in Centro and Urubó            |
| `andrea.suarez@example.com`  | Trainer       | Leads Pilates Prenatal in Equipetrol          |
| `camila.rojas@example.com`   | Assistant     | Assigned to Centro                            |
| `paola.mendoza@example.com`  | Administrator | Covers every Branch                           |
| `gabriela.flores@example.com`| Nutritionist  | Assigned to Centro                            |

The 30-day window starts on the day you run the command. With the worker
running (`pnpm --filter @pilates/backend start:worker`), it fills every Session
Schedule and Availability Block up to 30 days ahead when it starts and again
every hour, so you no longer need to re-run the command to keep classes ahead.
It only adds Sessions: it never moves, reopens, or deletes one, skips a
Session that would overlap another at the same Branch or for the same Trainer,
and ignores schedules at an archived Branch, for an archived Class Type, or
whose Trainer is not assigned to that Branch.

The running worker also cancels, once and for good, every fixture Session that
still has no Bookings two hours before it starts, and tells its Trainer. Book
a class first if you want to keep it for a manual test (Test 13).

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
(Test 10 walks through the payment). The **Perfil** tab shows the Account
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

### Acting for a Client as the Assistant (STAFF-003)

Log in through Swagger as `camila.rojas@example.com` (Assistant assigned to
Centro) and authorize that credential. Administrators may call the same
endpoints; Trainers and Clients get `403`.

| Endpoint                                                   | What you should see                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/assistant/clients?query=luc`                  | Up to 20 Clients whose name, email, or phone contains the text (2+ characters), with `accountStatus`     |
| `GET /api/v1/assistant/clients/{clientId}`                 | Name and contact, Subscription status with `YYYY-MM-DD` dates, next Booking, last two classes, Credit   |
| `GET …/clients/{clientId}/bookings`                        | Upcoming Bookings and Waitlist Entries with `branchId` and `actionable` (true only at your Branches)     |
| `GET …/clients/{clientId}/class-history`                   | Attended classes, newest first                                                                           |
| `GET …/clients/{clientId}/plan-quotes`                     | Every Plan with `creditAppliedCentavos` and the cash `amountDueCentavos` for this Client                 |
| `POST …/clients/{clientId}/cash-payments` `{ planId, branchId }` | `201` with the confirmed cash Payment and the new Subscription; needs an `idempotency-key` UUID     |
| `POST /api/v1/assistant/client-invitations` `{ name, email, phone? }` | `201 invited` with the new `clientId`; the worker queues the 7-day activation email           |
| `GET /api/v1/assistant/client-invitations/{clientId}`      | The pending invitation with `pendingExpiresAt` (30 days), `activationExpiresAt`, and `cancellable`       |
| `POST …/client-invitations/{clientId}/email-corrections` `{ email }` | New email, old links invalidated, fresh link sent                                              |
| `POST …/client-invitations/{clientId}/resends`             | A fresh link; a second send within a minute answers `429 email_throttled`                                |
| `POST …/client-invitations/{clientId}/cancellation`        | `204`; afterwards the invitation, Account, and Client are gone (`404 client_invitation_not_found`)       |

Inviting an email that already has a pending invitation answers `201
invitation_resent`; a pending self-registration answers `201
verification_pending` with a fresh 24-hour verification link; an active Client
or a Staff Member answers `409 email_in_use`. Booking for a Client uses the
existing `POST /api/v1/sessions/{id}/bookings` with `clientId` in the body, and
cancelling, rescheduling, or leaving the Waitlist uses the same endpoints as the
Client — all of them only for Sessions at your assigned Branch. A cash Payment
for a just-invited Client works before activation; from then on the invitation
cannot be cancelled (`409 invitation_has_activity`) and the 30-day cleanup keeps
the Client.

### Nutritionist Evaluations through Swagger (NUT-002)

The fixtures give `gabriela.flores@example.com` (Nutritionist, Centro) three
weekly Availability Blocks — Monday 09:00–13:00, Thursday 15:00–18:00, and
Saturday 09:00–12:00 — from the day you first load them, already cut into
45-minute slots for the next 30 Bolivia days. Log in as Gabriela and as
`lucia@example.com` and authorize each credential in turn. Commands marked
with a key need an `idempotency-key` header with a fresh UUID.

| Who | Endpoint | What you should see |
| --- | --- | --- |
| Client | `GET /api/v1/evaluation-slots?from=&to=&branchId=` | Bookable slots grouped by Bolivia `date`, each with Branch, Nutritionist, and `durationMinutes: 45`, plus `months` marking each month `available` or `used` |
| Client | `GET /api/v1/evaluation-slots/{slotId}` | One slot with `bookable` |
| Client | 🔑 `POST /api/v1/evaluation-slots/{slotId}/evaluations` | `201 booked` with `cancellableUntil` (start − 3 h); Gabriela's inbox gets "Nueva evaluación agendada: …" and Lucía keeps all her classes |
| Client | `GET /api/v1/evaluations?scope=upcoming` / `scope=past` | Booked Evaluations (past ones newest first, `cursor` pages); cancelled ones are not listed |
| Client | `DELETE /api/v1/evaluations/{evaluationId}` | `204`; the slot and the month are free again and Gabriela is told |
| Nutritionist | `GET /api/v1/nutritionist/evaluations` | Her upcoming booked Evaluations with the Client's name and `kind` `first` or `follow_up` |
| Nutritionist | `DELETE /api/v1/nutritionist/evaluations/{evaluationId}` | `204` at any time before the start; the Client gets "El estudio canceló tu evaluación…" and an `evaluation.cancelled_by_staff` audit row is written |
| Nutritionist | `GET /api/v1/nutritionist/availability-blocks` | Current and scheduled blocks by weekday with `effectiveFrom`, `effectiveUntil`, `slotsPerWeek`, and `upcomingBookedCount` |
| Nutritionist | 🔑 `POST /api/v1/nutritionist/availability-blocks` | `201` with the new block; its slots exist immediately |
| Nutritionist | 🔑 `POST …/availability-blocks/{blockId}/replacement` | The ended block, its replacement from the chosen date, and how many unbooked slots were withdrawn and booked Evaluations kept |
| Nutritionist | `POST …/availability-blocks/{blockId}/end` `{ "effectiveFrom" }` | The block ends from that date; booked Evaluations keep their slots |

Rules you can check: a second Evaluation in the same Bolivia month answers
`409 evaluation_month_used` (a slot at 20:15 on the last day of a month still
counts for that month); a slot starting within 3 hours is not listed and
answers `409 evaluation_booking_closed`; a taken or withdrawn slot answers `409
evaluation_slot_unavailable`; `valeria@example.com` (Plan ends before the slot)
and `mariana@example.com` (no Plan) get `409 no_eligible_subscription`;
cancelling within 3 hours of the start answers `409
evaluation_cancellation_window_closed`. Block times must sit on the 15-minute
grid and hold at least one 45-minute slot (`400
availability_block_invalid_range`), start today or later (`400
availability_block_effective_date_past`), be at a Branch assigned to the
Nutritionist (`403 branch_not_assigned`), and never overlap her other blocks,
even at another Branch (`409 availability_block_overlap`). Clients, Trainers,
and Assistants get `403 booking_access_denied` on the Nutritionist routes, and
staff get it on the Client routes.

With the worker running (`pnpm --filter @pilates/backend start:worker`), slots
are extended every hour as the 30-day horizon moves, and each booked
Evaluation gets "Recordatorio: tu evaluación nutricional es mañana…" 24 hours
before (only if it was booked earlier than that) and "…es en una hora…" one
hour before, each at most a minute late.

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

It also runs the architecture checks, including the audit catalog check: every
audit action code the backend writes must be listed in
[`docs/security/audit-event-catalog.md`](./security/audit-event-catalog.md),
and every listed code must be written somewhere. If you add or rename an
audited action, update that catalog in the same change or this test fails.

The unit suite also checks mobile contract compatibility (ADR-0016): the
committed `apps/backend/openapi/openapi.json` must not remove or change
anything the previous mobile release relies on, compared with
`apps/backend/openapi/mobile-baseline.json`. Run it alone with
`pnpm check:api-compat`; [the OpenAPI README](../apps/backend/openapi/README.md)
explains the rules and when to move the baseline.

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

### Admin web automated tests

```sh
pnpm --filter @pilates/admin-web test
```

These Jest and Testing Library tests render the whole admin web against an
in-memory router. Login shows one neutral rejection, counts down the server's
`Retry-After`, and returns to the page you wanted; the startup session read
restores a signed-in browser; a later `authentication_required` returns to
Login once; recovery requests stay neutral; the create-password page inspects
the link first and handles current, expired, used, and invalid links for both
activation and recovery; and the user menu changes the password and logs out
on desktop and narrow widths. Every sidebar entry opens its placeholder page, the current
section is marked, the Branch selector switches Branches and explains the
studio-wide pages, the narrow-browser drawer and bottom sheet work, unknown
paths land on "Página no encontrada", and list pages normalize `?page=` and
`?pageSize=`. Mock Service Worker answers the generated API client so the
same-origin fetcher, the RFC 9457 problem normalizer, and the retry policy
are checked without a backend. The table and form foundations are covered
too. `pnpm --filter @pilates/admin-web lint`, `typecheck`, `build`, and
`format:check` are the remaining quality checks for that app.

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

## Test 10: buy a Plan and check referrals and Credit in the Client app

Load the fixtures (Test 5A) and start the API and the Client app (Test 5B).
The fixtures give Sofía an expired Plan, two referred friends, and Bs 60 of
referral Credit; Mariana has no Plan, no Credit, and no referrals.

### A. Referrals and Credit from Perfil

Log in as `sofia@example.com` and open **Perfil**. The menu now reads **Mi
plan**, **Mis referidos**, **Mi crédito** (with the value `Bs 60` on the
right), **Notificaciones**, and **Cambiar contraseña**.

Tap **Mis referidos**. The card shows the code `REF-SOFIA` with a
**Compartir** button that opens the system share sheet with a message that
contains the code. Below it: "Comparte tu código. Cuando un amigo se registre y
haga su primer pago, ganas crédito.", a **Tu crédito** row with `Bs 60`, and
**Tus invitaciones** with one row per referred Client: initials, "Nombre A.",
either "Primer pago el 26 de agosto" with the green **Crédito ganado** badge
(Valeria Q.) or "Se registró el 17 de septiembre" with the amber **Esperando su
primer pago** badge (Mariana P.). Dates follow the fixture clock.

Tap **Tu crédito**. **Mi crédito** shows **Saldo a favor**, the amount `Bs 60`
in the largest type of the app, "disponibles", the line "Este crédito se aplica
automáticamente al monto que pagues por tu próximo plan.", a **De dónde viene**
list ("Valeria Q. · 26 de agosto" and `+Bs 60`), and the text link **Ver mis
referidos**.

Log in as `mariana@example.com` to see the empty states: **Mi crédito** reads
`Bs 0`, "Aún no tienes crédito. Invita a tus amigos para ganar." and a solid
**Ver mi código** button; **Mis referidos** shows `REF-MARIANA`, `Tu crédito
Bs 0`, and "Aún no has invitado a nadie. ¡Comparte tu código!".

### B. Buy a Plan with a bank transfer

The receipt upload is verified by the background worker, so start it next to
the API before this step:

```sh
pnpm --filter @pilates/backend start:worker
```

As Sofía, tap **Comprar un plan** on Home (her Plan is expired), pick
**Paquete de 8 clases**, and check **Detalle del plan**: price `Bs 560`, a
**Crédito aplicado** line with `−Bs 60`, and **Total a pagar** `Bs 500`. Tap
**Continuar al pago**.

**Pago por transferencia** shows the amount, the studio QR (locally the
placeholder image from `apps/backend/.data/transfer-qr.png`), the beneficiary,
bank, and account number from `TRANSFER_*`, and the line "Escanea el código con
tu app bancaria y transfiere el monto exacto.". Tap **Sube tu comprobante de
transferencia**: iOS asks for photo access the first time, then opens the
library (the Simulator ships with sample photos). Picking one uploads it
through `/api/v1/uploads` (hash, PUT, finalize, wait until `READY`) and attaches
it to the Purchase Intent; the thumbnail appears as **Comprobante adjunto** and
**Enviar comprobante** becomes available. Tap it.

**Estado del pago** reads "Tu pago está en revisión" with "Un administrador va
a confirmar tu comprobante pronto. Te avisaremos apenas esté listo." and a
**Volver al inicio** button. While the transfer is under review, **Mi crédito**
shows `Bs 0` disponibles and "Bs 60 están reservados para un pago en
revisión.", and **Comprar un plan** answers with the pending Payment instead
of a new Intent. Coming back to **Continuar al pago** with an open Intent
reopens the same Intent (the API answers `409 purchase_intent_open_exists`).

### C. Review the transfer in the Staff app

Start the Staff app (Test 9E) and log in as `paola.mendoza@example.com`. The
Administrator root is **Pagos pendientes**: a **Por confirmar** line with the
count and "Bs 500 en total", then one card per transfer, oldest first, with the
Client's initials, name, Plan, amount, and how long ago it was sent ("Hace 3
minutos", "Ayer, 19:40"). With nothing to review the screen reads "No hay
pagos pendientes." and "Todo al día. Te avisaremos cuando llegue una
transferencia nueva.".

Tap Sofía's card. **Revisar pago** shows name and Plan, **Monto a verificar**
with `Bs 500`, the **Pendiente** badge, "Transferencia · enviado el 22 de
septiembre, 14:05", and the **Comprobante** image loaded through the
authenticated API. **Ampliar** (or tapping the image) opens it full screen
with pinch zoom; close it with the ✕ in the top-right corner, below the status
bar. Scroll down: **Confirmar pago** returns to the list with a two-second
"Pago confirmado" notice and the card gone. **Rechazar**, under it, does not
reject yet: it unfolds **Motivo del rechazo** with "La clienta verá
este mensaje para corregir y volver a enviar."; **Confirmar rechazo** stays
disabled until you type a reason, then returns to the list with "Pago
rechazado". The same endpoints remain available in Swagger (Test 7,
"Reviewing transfers").

Back in the Client app, after a confirmation Sofía's Home shows the new Plan
and the inbox row "Tu pago fue confirmado…" opens **Estado del pago** with
"¡Pago confirmado!" and **Ir al inicio**. After a rejection the same screen
reads "Tu comprobante fue rechazado", shows the reason, explains "Sube un
nuevo comprobante para activar tu plan. Tu crédito volvió a estar disponible.",
and **Subir un nuevo comprobante** opens a fresh **Pago por transferencia**
for the same Plan.

### E. Cancel a Session as the Administrator

From **Pagos pendientes** tap **Cancelar una clase**. Pick the Branch
(**Sucursal:** row, then a Branch chip), a day chip, and a Class Type chip
(**Todas** by default); the list shows every Session of that day including full
ones, with time, Class Type, Trainer, "N reservas", and "Llena" or "N cupos".
No match reads "No hay clases con estos filtros." / "Prueba otro día, otra
sucursal u otro tipo de clase.". Tap a card: **Cancelar sesión** repeats the
Session, "N clientes afectados", and the warning "Esto no se puede deshacer"
above the red **Sí, cancelar sesión** and the plain **Cancelar**. Confirming
shows **Sesión cancelada** with "Se notificó a los N clientes afectados." ("Se
notificó al cliente afectado." for one) and "Se reembolsó una clase a cada
cliente."; **Volver** returns to the search.
The fixtures ship no Bookings, so book a class from the Client app first
(Test 7); cancelling a Session without Bookings answers
`409 session_has_no_bookings` and the screen shows "No pudimos cancelar la
sesión. Inténtalo de nuevo.".

### D. Paying fully with Credit

When the available Credit covers the whole price, **Continuar al pago**
activates the Plan immediately (`POST /api/v1/credit-purchases`) and lands on
"¡Pago confirmado!" without a QR. The fixtures cannot reach this (Bs 60 is
below the cheapest Plan), so the automated purchase-flow spec covers it.

## Test 11: act for a Client as the Assistant in the Staff app

Start the Staff app (Test 1B) with the backend and worker running (Test 2 and
the worker command from Test 5) and log in as `camila.rojas@example.com`
(Assistant assigned to Centro). The Assistant root is **Buscar cliente**.

### A. Find a Client and read her overview

Type at least two characters in **Buscar por nombre, teléfono o correo**
("luc", "7001", or "lucia@"). Each result shows the name, phone, and email; a
still-pending Client carries a **Pendiente** tag. With no match the screen
reads "No se encontró ningún cliente." and keeps **+ Nuevo cliente** as the
next step. Tap Lucía: the overview shows her Plan card ("Paquete de 8 clases",
"N clases restantes", "Vence el …", **Activa**), her next reservation, the
**Reservar clase** and **Registrar pago en efectivo** actions, **Ver
reservas** (only while a Plan is active), and the **Historial** card with her
last two classes and **Ver historial completo**. A Client without a Plan reads
"Sin plan activo" with **Reservar clase** disabled.

### B. Bookings, cancellation, and history

**Ver reservas** opens **Reservas de la clienta** under the banner "Viendo
reservas de: Lucía Fernández". Cards mirror the Client app: **Cancelar** for a
reservation outside the 2 h 30 window, **No cancelable** plus **Reprogramar**
inside it, **En lista de espera** plus **Salir de la lista de espera**. Items
at a Branch you are not assigned to keep their action disabled with "Solo en
tus sucursales". Cancelling asks "¿Cancelar esta reserva de Lucía Fernández?"
first. With nothing upcoming the screen reads "Esta clienta no tiene reservas
próximas." and offers **Reservar una clase**. **Ver historial completo** lists
attended classes by month ("Septiembre 2026") under "Viendo historial de: …".

### C. Book a class for her

**Reservar clase** opens **Reservar una clase** with the banner "Reservando
para: Lucía Fernández", the Branch row, the seven day chips, and the Class Type
chips. Tap a Session: the detail shows Trainer, Branch, date, time, duration,
and "X de Y cupos disponibles". **Reservar** books it for the Client and lands
on **Reservas de la clienta** with the "Reserva confirmada" notice. A full
class offers **Unirme a la lista de espera** ("Clase llena. Se avisará al
cliente si se libera un cupo."); a Client without classes left sees **Reservar**
disabled, "El cliente no tiene clases disponibles en su plan.", and
**Registrar pago**. After booking, **Volver** goes straight back to her
overview, not to the Session you just booked. Rescheduling works the same
way.

### D. Take a cash Payment

Open `mariana@example.com` (no Plan) and tap **Registrar pago en efectivo**.
**Elige un plan** shows "Registrando pago para: Mariana Peña", the Credit line
when the Client has any ("Este cliente tiene Bs 60 de crédito disponible."),
and the four Plans with the cash amount after Credit (the original price
crossed out). Tap one: **Confirmar pago en efectivo** breaks down **Precio del
plan**, **Crédito aplicado**, and **Monto a cobrar en efectivo**; when you are
assigned to several Branches a chip row asks where you received the cash.
**Confirmar pago recibido** activates the Plan at once and shows
"¡Pago registrado!" with the Plan, its classes, and "Válido hasta el …";
**Volver al cliente** returns to the overview, now **Activa**, and **Volver**
from there goes back to **Buscar cliente**. A Client with an active Plan
answers "El cliente ya tiene un plan activo."

### E. Invite a new Client and manage the invitation

From **Buscar cliente** tap **+ Nuevo cliente**. Fill **Nombre**, **Correo
electrónico**, and optionally **Teléfono (opcional)**; the form explains
"Enviaremos un enlace de activación al correo. Vence en 7 días." **Crear
cuenta** creates the pending Client, queues the activation email (the worker
delivers it to the local capture), and opens her overview with the card
**Cuenta pendiente de activación**: the email, "El enlace de activación vence
el …", the 30-day removal note, **Cambiar correo**, **Reenviar enlace**, and
**Cancelar invitación** (confirmed with "¿Cancelar la invitación de …?", then
back to **Buscar cliente**). A second send within a minute answers "Ya
enviamos un correo a esa dirección hace poco…". An email already in use
answers "Este correo ya pertenece a otra cuenta."; a pending self-registration
explains that verification is pending and offers **Ver cliente**. Once the
pending Client has a Payment or Booking, **Cancelar invitación** disappears
and the account stays pending until she activates it.

### F. Tablet layout

Open the same Metro URL in an iPad Simulator (for example iPad Pro 11-inch)
with Expo Go installed. **Buscar cliente** becomes a split view: the search
and results sit in a left column and the right panel reads "Selecciona un
cliente para ver sus detalles". Tapping a result highlights it and shows her
overview in the right panel without navigating away; **Ver reservas** and
**Ver historial completo** also open in that panel, with **Volver** returning
to the overview. **Reservar clase**, **Registrar pago en efectivo**, and
**+ Nuevo cliente** open full-screen: the classes and the Plans show as a
two-column grid, and the Session detail, the cash confirmation, and the new
Client form sit in a centered card. Finishing a booking, a cash Payment, or a
new Client returns to the split with that Client in the panel. Cancelling an
invitation clears the panel.

Client search ignores accents and case: "lucia" finds Lucía Fernández and
"guzman" finds Sofía Guzmán (STAFF-004).

## Test 12: see the agenda and record attendance as a Trainer

Load the fixtures (Test 5A) and start the backend. Open the Staff app (Test
1B) and log in as `emma.vargas@example.com` with `emma-local-2026`.

1. **Mi agenda** greets you and lists today's Sessions you lead, each with
   Branch, time, Class Type, and "N de M reservados". Book a class for today
   as `lucia@example.com` in the Client app (or through Swagger) first if the
   list is empty.
2. Tap a Session to open its roster: every booked Client with **Asistió** and
   **No asistió** choices, or "No hay reservas para esta sesión."
3. Mark every Client and tap **Guardar asistencia** (enabled only once every
   Client has an outcome). "Asistió" classes then appear in the Client's
   **Ver historial**.
4. Open the roster again: the saved outcomes are restored, and a changed
   outcome can be saved as a correction.

The same data is available through Swagger as `GET
/api/v1/trainer/sessions?on=YYYY-MM-DD`, `GET
/api/v1/trainer/sessions/{sessionId}/roster`, and `POST
/api/v1/sessions/{sessionId}/attendance`; other Roles get `403`.

## Test 13: watch the worker cancel an empty Session and close a Waitlist

Load the fixtures (Test 5A), start the backend, and start the worker with
`pnpm --filter @pilates/backend start:worker`. The worker checks every minute
(and once when it starts) for:

- **Sessions starting within two hours.** A Session with no Bookings at that
  moment is cancelled with cause `zero_bookings` and no actor, its open
  Waitlist Entries close as `session_cancelled`, and its Trainer receives
  "Tu clase de Mat Pilates de hoy 07:00 se canceló: no tuvo reservas." (the
  Class Type and time vary) in the inbox, which opens their agenda. A waitlisted
  Client receives "La clase de … a la que estabas en lista de espera fue
  cancelada." A Session with at least one Booking stays scheduled. Either way
  the check is recorded in `empty_booking_check_completed_at` and never runs
  again for that Session, even if its Bookings later drop to zero. A Session
  that drops to zero before the check stays bookable until then.
- **Sessions that have started.** Their remaining open Waitlist Entries close
  as `session_started`, without a notification.

To see it without waiting for a real class, pick today's Session that starts
in the next two hours with no Bookings (or wait until one does), keep the
worker running for a minute, then:

1. Log in to the Staff app as that Session's Trainer (usually
   `emma.vargas@example.com`) and open the inbox from Perfil: the
   cancellation notice is there.
2. In the Client app as `lucia@example.com`, the Session no longer appears in
   the class list, and `GET /api/v1/sessions/{sessionId}` returns `404`.

Book a Session in the Client app first and it stays scheduled through the
check. The worker logs only a sanitized `empty_session_check_failed` or
`started_waitlist_closure_failed` event if a sweep fails.

## Test 14: bootstrap the first Administrator on an empty database

The bootstrap command creates the very first Administrator of a new
environment (see the
[runbook](./runbooks/first-administrator-bootstrap.md)). Try it on a throwaway
database so your fixture data stays intact:

```sh
createdb pilates_test_bootstrap
cd apps/backend
export DATABASE_URL=postgresql://$USER@localhost:5432/pilates_test_bootstrap
pnpm exec prisma migrate deploy
BOOTSTRAP_ADMINISTRATOR_EMAIL=duena@example.com \
BOOTSTRAP_ADMINISTRATOR_NAME="Dueña del estudio" pnpm admin:bootstrap
```

It prints `administrator_bootstrap_completed` with `status: created`. Then:

1. Run the same command again within a minute: `email_throttled`. After a
   minute it prints `status: activation_resent` (a fresh Activation Link).
2. Run it with a different email: `bootstrap_pending_for_another_email`.
3. Run it against the fixture database
   (`DATABASE_URL=…/pilates_dev_sim`): `administrator_already_active`, because
   `paola.mendoza@example.com` is already an active Administrator.

Every refusal changes nothing. Drop the throwaway database afterwards with
`dropdb pilates_test_bootstrap`. Completing activation needs the link from the
queued email, which the local capture does not expose to testers yet.

## Test 15: book an Evaluation and manage the Nutritionist's availability

Load the fixtures (Test 5A) and start the backend and both apps (Test 1).

**In the Client app** as `lucia@example.com`:

1. Open **Perfil → Evaluación nutricional**. Only days with an open turno
   appear; each turno is 45 minutes and disappears 3 hours before it starts.
   With more than one Branch, each turno names its Branch.
2. Tap a time, check the summary on **Confirmar evaluación** ("Es gratuita —
   no usa clases de tu plan."), and tap **Confirmar**. You land on **Mis
   evaluaciones** with "Evaluación confirmada".
3. Tap **Cancelar** and confirm: the sheet says the turno is freed and the
   month becomes available again. Inside 3 hours of the start the card shows
   "Ya no se puede cancelar" instead.
4. Book one again and open **Evaluación nutricional**: days in that month
   disappear. When no unused month has open turnos, the screen shows "Ya usaste
   tu evaluación de este mes." A Client without an active plan sees "Necesitas
   un plan activo…" with **Ver planes**.

**In the Staff app** as `gabriela.flores@example.com`:

1. **Mi agenda** groups upcoming Evaluations by day ("Hoy", "Mañana") with
   "Primera evaluación" or "Seguimiento". Tap a card, then **Cancelar
   evaluación**, and confirm: the Client is notified and the turno is freed.
2. **Mi disponibilidad** lists the weekly blocks from Monday to Sunday with
   their turnos and bookings, and "Desde…"/"Hasta…" when a block starts later
   or ends.
3. **+ Nuevo horario**: pick a day, a start and end on the 15-minute grid, and
   the date it starts ("A partir del", today by default). A Nutritionist with
   two Branches also picks the Branch. An overlapping block is refused with "Se
   superpone con otro de tus horarios."
4. Tap a block to edit it ("Aplicar cambios desde") or **Eliminar horario**.
   When it already has bookings, a sheet confirms that those Evaluations stay.

## Test 16: watch the worker's retention sweeps

When the worker starts, and then every hour, it deletes housekeeping rows that
have outlived their provisional retention (BE-008): idempotency records past
their own expiry and at least 48 hours old, Authentication Sessions 90 days
after they were revoked or expired, throttle events 30 days after they
stopped counting, and notifications 180 days after they were read. Unread
notifications and audit records are never deleted. To see it, insert an old
read notification for a fixture Account in `pilates_dev_sim` (for example
`read_at = now() - interval '200 days'`), start the worker, and the row is
gone a few seconds later. The worker logs only a sanitized
`retention_sweep_failed` event if a sweep fails.

## Test 17: manage Staff Members as the Administrator (API)

The admin web is not built yet, so try these through Swagger or curl as
`paola.mendoza@example.com` (Test 3 shows how to log in and authorize):

1. `GET /api/v1/administrator/staff-members` lists every Staff Member with
   `page`, `pageSize` (up to 100), and optional `role`, `branchId`, and
   `status` (`pending`, `active`, `deactivated`) filters.
2. `POST /api/v1/administrator/staff-members` with a name, email, Role, and
   Branches creates a pending Staff Member and queues the Activation Link
   email. An Administrator is created without Branches (they hold every
   Branch); every other Role needs at least one active Branch.
3. `POST …/{id}/activation-link` sends a new link while the person is still
   pending (at most one per minute per email).
4. `PUT …/{id}/role` and `PUT …/{id}/branches` change the Role or the
   Branches. A Nutritionist's Availability Blocks end from today when her Role
   changes or she loses a Branch (booked Evaluations stay). A Trainer who still
   leads upcoming Sessions or Session Schedules cannot lose that Branch, change
   Role, or be deactivated (`409 trainer_has_upcoming_sessions`).
5. `POST …/{id}/deactivation` disables the Account and signs it out
   everywhere.

You cannot change or deactivate yourself (`409 own_staff_member`) or remove the
last active Administrator (`409 last_administrator`). Other Roles get `403`.

## Test 18: Home shortcuts, Mi plan, and notification taps

In the Client app as `lucia@example.com`:

1. **Inicio** shows three quick actions: **Reservar una clase**, **Evaluación
   nutricional** ("Próxima: …" when one is booked, otherwise "Agenda tu cita
   del mes"; it opens Mis evaluaciones or the availability), and **Mis
   referidos** ("N amigas invitadas" or "Invita amigas y gana crédito").
2. **Ver detalle** opens **Mi plan**: "Suscripción actual" with dates such as
   "13 de octubre de 2026" and "Podrás comprar un plan nuevo cuando este
   termine."; while expiring, an amber banner; once expired, "Último plan",
   "Venció el …", and **Comprar un plan**.
3. In **Perfil → Notificaciones**, tapping an Evaluation notice opens Mis
   evaluaciones, a class-cancelled notice opens Mis reservas, a payment notice
   opens the payment status, and a Plan notice opens Mi plan.

In the Staff app, a Trainer's "Tu clase … se canceló" notice and a
Nutritionist's Evaluation notices open **Mi agenda**.

## Test 19: run the mobile critical journeys and the release smoke check

With fixtures freshly applied (Test 5A), the backend running, and both apps
served (client Metro on any free port, staff on 8082), run the committed Maestro
journeys from each app folder:

```sh
cd apps/client-mobile
maestro test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8081 \
  -e PASSWORD=emma-local-2026 .maestro
cd ../staff-mobile
maestro test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8082 \
  -e PASSWORD=emma-local-2026 .maestro
```

The Client suite books and cancels a class, walks Home, Mi plan, and the
notification destinations, and books and cancels an Evaluation. The Staff suite
covers the Administrator's pending payments, the Trainer's agenda and inbox,
the Assistant's Client search, and the Nutritionist's availability. Each flow
changes the development database, so re-apply fixtures before running again.

To check that the release bundles build, run
`EXPO_PUBLIC_API_URL=https://api.example.com pnpm --filter @pilates/client-mobile release:smoke`
(and the same for `@pilates/staff-mobile`). It prints
`mobile_release_smoke_passed` with both bundle sizes. Store builds and updates
follow the [mobile release runbook](./runbooks/mobile-release.md) and need the
Expo, Apple, and Google accounts first.

## Test 20: search every Branch as the Administrator

In the Staff app as `paola.mendoza@example.com`, open **Cancelar una clase**,
tap **Sucursal**, and choose **Todas las sucursales**: the day's Sessions of
every Branch appear together, each card naming its Trainer and Branch
("Emma Vargas · Urubó"). The API behind it is
`GET /api/v1/administrator/sessions?from=…&until=…` (Administrators only).

## Test 21: manage the catalog, schedules, and reports as the Administrator (API)

The admin web is not built yet, so try these through Swagger or curl as
`paola.mendoza@example.com` (Test 3 shows how to log in and authorize). Other
Roles get `403 administration_access_denied`.

1. **Catalog**: `GET`/`POST /api/v1/administrator/branches`, `PUT …/{id}`,
   and `POST …/{id}/archive`; the same for `class-types`. A Branch or Class
   Type that still has upcoming Sessions or schedules cannot be archived
   (`409 branch_in_use`, `409 class_type_in_use`). Plans are created and
   edited under `plans`, and `PUT plans/{id}/visibility` with
   `{"visible": false}` hides one from the Client catalog.
2. **Weekly schedules**: `POST /api/v1/administrator/session-schedules` with a
   Branch, Class Type, Trainer, weekday (1–7), `startsAtLocal` ("16:00"),
   capacity, and `effectiveFrom` (a Bolivia date) creates the schedule and
   reports how many Sessions it created. `POST …/{id}/replacement` changes the
   time, Trainer, or capacity from an effective date: unbooked future Sessions
   move or change, booked ones stay, and the worker does not recreate the old
   start. `POST …/{id}/end` stops it from a date. A reassigned Trainer gets a
   notice such as "Se te asignó una clase: Mat Pilates, sábado 26 de
   septiembre, 16:00.".
3. **Single Sessions**: `POST /api/v1/administrator/sessions` adds a one-off
   Session; `PATCH …/{id}` changes its start, Trainer, or capacity. Overlaps
   answer `409 session_overlap`, and capacity below the booked count answers
   `409 capacity_below_bookings`.
4. **Oversight**: `GET evaluations?from=…&until=…`, `DELETE evaluations/{id}`
   (cancels it for the Client), `GET referrals?query=sofia`, `GET credits`
   (Clients with available Credit and the studio total), and
   `GET reports/income?from=…&until=…&branchId=…` (income by month and method;
   with a Branch only its cash counts).

## Test 22: run the Back Office as the Administrator (API)

The admin web is not built yet, so use Swagger or curl as
`paola.mendoza@example.com` (Test 3 shows how to log in and authorize). Every
route below lives under `/api/v1/administrator/`; other Roles get
`403 back_office_access_denied`. The four `POST`s that record a Withdrawal,
Restock, Salary Payment, or Expense need an `Idempotency-Key` header with a new
UUID; sending the same key and body again returns the first result without
recording twice, and the same key with a different body answers
`409 idempotency_key_reused`.

1. **Supplies** (Insumos): `POST supplies` with a Branch, `name`,
   `initialQuantity`, and `lowStockThreshold` creates one; `GET
   supplies?branchId=…` lists that Branch's active Supplies with `lowStock`
   set when the quantity is at or below the threshold. `PUT supplies/{id}`
   changes only the name and threshold; the stock never changes by editing.
   A second active Supply with the same name at that Branch answers
   `409 supply_name_taken`. `POST supplies/{id}/archive` hides it from the
   list and blocks further movements (`409 supply_archived`).
2. **Withdrawals and Restocks**: `POST supplies/{id}/withdrawals` with
   `{"quantity": 3}` takes units out and returns the new `quantityOnHand`;
   asking for more than is on hand answers `409 insufficient_stock` and
   changes nothing. `POST supplies/{id}/restocks` puts units back in.
   `GET withdrawals?branchId=…&month=2026-09` lists the month's Withdrawals,
   newest first, with the units per Supply in `totals` (the consumption
   report).
3. **Payroll** (Nómina): `POST salary-payments` with `staffMemberId`,
   `amountCentavos` (Bs 3 500 is `350000`), and `paidOn` (a Bolivia date, not
   in the future, otherwise `400 date_in_future`). `PUT salary-payments/{id}`
   corrects it; `GET salary-payments?staffMemberId=…&from=…&to=…` lists them.
4. **Expenses** (Gastos): `POST expense-categories` with a `name`; `DELETE
   expense-categories/{id}` works only while no Expense uses it
   (`409 expense_category_in_use`). `POST expenses` with a Branch, category,
   `amountCentavos`, and `incurredOn`; `PUT expenses/{id}` corrects the
   category, amount, or date (never the Branch); `GET expenses?branchId=…`
   lists them.
5. **Report**: `GET reports/expenses?from=…&until=…` (the same instants as
   `reports/income`) totals Expenses by category and by month plus every
   Salary Payment. Add `&branchId=…` and only that Branch's Expenses count:
   Salary Payments are studio-wide and appear only in the all-Branches view.

Recording or correcting a Salary Payment or Expense writes an audit record
(`salary_payment.*`, `expense.*`).

## Test 23: open the admin web shell in a browser

The admin web is a website, not one of the mobile apps. Start its development
server:

```sh
pnpm dev:admin
```

Open [http://localhost:5173](http://localhost:5173) in any browser (the tab is
titled "Emma · Administración" and loads Lora and Work Sans from Google Fonts).
Every page now needs a signed-in Administrator, so start the backend
(Test 2) and log in first as Test 24 describes; `/api/v1` is proxied to
`http://127.0.0.1:3100` like the Vercel origin will do.

1. **Sidebar.** On a desktop-width window the left sidebar shows **Horario**,
   then **Catálogo** (Tipos de clase, Planes, Sucursales), **Back Office**
   (Clientes, Pagos, Insumos, Evaluaciones nutricionales, Personal, Nómina,
   Gastos, Categorías de gasto), **Reporte**, and **Promociones** (Promociones,
   Referidos, Créditos). There is no "Descuentos". Horario and the Catálogo
   pages are real (Test 25); every other entry opens a page with that title,
   "Esta sección aún no está disponible.", and the design screen it will
   implement (for example "Pantalla AW08"); the entry is highlighted in the
   sidebar and the address changes (`/back-office/insumos`).
2. **Branch selector.** The top bar shows **Sucursal Centro**. Click it: a
   popover lists Centro, Equipetrol, and Urubó with their addresses, marks the
   current one with a check, and ends with **Gestionar sucursales** (opens
   Sucursales). Choosing Urubó closes the popover, the cell reads **Sucursal
   Urubó**, and you stay on the same page. Esc or a click outside closes it.
   On **Pagos**, **Clientes**, **Nómina**, **Referidos**, or **Créditos** the
   popover first says "Esta página no se filtra por sucursal — …" and still
   lets you switch for the next page. The Branches are the active ones the
   API returns (Test 25); archived Branches never appear here.
3. **Narrow browser.** Make the window narrower than 1024 px (or open the
   address on a phone). The sidebar disappears behind the **Abrir menú**
   button, which opens a drawer with the same sections that closes after you
   pick one, and the Branch selector opens as a sheet from the bottom.
4. **Unknown address.** Open `http://localhost:5173/no-existe`: "Página no
   encontrada" with **Volver al horario**. A list address with a bad page,
   such as `/back-office/insumos?page=abc&pageSize=500`, is accepted and
   treated as page 1 of 20.

The account cell on the right shows the signed-in Administrator; Test 24
walks through its menu. Press `Ctrl+C` in the Terminal to stop the server.

## Test 24: log in to the admin web

The admin web keeps its Authentication Session in a browser cookie that page
scripts cannot read, and only an Administrator may sign in. Use a browser on
your computer (any modern one; Safari may refuse the local `Secure` cookie on
`http://localhost`, so prefer Chrome or Firefox for this test).

Start the backend against the local simulator database and load the fixtures
(Test 2 and Test 5 A), then start the admin web in a second Terminal:

```sh
DATABASE_URL="postgresql://$USER@localhost:5432/pilates_dev_sim" pnpm --filter @pilates/backend db:fixtures
DATABASE_URL="postgresql://$USER@localhost:5432/pilates_dev_sim" pnpm dev:backend
pnpm dev:admin
```

1. **Signed out.** Open
   [http://localhost:5173/catalogo/planes](http://localhost:5173/catalogo/planes).
   You land on the Login card (Emma, the tagline, **Correo electrónico**,
   **Contraseña**, **Iniciar sesión**, **¿Olvidaste tu contraseña?**) with no
   sidebar, and the address remembers `redirect=/catalogo/planes…`.
2. **Neutral rejection.** Log in as `camila.rojas@example.com` with the fixture
   password `emma-local-2026`. She is an Assistant, so the card says "El correo
   o la contraseña no son correctos.", exactly as for a wrong password or an
   unknown email, and keeps what you typed.
3. **Log in.** Log in as `paola.mendoza@example.com` / `emma-local-2026`. You
   return to **Planes**. Reload the page: you stay signed in (the session is
   restored at startup). In the browser's developer tools (Application →
   Cookies) the `__Host-emma-admin-session` cookie is HttpOnly, Secure,
   SameSite Lax, has no Domain (host-only), and expires in 12 hours;
   `__Host-emma-admin-client` is the random browser identifier used only for
   throttling.
4. **User menu.** Click **Paola Mendoza** in the top bar: her name, email,
   "Administración", **Cambiar contraseña**, and **Cerrar sesión** (in red
   text). **Cambiar contraseña** opens the 408 px side panel ("Tu sesión
   seguirá abierta en este navegador."). **Guardar contraseña** stays disabled
   until all three fields are filled and the two new ones match; a wrong
   current password is marked on its field. If you do change it, every other
   session of the Account (the Staff app, for example) is signed out, and you
   must use the new password next time; run the fixtures command again to
   restore `emma-local-2026`.
5. **Log out.** Open the menu, choose **Cerrar sesión**: it first asks
   "¿Cerrar sesión?" with **Cancelar**. Confirm, and you are back on Login;
   the session cookie is gone and going back to a page asks you to log in.
6. **Throttling.** On Login, submit a made-up email such as
   `nobody.admin-login@example.com` with any password six times. The seventh
   try shows "Demasiados intentos. Intenta de nuevo en un momento." with a
   countdown from the server (0:30 at first) and a disabled button.
7. **Recovery.** **¿Olvidaste tu contraseña?** opens **Recuperar contraseña**.
   Any email gives the same "Revisa tu correo" state ("El enlace vence en 30
   minutos.") whether or not it belongs to an Account.
8. **Links.** Open
   [http://localhost:5173/crear-contrasena?token=not-a-real-link-secret](http://localhost:5173/crear-contrasena?token=not-a-real-link-secret):
   "Este enlace no es válido". Valid activation and recovery links still cannot
   be read from the local email capture (it lives inside the worker process
   with no inbox), so the current, expired, and used states and a successful
   activation or reset are covered by the automated tests only.
9. **Narrow browser.** At a phone width the top bar keeps only the avatar, the
   menu opens from the bottom, and **Cambiar contraseña** fills the screen.

A request that changes something with the session cookie from any other site
is refused with `403 untrusted_origin`; you can see it with curl after logging
in with the same command-line cookie jar (`curl -c jar -H "Origin:
http://localhost:5173" …` to log in, then `curl -b jar -X DELETE -H "Origin:
https://attacker.example" http://localhost:5173/api/v1/admin-web/authentication-sessions/current`).

## Test 25: run the schedule and the catalog in the admin web

Start the backend on `pilates_dev_sim` after loading the fixtures and start
the admin web, exactly as Test 24 describes, and log in as
`paola.mendoza@example.com` / `emma-local-2026`. Every time and date below is
Bolivia time, whatever time zone your computer uses.

1. **Horario.** The landing page shows the selected Branch's week: seven day
   columns, a time axis, and one block per Session with the Class Type, the
   start and end time, the Trainer, and the booked seats ("0/12"); a full
   Session reads "Llena · 3 en espera". The subtitle counts the week's
   Sessions ("Sucursal Centro · sala única · 10 sesiones esta semana"). The
   arrows and **Hoy** move between weeks and the address remembers the week
   (`/?week=2026-09-28`). Choosing another Branch in the top bar redraws the
   grid for it without leaving the page.
2. **Nueva sesión.** **+ Nueva sesión** opens the 408 px side panel. **Una sola
   vez** asks for Tipo de clase, Entrenador (only Trainers assigned to the
   Branch), Fecha, Hora, and Capacidad (filled from the Class Type). **Cada
   semana** swaps Fecha for **Día de la semana** and **Vigente desde** and
   creates the weekly schedule; the page then says how many Sessions it
   created for the next 30 days. **Guardar** with empty fields marks each one;
   a Session that overlaps another says "Se cruza con otra sesión…".
3. **Editar sesión.** Click a block. The panel names the day, time, and
   "N de M lugares reservados" (plus "N en lista de espera"). A Session a
   weekly schedule generated offers **Solo esta sesión** (change its Trainer,
   date, time, or capacity; capacity cannot go below the booked seats) or
   **Esta y las futuras** (change the weekly schedule from a **Vigente desde**
   date: unbooked Sessions move, booked ones stay, and the page says how many
   of each). **Terminar la serie** stops the schedule from a date after asking.
4. **Cancelar sesión.** Only a Session with Bookings offers it (an empty one
   says it cancels itself 2 hours before). The confirmation says every
   Booking is refunded even inside the 2 h 30 window and that the waitlist is
   notified; afterwards the Session disappears from the grid and the page
   says "Sesión cancelada: N reservas reembolsadas y avisos enviados.". To try
   it, book a Session first as a Client (Test 10 or the Staff app, Test 11).
5. **Sucursales, Tipos de clase, Planes.** Each is a dense table with
   pagination and one filter in the address (`?status=archived`,
   `?visibility=hidden`). **+ Nueva …** and a row open the side panel. Plans
   show prices as `Bs 1.050,00`, last 1, 3, 6, or 12 months, and always carry
   a class count; **Ocultar en la app** hides one from the Client catalog.
   A Class Type needs a description, and a taken name is marked on its field.
   **Archivar sucursal** / **Archivar tipo de clase** ask first; Centro is
   refused ("No puedes archivarla: tiene sesiones programadas…") because it
   has upcoming Sessions.
6. **Narrow browser.** At a phone width the week becomes day tabs with one
   day's Sessions, tables become one card per row, and every panel fills the
   screen.

Browsers show the date and time pickers in the format of their own language,
so an English Chrome shows `09/29/2026` and `09:00 AM`; the values sent and
shown elsewhere stay Bolivia dates and 24-hour times. The changes you make stay
in `pilates_dev_sim`; run the fixtures command again to restore the fixture
Accounts and catalog (it does not remove Sessions or schedules you created).

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
- Promotions on Client Home or push notifications (the in-app inbox works, see
  Test 9; buying a Plan works, see Test 10);
- creating, reassigning, and deactivating Staff Members in a screen (the
  API works, see Test 17; the admin screens are WEB-004);
- Promotions and image variants (UPL-002);
- Back Office screens (the API works, see Test 22; the screens are WEB-007);
- any admin-web section beyond logging in, Horario, and the Catálogo pages
  (Tests 23 to 25): the other sections are placeholders;
- real SendPulse email, Expo push notifications, store builds, or production
  deployment.

Some underlying rules for these areas may already have unit tests or approved
architecture, but that does not make the feature manually usable. The
[backlog](./implementation/BACKLOG.md) tracks every item above, the provider
accounts each one needs ("External accounts and provider gates"), and the
production readiness checklist.

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
