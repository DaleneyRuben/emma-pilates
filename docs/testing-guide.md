# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area                         | What you can test now                                                                                                           | Current limit                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client mobile app            | Use the real email-only Login, registration, pending-email, recovery-request, verification, activation, and password-recovery screens on the iPhone and iPad Simulators or the Android emulator, then Home, class browsing and booking, Mis reservas, history, Plans and transfer payment, Mi plan, referrals and Credit, Perfil with the profile photo, the inbox, and password change with the fixture Accounts (Tests 5, 9, 10); change the login email from Editar perfil and confirm it from the captured link (Test 34); the Promotions carousel on Inicio once the admin web publishes a Promotion (Test 18); every list refreshes when it regains focus and on pull (Test 5 B, Test 18) | Push notifications need a development build, not Expo Go (Test 46); Evaluations are reached from Perfil and Home (Tests 15, 18) |
| Staff mobile app             | Open the separate Staff Login app on the iPhone and iPad Simulators or the Android emulator, log in with a fixture Staff Account, and verify that Client registration is unavailable; review transfers and cancel a Session as the Administrator (Test 10); search, invite, book, and take cash for a Client as the Assistant (Test 11); see the agenda and record attendance as a Trainer (Test 12) | — the Nutritionist agenda and Mi disponibilidad work too (Test 15) |
| Nutritionist Evaluations (API) | Publish, replace, and end Availability Blocks as the fixture Nutritionist; browse slots, book, list, and cancel Evaluations as a Client; see the agenda and cancel as staff through Swagger or curl (Test 7) | The same journeys work in both apps (Test 15); reminders need the worker and real time to pass |
| Local development fixtures   | Load deterministic Branches, Plans, Class Types, Sessions, Subscription states, referrals, the Nutritionist's Availability Blocks, and active Client and Staff Accounts with one command | Sessions beyond the fixtures' first 30 days appear only while the worker runs (it extends Session Schedules hourly); the fixtures ship no Promotion or receipt image (create them in the admin web, Test 33, or through Swagger, Test 32) |
| Backend health               | Confirm that the API is alive, ready (PostgreSQL reachable and every migration applied), and passing the read-only smoke checks; read its JSON request logs | The worker is checked only through its heartbeat log; email, push, and object storage are not part of readiness |
| API documentation            | Open Swagger and inspect or send requests to every current endpoint                                                             | Swagger does not make unfinished journeys complete; production hides it (BE-025, Test 63)                                                                                                            |
| Client registration          | Register from the mobile app or Swagger and use change-email, resend, and cancellation actions; in the app «Revisa tu correo» survives a restart until you verify, cancel, or log in (Test 5) | The worker writes every captured email under `apps/backend/.data/email-capture/` (Test 34); on the iOS Simulator paste its token into Swagger (Universal Links wait for gate 9); on Android the link opens the app (Test 57) |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration                | Resend deliberately gives the same neutral response whether it sends or suppresses an email                                                                   |
| Email verification           | Confirm that an unknown token returns `invalid`; complete a real verification with the token from `.data/email-capture` (Test 34) | On the iOS Simulator the link opens nothing until gate 9; on Android it opens the app (Test 57)                                                                                                    |
| Login and logout             | Log in from the mobile app, restore the protected credential at startup, inspect identity in Swagger, and revoke it             | Log out from Perfil with a confirmation in both apps (Test 9)                                                                                                  |
| Login throttling             | Confirm repeated failures temporarily stop password checks and return `Retry-After`                                             | Use a made-up email so you do not throttle an Account you need                                                                                                |
| Email request limits         | Fill the device or network budget for registration, resend, email correction, and recovery: the API answers `429` `authentication_email_throttled` with `Retry-After`, and the apps and admin web show «Demasiadas solicitudes…» with the wait (Test 5 G) | Every admitted request counts, even one for an unknown address or a suppressed email; reset by marking your local `email_requested` rows deleted |
| Account security             | Request recovery from mobile, reject expired links before password entry, and complete activation and recovery with the token captured under `.data/email-capture` (Test 34) | On Android the links open the app's screens (Test 57); on the iOS Simulator only the automated tests reach them until gate 9                                                        |
| Mobile development builds    | Install the EAS development builds of both apps on the iPhone 16 Pro and iPad Simulators and the Android emulator, run them against Metro, and run the Maestro journeys on them (Test 45) | Each new native build spends one of the free plan's monthly builds; push notifications are Test 46 |
| Mobile error reporting       | Force an error in either app on the development builds and read the event a local receiver gets, then the same in Better Stack (Test 47) | Native crashes and release names need a build made since EXT-013; source maps upload only from EAS release builds with the Better Stack token |
| Database backups             | Run the daily backup job against MinIO, check the bucket against the retention rules, and restore the dump into a throwaway database (Test 43) | Production dumps go to R2 from Northflank's `backup` job; the drill needs the read-only restore token |
| Automated checks             | Run mobile identity, backend, API-contract, type, lint, and build checks                                                        | Database integration tests require Docker Desktop or an explicitly disposable PostgreSQL test database                                                        |
| Admin web                    | Log in as the fixture Administrator, see the neutral rejection and the throttling countdown, request recovery, use the user menu, change the password, and log out (Test 24); then open the admin shell: the sidebar sections, the top bar, the Branch selector, and the narrow-browser drawer (Test 23); build the week in Horario (one-off Sessions, weekly schedules from a date, Trainer swaps, last-resort cancellation) and manage Sucursales, Tipos de clase, and Planes (Test 25); look up Clients and create, change, and deactivate Staff Members, and correct, resend, reopen, or cancel a pending invitation (Test 26); review, confirm, and reject transfer Payments with the enlarged receipt (Test 27); run Supplies, Withdrawals, payroll, Expenses, and Expense Categories (Test 28); read the Evaluation, Referral, and Credit lists (Test 29); read the income and expense report for every Branch or one, and the accrued, cash, and deferred figures (Tests 30 and 76); run the Playwright critical journeys against the built app and a disposable database (Test 31); create, publish, reorder, unpublish, and delete Promotions with their images (Test 33); reach the production API through the production admin web and see its origin and cookie checks (Test 38); make a page crash and recover inside the shell (Test 64); see the logo while the admin web loads and while a slow page arrives (Test 66) | Activation and recovery links are read from `.data/email-capture` (Test 34), not from a mailbox; the Playwright journeys run in Chromium only |
| Public pages                 | Open the privacy, support, and account-deletion pages locally or at `app.emmapilatesstudio.com` and check their headers (Test 58) | Static text with no form: a deletion request is an email to `soporte@`, closed by an operator from AW22 |
| Promotion Contacts           | Open AW35 from Promociones, search, export the CSV, and erase a contact on a copy of the fixtures (Test 59) | Personal data of former Clients; erasing is permanent, so never on `pilates_dev_sim` itself |
| Launch screen                | Cold-start either app on a Release build made locally and see the logo on the blush background until Login is drawn (Test 65) | Native: Expo Go cannot show it, and the store builds carry it only from REL-009's next round |
| Promotions Consent           | Turn «Recibir promociones de Emma Pilates» on and off in Perfil, see it on AW35 as «Activa», stop it there, and close the Account with the box ticked (Test 60) | Live Clients' consent (ADR-0098); the closure part is permanent, so use a copy of the fixtures |
| Impersonation                | As the Administrator, see and act in the Staff app as a Trainer, Assistant, or Nutritionist for 30 minutes from Perfil → «Ver la app como…», under the banner with «Salir», and the same through the API with its audit records and refused commands (Test 67) | Nothing is sent to the Staff Member |
| Worker and background jobs   | Watch the hourly Session and slot extension (Test 5 A), the empty-Session cancellation and Waitlist closures (Test 13), the retention sweep (Test 16), the pending-Account, image, and Purchase-Intent sweeps (Test 68), the Evaluation and Plan reminders (Test 7), the push receipts (Test 46 E), the email delivery and capture (Test 34), the notifications a studio change sends (Test 69), and the nightly studio facts recompute (Test 75) | Each sweep runs on its own interval; back-date a row to see it sooner, never on a database you keep |
| Rules and problem codes      | Every rule a journey can break answers a stable code: registration (Test 4), limits (Tests 5 G–H, 63), Evaluations (Test 7), staff (Test 17), catalog (Test 21), Back Office (Test 22), closure (Test 35), bookings, payments, uploads, and the rest (Test 70) | Some codes need a race or an Account state the fixtures do not hold; Test 70 says which |
| Screen states                | The mobile apps' load failures, action failures, offline banner, and link screens (Test 71); the admin web's empty studio, empty filters, load failures, the startup «Sin conexión» page, and the unknown address (Test 72) | The admin web's «No tienes permiso…» copies need a `403` an Administrator cannot provoke (Jest covers them) |
| Operations                   | Release to staging and promote (Test 40), pause and resume staging, copy production into staging, personal data requests, incidents, secrets rotation, the monthly reminder, the restore drill, and the uptime monitors (Test 74); CI's audit, gitleaks, migrations-drift, and public-site jobs and Dependabot (Test 73); backups (Test 43); monitors and error reporting (Tests 37, 44, 47); production checks (Test 38); connections (Test 39) | Most steps touch the provider consoles the user holds; the guide names what to rehearse without production |
| Mobile builds and stores     | EAS development builds (Test 45), local release builds for the launch screen and the QR save (Tests 51, 65), the staging variant beside the store app (Test 55), Play Internal testing on production (Test 48), and the release bundle smoke (Test 19) | Each EAS build spends one of the month's 15; iOS store builds wait for gate 9 |

## Where each designed screen is tested

The design index ([`docs/design/prompts/README.md`](./design/prompts/README.md))
names every screen; this table says which tests walk each one, so a screen
can be found by its design name.

| Client app | Tests |
| --- | --- |
| 01 Iniciar sesión / Registrarse, «Revisa tu correo», «El registro venció» | 1, 4, 5, 19, 49, 50, 52 |
| 02 Inicio, 03 Reservar, 04 Detalle de sesión | 5, 18, 46, 54, 69, 71 |
| 05 Mis reservas, 06 Reprogramar, 07 Historial de clases | 5, 12, 19, 61, 69 |
| 08 Elige tu plan, 09 Detalle del plan, 10 Pago, 11 Estado del pago | 10, 19, 41, 51, 53, 70 |
| 12 Mi plan | 5, 18, 71 |
| 13 Evaluación nutricional, 14 Confirmar evaluación, 15 Mis evaluaciones | 15, 18, 19, 54 |
| 16 Mis referidos, 17 Mi crédito | 10, 18 |
| 18 Perfil, 19 Notificaciones | 9, 18, 46, 54, 60 |
| 20 Recuperar contraseña, 21 Crea tu contraseña | 1, 5, 6, 57, 71 |
| 22 Editar perfil, 23 Cambiar contraseña, 24 Cerrar mi cuenta | 9, 34, 35, 49, 50, 52, 53 |

| Staff app | Tests |
| --- | --- |
| S01 Iniciar sesión, S18 Recuperar contraseña, S19 Crea tu contraseña | 1, 5, 50, 52, 57, 71 |
| S02 Mi agenda, S03 Lista de asistentes (Entrenadora) | 12, 13, 19, 61, 69 |
| S04 Buscar cliente, S05 Nuevo cliente, S06 Resumen del cliente | 5 H, 11, 19, 49, 54 |
| S07 Reservar una clase, S08 Detalle de sesión, S09 Elegir plan, S10 Confirmar pago en efectivo | 11, 19 |
| S11 Pagos pendientes, S12 Revisar pago | 10, 19, 46, 49, 51 |
| S13 Cancelar una clase, S14 Cancelar sesión | 10, 19, 20 |
| S15 Mi agenda, S16 Mi disponibilidad, S17 Formulario de horario (Nutricionista) | 15, 19 |
| S20 Notificaciones, S23 Perfil | 9, 18, 46, 67 |
| S21 Reservas de la clienta, S22 Historial de la clienta | 11, 54 |
| S24 Ver la app como…, the impersonation banner | 67, 71 |

| Admin web | Tests |
| --- | --- |
| AW01 Iniciar sesión, AW30 Recuperar contraseña, AW32 Crear contraseña, AW33 Menú de usuario | 24, 31, 44 |
| AW34 Selector de sucursal, the shell, the narrow drawer, «Página no encontrada» | 23, 31, 64, 66, 72 |
| AW02 Horario, AW03 Formulario de sesión | 25, 31, 50, 64, 69 |
| AW04–AW07 Planes, Tipos de clase and their forms; AW19–AW20 Sucursales | 25, 70, 72 |
| AW08–AW10 Insumos, AW31 Retiros e insumos consumidos | 28, 72 |
| AW11–AW12 Nómina, AW13–AW15 Gastos and Categorías de gasto | 28, 31, 62, 72 |
| AW16 Reporte de ingresos y gastos | 30, 31, 76 |
| AW17–AW18 Promociones, AW35 Contactos para promociones | 31, 33, 59, 60, 72 |
| AW21–AW22 Clientes, Detalle de cliente | 26, 31, 35, 72 |
| AW23–AW24 Personal | 26, 31, 72 |
| AW25 Evaluaciones nutricionales, AW26 Referidos, AW27 Créditos | 29, 72 |
| AW28–AW29 Pagos, Revisar pago | 27, 31, 62, 72 |

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
| PostgreSQL 18           |       `5433` |

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
- **¿Olvidaste tu contraseña?** and, at the bottom, "¿No tienes una cuenta?
  **Regístrate**".

Tap **Regístrate**. Confirm that the form asks only for name, email,
password, and password confirmation («Repite la contraseña»), plus a collapsed
**¿Tienes un código de referido?** that opens a **Código de referido** field.
It must not ask for a phone number. Two different passwords show "Las
contraseñas no coinciden." under the second field and send nothing; fewer than
8 characters show "Mínimo 8 caracteres.". The button reads **Crear cuenta** and
"¿Ya tienes una cuenta? **Inicia sesión**" returns to Login. Tap **¿Olvidaste tu
contraseña?** and confirm that recovery asks only for email, under a top bar
with a back chevron and the title **Recuperar contraseña** (the chevron, read
as "Volver", returns to Login; the bar stays after sending and on the limit
notice). After sending, **Revisa tu correo** sits centred under a sage circle
with a check. The other outcome screens use the same layout under the Emma
wordmark: **Tu cuenta está activa** (21, S19) and **Tu correo cambió** (22)
with the sage check, and a dead or unusable link with a Palo de rosa circle
(a clock for an expired, used, or removed link, an envelope while 22
confirms, a struck circle for an invalid email-change link, an at sign for an
address already in use). These navigation checks do not need the backend.
Once signed in, every screen opened from a tab or a list (Mi plan, Mi crédito,
Notificaciones, Editar perfil, Cambiar contraseña, a Plan, and the rest) opens
under the same top bar, the chevron (read as "Volver") and the screen's title
over a thin rule. A Plan's bar shows the Plan's name, a class opened from
Reservar shows a small grey "Reservar una clase" instead of a title, and
Notificaciones keeps **Marcar leídas** at the end of the bar. In the Staff
app, the Assistant's client overview, the class list, the class detail, the
plan picker, the cash payment, and the Trainer's attendance list keep their
large title under a chevron; the other screens (Perfil, Notificaciones,
Reservas de la clienta, Historial de clases, Revisar pago, Cancelar una
clase, Mi disponibilidad with **+ Nuevo horario** in the bar, and the
schedule form) use the bar. On an iPad the pre-session screens sit in a
centred phone-width column. Every screen in both apps sits on the same light
warm Superficie as Login, and its cards (the plan, the Perfil groups, the
class cards, the Branch picker) are white with a thin warm-beige border and
16-point rounded corners (most also carry a barely visible shadow), so the
top bar's thin rule is visible against the screen. In the Staff app, a Client
without a Plan shows «Sin plan activo» centred in a dashed, lightly tinted
box under a Palo de rosa card icon, with «Esta clienta no tiene clases
disponibles. Registra un pago para activar un plan y poder reservar.» below
it; on the iPad the empty right panel shows a person icon in a 64-point
circle, «Selecciona un cliente para ver sus detalles» in Lora, and «Busca por
nombre, teléfono o correo en el panel izquierdo. Su ficha se abrirá aquí, sin
perder la lista.», with no card behind it.

Both apps catch a screen that fails while drawing (MOB-053). Instead of the
full-screen red box of Expo Go or a closed app in a release build, the failed
screen is replaced by the recovery screen: «Algo salió mal» in Lora, the note
«No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve a pasar,
cierra la app y ábrela otra vez.», and a **Reintentar** primary button,
centred on the same Superficie with no card and no icon (design follow-up
89). Only the failed screen is replaced: in the Client app the tab bar stays
and the other tabs keep working; in the Staff app the Role's stack stays, so
the iOS back swipe from the left edge returns to the previous screen.
**Reintentar** draws the failed screen again from scratch. A failure above
every screen (Login, the providers) shows the same screen over the whole
viewport and **Reintentar** restarts the app's tree. You cannot reach it
without a defect: to see it, make a screen throw while rendering (for
example a temporary `throw new Error("probe")` at the top of a screen's
render, never committed), reload, and tap through to that screen. In Expo Go
the development LogBox still opens over it with a dismissible «Render Error»
and the boundary's «Console Error» (React Native treats a component error as
fatal for LogBox even when a boundary catches it); tap **Dismiss** on each to
see the recovery screen. A release build has no LogBox. The error and its
component stack go to `console.error` only; no crash reporter is wired.

### B. Open the Staff app

Leave the Client Expo server running and open a second Terminal window. From the
project directory, start the Staff app:

```sh
pnpm --filter @pilates/staff-mobile ios
```

Expo Go displays one project at a time, so the Simulator switches from the
Client project to the Staff project. Both development servers may remain
running. You should see the same approved Login styling with an **Acceso del
equipo** pill under the tagline, the email placeholder "tu@emmapilates.bo"
(the Client app shows "tu@correo.com"; recovery follows the same rule),
**Iniciar sesión**, and **¿Olvidaste tu contraseña?**, but you must not see
**Regístrate**. Staff Accounts
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

The project runs on **PostgreSQL 18** everywhere (production, staging, CI,
and your computer; the shared development database was retired by EXT-016). Locally it is Homebrew's
`postgresql@18` on port **5433**, so it can sit beside an older PostgreSQL on
5432 that other projects use. Install and start it once:

```sh
brew install postgresql@18
sed -i '' 's/^#port = 5432/port = 5433/' /opt/homebrew/var/postgresql@18/postgresql.conf
brew services start postgresql@18
```

Then, in every Terminal you use for this guide, point the PostgreSQL command
line tools (`createdb`, `dropdb`, `psql`, `pg_isready`) at it. Every such
command in this guide assumes these two lines:

```sh
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
export PGPORT=5433
```

Make sure it is running:

```sh
pg_isready
```

A response containing `5433 - accepting connections` means it is ready. Then
create the local database and configuration file:

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

If you created `apps/backend/.env` while the project still used port 5432,
change its `DATABASE_URL` to
`postgresql://YOUR_MAC_USER@localhost:5433/emma_pilates` (Prisma needs the
user name in the URL).

If `pg_isready` does not report `accepting connections`, run
`brew services list` and start `postgresql@18` with
`brew services start postgresql@18`. Leave any other PostgreSQL service as it
is.

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

Swagger and `/openapi.json` are served locally and on staging only; production
answers 404 for both (BE-025), and its release workflow runs the smoke check
with `SMOKE_API_DOCUMENTATION=hidden`, which fails if production serves them.

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
does not reveal whether an email was queued or temporarily rate-limited for
that address. Only the device or network budget (Test 5 G) answers otherwise:
`429` `authentication_email_throttled` with `Retry-After`, the same for every
address. Registration and email correction share that budget.

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

The mobile email-link UI is connected. With the worker running, every
captured email lands under `apps/backend/.data/email-capture/` (Test 34), so
you can verify a second registration with its real token; the older shortcut
of marking it verified directly in your local database still works. Never use
that shortcut on a shared or production database.

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
four designed Plans (Paquete de 8 clases, Bs 560; Paquete de 12 clases,
Bs 780; Mensual 16 clases, Bs 1 050; Trimestral 36 clases, Bs 2 100 for three
months), weekly Session Schedules with the next 30 days of
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

These fixtures are for your local databases only, whose data is public and
resettable. Never load them into production.

### B. Log in from the mobile app

Keep the backend and Client Expo server running. In the iOS Simulator, open the
Client app, enter `lucia@example.com` and the fixture password, then tap
**Iniciar sesión**. The app should open **Inicio** with "Hola, Lucía", the
"Paquete de 8 clases" card marked **Activa** with 5 of 8 classes and its
paid-through date, and an enabled **Reservar una clase** action. Log in as
`mariana@example.com` to see the **Comprar un plan** card and the disabled
booking action instead. Close and reopen the app; startup Session restoration
should return to **Inicio** without asking for the password again.

The tab bar at the bottom is white with a thin sand line above it and four
line icons (a house, a calendar, a clock, a person) over **Inicio**,
**Reservar**, **Mis Reservas**, and **Perfil**. The current tab's icon and label
are Palo de rosa; the others are a soft grey. On an iPad the labels stay under
the icons.

From Home, **Ver detalle** opens **Mi plan** and **Comprar un plan** opens
**Elige tu plan**; tapping a Plan shows its detail with the price breakdown
(Test 10 walks through the payment). The **Perfil** tab shows the Account
summary, a **Mi plan** row, and **Cerrar sesión**; **Editar** lets you change
the name and phone and saves through the API (changing the email is Test 34).

The **Reservar** tab lists the fixture Sessions for the selected Branch, day,
and Class Type (past Sessions of today are hidden; full ones show **Lleno**).
A day without Sessions centres "No hay clases este día."; a Class Type chip
that matches none of the day's Sessions reads "No hay clases con este
filtro" instead (any Branch on a Sunday, which no fixture schedule covers;
Prenatal at Centro).
Each Session is a white card: the time in small spaced capitals over the Class
Type in Lora, the seat pill on the right («N cupos» in Palo de rosa oscuro on
Palo de rosa tinte; a full class reads **Lleno** in grey on a neutral sand
pill, never red; MOB-047), and under a thin rule the Trainer after a small
person icon with a Palo de rosa chevron on the right (full classes keep the
chevron too; MOB-042). The **Sucursal:** pill (a pin, the
Branch name in bold, and a small grey chevron pointing down, up while the
list is open) opens «Elige una sucursal» with the current Branch's name in
Palo de rosa profundo and a check on its right. The day and Class Type chip
rows keep their height whether the Branch list is open or the day has no
classes, on the iPhone and the iPad alike.
Tapping a Session opens its detail. Under the facts card the capacity is a
bare block, not a card (MOB-049): «N de M cupos disponibles» with the number
in Lora, «N reservados» in small grey text on the right, and a thin Palo de
rosa bar under them on a Palo de rosa tinte track, filled by the booked
share. A full Session keeps the count at «0 de M» beside the same grey
**Lleno** pill as the list (never red) and greys the bar. **Reservar**
creates a real Booking and lands on **Mis reservas** with a "Reserva
confirmada" notice and the updated class balance. A full Session offers
**Unirme a la lista de espera**, and a Client without remaining classes sees
the disabled button with a link to the Plans.

**Mis reservas** lists upcoming Bookings and Waitlist entries. A Booking more
than 2 h 30 before its start offers **Cancelar** behind a confirmation sheet
(the class returns to the balance); one inside that window shows **No
cancelable** and **Reprogramar** to another Session of the same day; a
Waitlist entry offers **Salir de la lista de espera**. **Reprogramar** opens
**Reprogramar clase**: the current Booking in a muted box, then the day's
other classes with seats as the same white cards as **Reservar** (the spaced
time over the Lora Class Type, and under the thin rule the Trainer after the
person icon with the «N cupos» pill in Palo de rosa oscuro on Palo de rosa
tinte at the right, where the booking list's cards show a chevron). Tapping
a card draws its border in Palo de rosa (2 px) and enables **Confirmar
cambio** (MOB-048). With nothing upcoming,
the screen offers **Reservar una clase**. **Ver historial** opens **Historial
de clases**: «Has asistido a» over «N clases desde <mes>» in large Lora, then
one group per month («Septiembre 2026» with its count, «4 clases», over a
`#D8C9BB` rule) whose classes are rows drawn straight on the screen, not
cards: a day column (the day of the month in Lora, the weekday in small
capitals), the Class Type in Lora, and «Entrenadora · Sucursal» under it,
separated by thin `#EFE7DE` rules. With no attendance yet the screen centres
a quiet clock, «Aún no tienes clases en tu historial.», and «Aquí aparecerán
tus clases una vez que registremos tu asistencia en el estudio.» (the
fixtures reach this until a Trainer records attendance).

Every list keeps itself current (UX-004). With **Mis reservas** open, switch
to **Inicio**, book a class for Lucía from Swagger or the Staff app, and come
back: the new card appears within a second, with no loading logo and the
existing cards still in place (before UX-004 it stayed hidden until the app
restarted). Returning from a screen a list opened (Detalle de sesión,
Reprogramar, Historial) refreshes it the same way. Pull any list down
(**Reservar**, **Mis reservas**, **Historial de clases**, **Mi plan**, **Mis
evaluaciones**, **Notificaciones**, **Mis referidos**, **Mi crédito**, and
**Inicio** as before): the platform's spinner in Palo de rosa turns while the
list refetches and the list stays under it.

That Client Account must not authenticate in the Staff app. Use a Staff fixture
such as `emma.vargas@example.com` in the Staff app instead; it must be rejected
by the Client app.

For an incorrect password, the mobile app shows "El correo o la contraseña no
son correctos." in a box above the fields, whether or not the Account exists.
After the backend returns `429` (six failures with the same made-up email),
a neutral box with a Palo de rosa clock reads "Demasiados intentos. Intenta
de nuevo en un momento." with
"Podrás intentarlo en 0:30." counting down from the server's `Retry-After`,
and **Iniciar sesión** stays disabled until it ends.

After **Crear cuenta** the app shows **Revisa tu correo**: the address with a
**Cambiar correo** link, "El enlace vence en 24 horas; el correo indica la
fecha y hora exactas.", **Reenviar correo** (always answered "Si el envío está
disponible, recibirás un correo nuevo. Solo funciona el enlace más
reciente."), **Volver a iniciar sesión**, the 7-day cleanup note, and a quiet
**Cancelar registro** that asks "¿Cancelar tu registro?" first. **Cambiar
correo** opens under a top bar titled **Cambiar correo** whose chevron returns
to **Revisa tu correo**, and explains that the links sent to the old address
stop working. The device/network limit frames ("Demasiadas solicitudes…" after
the same clock, with "Podrás reenviarlo en m:ss.") appear once the API answers `429`; Test 5 G shows how to reach them.
The registration form itself answers that `429` with the same clock notice
above the fields: "Demasiadas solicitudes. Intenta de nuevo en un momento; si
ya recibiste un enlace, sigue sirviendo." with "Podrás intentarlo en m:ss."
counting down, the fields keep what you typed, and **Crear cuenta** stays
disabled until the wait ends (MOB-032).

The pending registration stays on the device (in SecureStore) until it is
finished: close the app from the app switcher (or Expo Go) and open it again,
and it starts on **Revisa tu correo** with the same address instead of Login.
It is forgotten when you verify the email from a link on this device, cancel
the registration, register again, or log in to any Client Account; after a
cancellation or a login, the next launch opens Login. Seven days after the
last registration, correction, or resend, the next launch shows «El registro
venció» once (with **Registrarme de nuevo**) and then forgets it. You cannot
wait seven days by hand, so the automated tests cover that frame.
A link opened at launch wins over the kept registration (MOB-056): when the
app starts from the email's verification link while **Revisa tu correo** is
still being restored, it shows the link's screen («Correo verificado» or
«Enlace no válido»), never «Revisa tu correo» on top of it; a verified email
completes and forgets the registration as above, an invalid link leaves it
stored, so the next launch without a link opens **Revisa tu correo** again.
Expo Go cannot receive the link (LNK-001), so the automated tests cover this
frame too.

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

### G. See the device and network email limits

Registration, verification resend, email correction, and password recovery
share two budgets besides the per-address one (BE-012). Every request the
budgets admit counts, whether or not an email goes out, so they reveal nothing
about an address:

| Lane | Registration, resend, and correction (shared) | Recovery |
| ---- | --------------------------------------------- | -------- |
| Device (`x-client-identifier`, or the admin web's client cookie) | 10 in 15 minutes, 30 in 24 hours | 5 in 15 minutes, 10 in 24 hours |
| Network (the connection address) | 50 in 15 minutes, 200 in 24 hours | 25 in 15 minutes, 100 in 24 hours |

A full lane answers `429` with code `authentication_email_throttled`, the
neutral detail "Too many requests from this device or network. Try again
later", and `Retry-After` in seconds; nothing is sent and no link changes. A
missing or malformed identifier counts against the network lane only, and a
`X-Forwarded-For` header you send is ignored. Use a disposable copy of your
database (`createdb -T pilates_dev_sim pilates_test_limits`, run the API on it,
drop it afterwards), because the budgets apply to everyone on your machine.

1. **Device lane.** From a terminal, send eleven resends with the same
   identifier (the continuation does not need to be real):

   ```sh
   for i in $(seq 11); do curl -s -o /dev/null -w "%{http_code} " -X POST \
     http://127.0.0.1:3100/api/v1/client-registrations/verification-resends \
     -H 'content-type: application/json' -H 'x-client-identifier: my-test-device-0001' \
     -d '{"registrationContinuation":"not-a-real-continuation"}'; done
   ```

   The first ten print `202`, the eleventh `429` (add `-D -` to see
   `Retry-After: 900`). A recovery request from the same identifier still
   answers `202`: recovery has its own budget.
2. **Network lane in the apps.** The Simulator shares your Mac's address, so
   requests from the terminal fill the same network lane. Register in the
   Client app until it shows **Revisa tu correo**, then send 49 more resends
   without the header (the loop above with `seq 49` and no
   `x-client-identifier`). **Reenviar correo** now shows "Demasiadas
   solicitudes. Intenta de nuevo en un momento; el enlace que ya tienes sigue
   sirviendo." with "Podrás reenviarlo en 14:59." counting down and the button
   disabled; **Cambiar correo** shows the same notice with "Podrás intentarlo
   en m:ss.". Go back to Login, tap **Regístrate**, and submit the form with
   a new address: it shows "Demasiadas solicitudes. Intenta de nuevo en un
   momento; si ya recibiste un enlace, sigue sirviendo." above the fields with
   "Podrás intentarlo en m:ss." and **Crear cuenta** disabled, and no Account
   is created. For recovery, send 25 requests to
   `/api/v1/password-recovery-requests` (any email), then use **¿Olvidaste tu
   contraseña?** in the Client app (20), the Staff app (S18), or the admin web
   (AW30): each shows "Demasiadas solicitudes. Intenta de nuevo en un momento;
   si ya recibiste un enlace, sigue sirviendo." after a clock icon, with
   "Podrás pedirlo en m:ss.", under the **Recuperar contraseña** top bar in
   the apps.
3. **Reset.** The budgets forget events after 15 minutes and 24 hours. To
   start over on your local copy, mark them deleted (rows are never removed):

   ```sh
   psql -d pilates_test_limits -c "update system.authentication_throttle_events set deleted_at = now() where event_kind = 'email_requested' and deleted_at is null"
   ```

### H. See the staff email limit

Every staff command that can email an activation or verification link also
counts against a budget of the signed-in staff Account (BE-013): the
Assistant's **Crear cuenta** (S05), **Reenviar enlace**, **Cambiar correo**,
and **Enviar enlace de verificación** (S06), and the Administrator's
**Guardar** on a new member, **Reenviar enlace**, and **Cambiar correo**
(AW24). They share **20 requests in 15 minutes and 100 in 24 hours per
Account**, in the Staff app and the admin web together. Every signed-in
request counts, whether or not an email goes out; a request without a valid
sign-in gets `401` and counts nothing. The budget is separate from the device
and network lanes of G: staff requests never use them up.

A full budget answers `429` with code `staff_email_throttled`, the detail
"Too many emails were requested from this Account. Try again later", and
`Retry-After` in seconds. Nothing is created or sent and no link changes. The
per-address limit still answers `email_throttled` as before. Use a disposable
copy of your database, as in G.

1. **From a terminal.** Sign in as `camila.rojas@example.com` (`POST
   /api/v1/authentication-sessions`, keep the `credential`), then send 20
   invitations to new addresses:

   ```sh
   for i in $(seq 21); do curl -s -o /dev/null -w "%{http_code} " -X POST \
     http://127.0.0.1:3100/api/v1/assistant/client-invitations \
     -H "Authorization: Bearer $CREDENTIAL" -H 'content-type: application/json' \
     -d "{\"name\":\"Prueba $i\",\"email\":\"prueba.limite$i@example.com\"}"; done
   ```

   The first twenty print `201`, the twenty-first `429` (add `-D -` to see
   `Retry-After: 900`). Paola, the Administrator, still creates a Staff Member
   (`201`): each Account has its own budget.
2. **In the apps.** With Camila's budget full, **+ Nuevo cliente** shows
   "Enviaste muchos correos en poco tiempo. Espera un momento para enviar
   otro; los enlaces que ya enviaste siguen sirviendo." after a clock icon,
   above the fields, with "Podrás intentarlo en m:ss." and **Crear cuenta**
   disabled; the fields keep what you typed. A pending Client's overview
   shows the same notice in the invitation card with "Podrás enviarlo en
   m:ss." when you tap **Reenviar enlace**, **Guardar correo**, or **Enviar
   enlace de verificación**, and the button stays disabled. In the admin web,
   fill Paola's budget the same way (20 `POST
   /api/v1/administrator/staff-members/{id}/activation-link`), then
   **Personal** › a pending member › **Reenviar enlace** shows the notice at
   the top of the panel, above the Nombre row, with "Podrás enviarlo en
   m:ss.", and **Nuevo miembro** ›
   **Guardar** shows it at the top of the form with "Podrás intentarlo en
   m:ss." and **Guardar** disabled.
3. **Reset.** Mark the staff events deleted (rows are never removed):

   ```sh
   psql -d pilates_test_limits -c "update system.authentication_throttle_events set deleted_at = now() where event_kind = 'staff_email_requested' and deleted_at is null"
   ```

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
Member information. A real link answers `current` or `expired` with its
`purpose`; an activation link whose invitation the 30-day cleanup removed
answers `removed` (an invitation cancelled by staff still reads `expired`).

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
After 5 requests in 15 minutes from one device, or 25 from one network, it
answers `429` `authentication_email_throttled` with `Retry-After` instead,
whatever the address (Test 5 G).

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
single-use links; since IDN-008 the worker writes each captured email under
`apps/backend/.data/email-capture/` (Test 34), so the recovery token can be
pasted into `POST /api/v1/password-recoveries`. Link expiry, recovery-wide
session revocation, and the replacement credential remain covered by the
automated tests.

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
| `GET /api/v1/plans/{planId}`            | One Plan (the app's Detalle del plan); an unknown id answers `404 plan_not_found` |
| `PATCH /api/v1/clients/current` `{ name, phone }` | Saves the name and phone (Perfil → Editar); an empty name answers `400 client_name_required` |
| `GET /api/v1/bookings` / `GET /api/v1/bookings/history` | Upcoming Bookings and Waitlist Entries (Mis reservas) / attended classes, newest first (Historial) |

The commands behind Reservar and Mis reservas, each with an
`idempotency-key` UUID where it changes something, are
`POST /api/v1/sessions/{id}/bookings` (`201`; for a full Session
`POST …/waitlist-entries` instead), `DELETE /api/v1/bookings/{id}`,
`POST /api/v1/bookings/{id}/reschedule` `{ "targetSessionId" }`, and
`DELETE /api/v1/waitlist-entries/{id}`; the Assistant sends the same with
`{ "clientId" }` in the body (Test 11). Their rule codes are in Test 70.

Log in as `valeria@example.com`, `sofia@example.com`, or `mariana@example.com`
to see the `expiring_soon`, `expired`, and `none` Subscription statuses. A Staff
credential receives `403` with `booking_access_denied` from the two
`clients/current` endpoints; its own profile is
`GET /api/v1/staff-members/current` (name, Role, Branches, the Staff Perfil
of Test 9 E), which a Client credential gets `403` from in turn.

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
| 4    | `POST /api/v1/uploads` + `PUT …/object` + `…/finalize`| A `TRANSFER_RECEIPT` image asset that the worker leaves `READY` (Test 32 has the upload steps) |
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
| `GET …/payments/{paymentId}/receipt`                  | The rebuilt `readable` JPEG (`?variant=thumbnail` for the small one), `no-store`; Trainers and Clients get `403` |
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
| `GET /api/v1/assistant/client-invitations/{clientId}`      | The pending invitation with `pendingExpiresAt` (30 days), `activationExpiresAt`, and `cancellable`; a Client who registered herself answers `404 client_verification_pending` |
| `POST …/client-invitations/{clientId}/email-corrections` `{ email }` | New email, old links invalidated, fresh link sent                                              |
| `POST …/client-invitations/{clientId}/resends`             | A fresh link; a second send within a minute answers `429 email_throttled` with `Retry-After` (seconds)   |
| `POST …/client-invitations/{clientId}/verification-emails` | `202 { clientId, email }`: a fresh 24-hour verification link for a Client who registered herself; `404` for a staff invitation |
| `POST …/client-invitations/{clientId}/cancellation`        | `204`; afterwards the invitation, Account, and Client are marked removed (`404 client_invitation_not_found`) |

Inviting an email that already has a pending invitation answers `201
invitation_resent`; a pending self-registration answers `201
verification_pending` and sends nothing (the Assistant offers the link with
`…/verification-emails`); an active Client or a Staff Member answers `409
email_in_use`. A self-registration is never managed as an invitation: reading,
resending, correcting, or cancelling it answers `404
client_verification_pending`, and no activation link is issued for her. Every limited invitation email answers `429 email_throttled`
with `Retry-After`. Booking for a Client uses the
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
backend end-to-end or database integration suites. It needs no database, no
Docker, and no environment variable, and a bare `pnpm exec jest` (or an
editor's Jest runner) gives the same result as the script: the unit suite runs
as CommonJS, and because pg-boss ships only ES modules, Jest substitutes the
double in `apps/backend/src/__mocks__/pg-boss.ts` for the package there. The
e2e and integration suites run as ES modules and load the real package, which
is why only their scripts set Node's `--experimental-vm-modules` flag.

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

The error boundary (MOB-053) is specified in mobile-core's
`src/ui/render-error-boundary.spec.tsx` (a child that throws while rendering
shows the recovery screen, the error and its component stack reach
`console.error`, **Reintentar** draws the children again and succeeds once
the child no longer throws, or shows the recovery screen again when it still
does) and in each app's `src/render-errors.spec.tsx`, which mock one screen
(Inicio, the Trainer's agenda) and the authentication flow to throw and
expect the recovery screen in place, the Client tab bar still present, and
the screen or Login back after **Reintentar**.

Both app suites fail a spec on any React `act()` warning (MOB-054): each
`jest.setup.ts` declares the act environment, delivers TanStack Query's
notifications synchronously so a query settles inside the awaited call that
produced it, and collects every «not wrapped in act», «not configured to
support act», and «overlapping act» line from `console.error`, which the
`afterEach` and `afterAll` hooks expect to be empty. A spec that lets one
through fails with the warning printed above it; the fix is always to `await`
the RNTL 14 call that is still in flight (`render`, `fireEvent.*`, `cleanup`,
`rerender`, `unmount` are asynchronous) or to `waitFor` the state the screen
is still loading.

All three mobile suites exit on their own, without `--forceExit`, wherever
they run (MOB-057). TanStack Query schedules a five-minute garbage-collection
timer for every query and mutation that loses its last observer, which RNTL's
cleanup makes happen at the end of every spec; each `jest.setup.ts` therefore
gives TanStack's `timeoutManager` a provider whose timers do not hold the Node
process (`unref`), so Jest exits as soon as the last spec is done while
`staleTime`, `gcTime`, retries, and the persister's throttle still fire during
a spec (Jest's own five-second hook timeout holds the process then). The
timers went unnoticed on a Mac because Jest hands each spec file to a worker
and kills the worker half a second after the run; where Jest runs the suite
in its own process (`--runInBand`, `--detectOpenHandles`, or a machine with
two cores such as CI's runner, whose `maxWorkers` is then 1) they kept the
process alive for exactly five minutes after the summary. To see the
difference yourself, run any suite with `--runInBand`: before MOB-057 the
summary was followed by «Jest did not exit one second after the test run
has completed» and a five-minute wait. Jest's `--detectOpenHandles` never
named them because a timer scheduled from a promise continuation has no
test-file frame on its stack, which is the filter Jest's collector applies.
If a suite lingers again, trace it with an `async_hooks` setup file that logs
every `Timeout` still referenced after the last spec, as MOB-057's temporary
diagnostic did.

Both app suites run against a frozen clock (MOB-051): their Jest config fakes
`Date` only, at 2026-10-08 14:00 UTC (10:00 in Bolivia), so a spec that
builds a Session «in one hour» or an Evaluation «today at 23:00» means the
same thing whenever you run it; timers, `waitFor`, and the other
asynchronous APIs stay real. Specs that need a particular instant still set
it explicitly in their fixtures.

The same three packages are linted and format-checked (MOB-050), and so is
the tooling package that holds their shared ESLint config and the release
smoke script (MOB-055):

```sh
pnpm --filter @pilates/tooling lint
pnpm --filter @pilates/mobile-core lint
pnpm --filter @pilates/mobile-core format:check
pnpm --filter @pilates/client-mobile lint
pnpm --filter @pilates/client-mobile format:check
pnpm --filter @pilates/staff-mobile lint
pnpm --filter @pilates/staff-mobile format:check
```

Each `lint` runs ESLint over the package with the shared flat config in
`packages/tooling/eslint/mobile.js` (`@pilates/tooling`, the development-only
package ADR-0013 reserves for tooling configuration): the recommended
JavaScript and typescript-eslint rules, the React Hooks rules, and
`no-restricted-imports` patterns that refuse deep imports into
`@pilates/api-contracts` or `@pilates/mobile-core`, imports of another
application, and relative paths that leave the package. A clean run exits 0
and prints nothing: since MOB-052 every React Hooks rule of the recommended
set, the React Compiler rules `react-hooks/set-state-in-effect` and
`react-hooks/purity` included, is an error, and no warning is left. A notice
that a navigation carries («Reserva confirmada», «Pago confirmado») is read
from the route param through `useTransientNotice`, which clears the param
when the notice's time is up, and a screen that compares a deadline with
«now» reads the clock once through `useMountedAt` when it appears, so neither
pattern needs an effect that copies into state or a `Date.now()` in render.
`format:check` runs Prettier separately, as the admin web does, with
`printWidth: 100` in each package's `.prettierrc`; `pnpm --filter <package>
format` rewrites the files. `@pilates/tooling` has its own
`eslint.config.mjs` (the recommended JavaScript rules with Node's globals,
nothing else: the package holds plain Node ES modules) that covers its
`eslint/mobile.js` and `scripts/mobile-release-smoke.mjs`, the script
behind each app's `release:smoke` (Test 19); it has no Prettier script,
because adding one would mean a new dependency on that package. Jest never runs ESLint, so a lint error does not
fail the tests; the project commit skill lints every staged TypeScript file,
and CI's quality-mobile job runs both checks, and the tooling lint, before the suites.

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
on desktop and narrow widths. Every sidebar entry opens its page, the current
section is marked, the Branch selector switches Branches and explains the
studio-wide pages, the narrow-browser drawer and bottom sheet work, unknown
paths land on "Página no encontrada", and list pages normalize `?page=` and
`?pageSize=`. Mock Service Worker answers the generated API client so the
same-origin fetcher, the RFC 9457 problem normalizer, and the retry policy
are checked without a backend. The table and form foundations are covered
too. `pnpm --filter @pilates/admin-web lint`, `typecheck`, `build`, and
`format:check` are the remaining quality checks for that app. The Playwright
journeys through the built app and the real backend are Test 31.

The suite exits on its own, without `--forceExit`, wherever it runs
(WEB-016). Its custom environment (`jest.environment.cjs`) copies the fetch
and stream globals jsdom lacks from Node, and until WEB-016 it copied
`MessageChannel` and `MessagePort` too; React's scheduler prefers a
`MessageChannel` over `setTimeout` when one is in scope, and Node's
`MessagePort` with a message listener is a referenced handle that nothing
ever closes, so once Jest ran the suite in band (`--runInBand`, or CI's
two-core runner) the process never exited: not after five minutes, ever. The
environment no longer copies the two, nothing the specs load needs them, and
the scheduler falls back to `setTimeout` as in any jsdom environment.
TanStack Query's five-minute garbage-collection timers, MOB-057's cause in
the mobile suites, exist here as well but do not matter: they are scheduled
through jsdom's `window.setTimeout`, and the environment's teardown closes
the window and clears them. To see the difference yourself, run any
rendering spec with `--runInBand`: before WEB-016 the summary was followed
by «Jest did not exit one second after the test run has completed» and a
process that never ended. `--detectOpenHandles` cannot name the port (it is
created while the `scheduler` module loads, with no test-file frame on its
stack); an `async_hooks` setup file that logs every resource still
referenced after the last spec names it in one run, as WEB-016's temporary
diagnostic did.

A green run prints nothing (WEB-018). Two guards hold that line: `useMockServer`
in `src/test/msw.ts` records every request that MSW's «error» strategy rejects
(its `request:unhandled` event) and fails the test that issued it, and
`jest.setup.ts` collects React's «not wrapped in act» lines from
`console.error` and fails the spec that let one through, as the mobile setups
do (MOB-054); both still print the original message above the failure, so the
failing spec shows which request or update it was. Before WEB-018 every run
logged 17 «[MSW] Error: intercepted a request without a matching request
handler» lines and 34 act warnings: six specs rendered or walked to a page for
the shell's sake (the sidebar marker, the session guard, a badge, the logout)
and checked only its heading, so the page's own reads (expenses, expense
categories, promotions, clients, referrals, evaluations, nutritionists) found
no handler while the test still ran, and two specs drove `router.navigate` and
`queryClient.fetchQuery` outside any Testing Library call, so the renders they
caused landed outside an act scope. `src/test/page-handlers.ts` answers those
pages' reads with empty lists for such specs, the two specs hold an `act`
scope around the calls they make themselves, and the one test that makes the
startup boundary catch a network error expects React's report of it instead of
letting it print. The lines looked CI-only but never were: Jest 30 picks its
agent reporter when an AI-agent variable (`CLAUDECODE`, `AI_AGENT`, and
others) is in the environment, and that reporter prints a file's `PASS` line
and console output only when the file fails, so a green suite run from an
assistant's shell is a bare summary; `--verbose` prints the console output as
it happens, and a plain terminal or the CI runner prints everything.

### Backend HTTP end-to-end tests

```sh
pnpm --filter @pilates/backend test:e2e
```

These start the NestJS HTTP application inside Jest and verify routes, status
codes, validation, and response shapes. The registration use cases are mocked
in this suite, so this is an HTTP contract check rather than a real database
journey.

The suite has no database. `apps/backend/test/setup-environment.ts` pins
`DATABASE_URL` to a placeholder that reaches nothing (port 1 on localhost),
ignoring any value exported by your shell, and boots the application modules
without the job runtime (`BOOT_WITHOUT_JOB_RUNTIME=true`), the way the offline
OpenAPI generator does, so the pg-boss factories return a stub instead of
starting pg-boss. The gate is `apps/backend/src/jobs/boot-without-job-runtime.ts`;
never set it for a running API, whose stub cannot send a job, so every command
that schedules one would fail. The
retired name `OPENAPI_GENERATION` no longer has any effect. If a
spec ever tries to open a connection, it fails with `ECONNREFUSED 127.0.0.1:1`
rather than touching a real database. The real-database boot of the whole
application is covered by `client-registration-runtime.integration-spec.ts`
in the integration suite below.

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
TEST_DATABASE_URL="postgresql://$USER@localhost:5433/pilates_test_admin" \
  pnpm --filter @pilates/backend test:integration
```

Every test file still gets its own freshly migrated `pilates_test_*` database
on that server and drops it when it finishes, so files never see each other's
rows; the admin database itself stays empty. Any other database name is
refused.

You may stop a run at any time with Ctrl-C. Each of those databases is watched
by a small background Node process started with it, outside Jest and outside
the terminal's Ctrl-C. When the test run ends without dropping the database
(Ctrl-C, a closed terminal, a `kill`, a crash, or a run that fails before its
cleanup), the watcher drops that one database, by its exact generated name, and
exits. The watcher never touches the admin database or any other database. To
confirm nothing was left behind, list the server's databases:

```sh
psql -l | grep pilates_test_
```

Only your admin database (and any you created by hand) should be listed, never
a `pilates_test_` name followed by twelve letters and digits.

### Quality and generated-contract checks

Run these from the project root:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm check:api
```

What they mean:

- `lint` checks code-style and common programming mistakes in every package
  with a `lint` script (the backend, the admin web, and since MOB-050 the three
  mobile packages, which print nothing since MOB-052, see
  «Mobile automated tests»); the admin web and the mobile packages keep
  Prettier as a separate `format:check` script, the backend runs it through
  ESLint;
- `typecheck` checks TypeScript types without running the apps;
- `build` proves that the current applications compile; and
- `check:api` proves that the committed OpenAPI document and generated API
  client match the backend controllers.

### CI

Every pull request and every push to `main` runs
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on GitHub Actions
(EXT-004). It checks; it deploys nothing, and it needs no secret. Eleven jobs
run as three independent chains, one per surface, with one job per test level
named `<surface>-<level>` (EXT-005), each job on a fresh Ubuntu runner after
the shared setup in `.github/actions/setup/action.yml` (Node from `.nvmrc`,
pnpm from the root `packageManager` field, cached pnpm store,
`pnpm install --frozen-lockfile`, `prisma generate`, and, for the job that
asks for it, Playwright's pinned Chromium from a cache keyed by the Playwright
version):

- **quality-api** (backend lint, typecheck, and build; api-contracts typecheck
  and build) → **contracts** (`check:api`, `check:api-compat`) and
  **api-unit** (the backend unit suite) side by side → **api-e2e** (the
  supertest suites, which boot the application without a database) and
  **api-integration** (the Prisma repositories and PostgreSQL behaviour
  against a `postgres:18-alpine` service container, through
  `TEST_DATABASE_URL` on a `pilates_test_ci` admin database that lives and
  dies with the runner) side by side, each waiting for both contracts and
  api-unit;
- **quality-web** (admin-web lint, `format:check`, typecheck, build) →
  **web-unit** (the admin-web Jest suite) and **web-e2e** (the seventeen
  Playwright journeys of Test 31 through the built backend and the built admin web, on
  a `postgres:18-alpine` service container with a `pilates_test_ci` admin
  database, WEB-017) side by side;
- **quality-mobile** (tooling lint; lint, `format:check`, and typecheck of
  mobile-core, client-mobile, and staff-mobile) → **mobile-unit** (their
  three Jest suites).

Two rules order the jobs: no test level starts before its surface's quality
job passed, and no database run (api-integration) and no e2e run against the
backend (api-e2e) starts before the contracts job and the unit suite passed.
A lint or type error therefore costs one two-minute job and the tests never
start; a stale contract or a failing unit suite stops the api chain before the
database run. web-e2e needs only quality-web: its journeys go through the
built backend, so a contract drift surfaces there as a failed journey, not as
a skipped job. No job mixes levels, so a job carries only what its level
needs: api-unit, api-e2e, web-unit, and mobile-unit have no service container
and no database variable; api-integration and web-e2e each have their own
service container and `TEST_DATABASE_URL`. There is no mobile-e2e job by
decision: Maestro on a macOS runner belongs to REL-001.

On a pull request a first `changes` job also reads the pull request's whole
list of changed files and starts only the chains of the surfaces it touches:
`apps/backend/**` for api, `apps/admin-web/**` for web, the three mobile
packages for mobile, `packages/tooling/**` for mobile (its only consumers
today), `packages/api-contracts/**` for all three (every contract change
touches the committed generated client), and the shared files
(`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`,
`.github/**`) for all three. A docs-only pull request therefore runs nothing,
and a backend fix that does not change the contract runs the api chain alone.
A push to `main` always runs everything. Jobs that never started show as
skipped.

A clean run of all three chains takes about nine minutes of wall clock, set
by the api chain, whose integration suite alone runs five minutes on the
two-core runner. Measured on the last run of the previous shape (eight jobs,
`main` run 37854052558) and the first green run of this one (eleven jobs,
run 37939483154 of EXT-005's pull request), job durations as GitHub reports
them, chains from the first quality job's start to the chain's last job's end:

| Chain  | Before                                                   | After                                                                                 |
| ------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| api    | quality-api 1:52 → contracts 0:57 → api 6:52; **9:47**   | quality-api 1:24 → contracts 1:28 ‖ api-unit 1:02 → api-e2e 1:12 ‖ api-integration 6:11; **9:09** |
| web    | quality-web 1:36 → web 2:25 → web-e2e 2:35; **6:43**     | quality-web 1:37 → web-unit 2:27 ‖ web-e2e 2:19; **4:08**                              |
| mobile | quality-mobile 1:37 → mobile 2:20; **4:00**              | quality-mobile 1:27 → mobile-unit 2:57; **4:27**                                       |
| run    | wall clock 9:55, 20 m 19 s of runner time over 9 jobs   | wall clock 9:16, 22 m 08 s of runner time over 11 jobs                                 |

The two extra jobs cost about two runner minutes: the shared setup step is
35 to 45 s on every job (about 1 m 10 s with the browser), and api-unit and
api-e2e each pay it once more than the old api job did. The web chain is two
and a half minutes shorter because web-e2e no longer waits for the Jest
suite, and the api chain's e2e suite runs beside the integration suite
instead of before it. Jest's own times move with the runner (unit 9 s, e2e
26 s, integration 5 m 12 s on this run against 2 s, 4 s, and 2 m 02 s on a
Mac), so compare chains between runs of the same shape, not single steps.

The four frontend Jest steps run with `--ci` alone and exit on their own:
the runner has two cores, so Jest runs each suite in band and every handle a
spec leaves behind would hold the process. The three mobile setups keep
TanStack's timers from doing so (MOB-057, about three minutes for the
mobile-unit job), and the admin web's environment keeps React's scheduler
off a Node `MessagePort` (WEB-016, about two and a half minutes for the
web-unit job). No step uses `--forceExit` any more. A green web-unit job
prints no `console.error` line (WEB-018): a request no handler answers and a
React act warning each fail the spec instead of scrolling past. The
api-integration job raises Node's heap (`NODE_OPTIONS=--max-old-space-size=4096`)
because the in-band ESM run grows past the runner's default limit; the
backend scripts keep the shell's `NODE_OPTIONS` next to their own
`--experimental-vm-modules` for that reason. The web-e2e job needs no flag
of its own: the global setup's teardown stops both servers and drops the
database, and the step exits with Playwright's result. Its failures are read
through the `web-e2e-test-results` artifact (Test 31).

A newer push to the same branch cancels the run in progress. To read a failed
run, open the pull request's "Checks" tab or run
`gh run list --branch <branch>` and `gh run view <run-id> --log-failed`: the
failing job names the script that failed, and the log of that step is the same
output you would see locally from the commands in the subsections above. Each
job has a timeout (15 minutes, 20 for api-integration), so a hung step fails
instead of waiting forever.

## Test 9: try Perfil, the inbox, and password change in the apps

Load the fixtures (Test 5A) and start the API and the Client app (Test 5B).

### A. Client Perfil

Log in as `sofia@example.com` and open the **Perfil** tab. Below the summary
card you should see the rows **Mi plan**, **Evaluación nutricional**, **Mis
evaluaciones**, **Mis referidos**, **Mi crédito**, **Notificaciones**, and
**Cambiar contraseña**, each with its line icon in Palo de rosa and a quiet
19 pt chevron (Icono tenue, MOB-041) at its right end, an outlined
**Cerrar sesión** button, and the footer "Emma Pilates Studio · versión 1.0".
With unread notifications the Notificaciones row shows the count in a Palo de
rosa profundo pill («9+» above nine), and so does the **Perfil** tab itself
from every screen (VoiceOver reads "Perfil, 2 notificaciones sin leer").

**Profile photo (MOB-020).** The summary card's circle shows two initials
until a photo is attached. Put an image into the Simulator's library first
(`xcrun simctl addmedia <udid> photo.jpg`; the fixtures ship no photo), start
the worker (it rebuilds the upload), then tap **Editar**. Above the fields, a
larger circle with the initials and the link **Cambiar foto**. Tapping it
opens the photo library; pick an image and it appears inside the circle at
once, centre-cropped, with "Subiendo foto…" under it while the upload runs
(declare, upload, finalize, wait for the worker, attach: a few seconds). Then
"Se recorta al centro en forma de círculo." and a second link, **Quitar
foto**, appear. **Volver** shows the same photo in the Perfil summary card.
**Quitar foto** removes it: the initials come back on both screens. HEIC
photos are converted to JPEG on the phone; the API keeps a 320 px display
and a 96 px thumbnail variant without metadata and releases them at once when
the photo is replaced or removed (check `system.audit_records` for
`client.photo_changed` / `client.photo_removed`). Through Swagger the same
journey is `POST /api/v1/uploads` with `purpose: profile_photo` (Test 32A),
`PUT /api/v1/clients/current/photo` with the ready `imageAssetId`,
`GET /api/v1/clients/current/photo?variant=display|thumbnail` (`no-store`),
and `DELETE /api/v1/clients/current/photo`.

### B. The notification inbox

Sofia has no notifications by default, so the inbox centres the bare empty
state of frame 19 (MOB-041): a quiet 34 pt bell, "No tienes notificaciones."
in Lora 21, and the muted supporting line, with no box behind them. To see
the full screen, create a few rows for her Account with `psql` (development
database only):

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
row and tab badges are gone when you go back. Tapping a single row also marks
it read.

### C. Change the signed-in password from the app

Open **Cambiar contraseña**. The **Guardar contraseña** button stays disabled
until the three fields are filled and the two new passwords match; a mismatch
shows "Las contraseñas no coinciden." under the last field. A wrong current
password returns you to the form with "La contraseña actual no es correcta."
under the first field. A correct change returns to Perfil, and the new password
works on the next login. Reload the fixtures afterwards to restore the shared
test password.

### D. Log out with confirmation

Tap **Cerrar sesión**. A bottom sheet slides up over the dimmed screen (the
design's confirmation sheet, not the system dialog, UX-002): «¿Cerrar sesión?»
in Lora, the note "Vuelves al inicio de sesión y tendrás que entrar de nuevo
con tu correo y contraseña.", an outlined Error **Cerrar sesión** and a quiet
**Cancelar** link. **Cancelar** (or the Android back button) closes the sheet
and keeps you signed in; **Cerrar sesión** spins in Error while the session is
revoked and returns to Login. The sheet is the same in the Staff app (E) and
on Android, where the old native dialog drew Material teal buttons.

### E. Staff Perfil

Start the Staff app on port 8082 (`pnpm --filter @pilates/staff-mobile start`)
and open `exp://127.0.0.1:8082` in Expo Go. Log in as
`emma.vargas@example.com`. Every role root shows a circular avatar with two
initials at the top right (accessibility label "Tu cuenta"; with unread
notifications it carries a Palo de rosa profundo dot and reads "Tu cuenta,
notificaciones sin leer"); tap it to open
**Perfil**. The screen is read-only: name, email, "Tus datos los actualiza
administración.", **Rol** (`Entrenadora`), **Sucursales** (`Centro, Equipetrol,
Urubó`), the **Notificaciones** row (with the unread count) and the
**Cambiar contraseña** row, both ending in the quiet chevron of 18, the
outlined **Cerrar sesión** button, and the version footer. Log in as
`paola.mendoza@example.com` to see **Administración** with "Todas las
sucursales". The staff inbox draws the same bare empty state as the Client's
(quiet bell, Lora title) with the line "Te avisaremos aquí cuando haya algo
que necesite tu atención."

### F. Offline behaviour

The apps are online-first. When the device loses connectivity, a banner reads
"Sin conexión. Mostrando la última información guardada." and only the class
schedule, upcoming Bookings, and the Subscription summary stay visible from the
Account-scoped cache; everything else needs the connection back. The banner
follows the device's connectivity (NetInfo feeds TanStack Query's
`onlineManager`), so on the Android emulator `adb shell svc wifi disable`
and `adb shell svc data disable` show it (and `enable` hides it); the iOS
Simulator shares the Mac's network, so there it is easiest on a device with
airplane mode. Test 71 walks the other states (load errors, action errors,
link screens).

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

**Pago por transferencia** shows the amount, then a card with the studio QR
(locally the placeholder image from `apps/backend/.data/transfer-qr.png`) and
the line "Escanea el código con tu app bancaria y transfiere el monto exacto."
and nothing else: since PAY-003 the QR is the only transfer instruction, with no
beneficiary, bank, or account line (Test 41 checks the endpoint). Tap **Sube tu comprobante de
transferencia**: the system photo picker opens with no permission prompt on
either platform (MOB-065; the Simulator ships with sample photos). Picking one re-encodes it as
a JPEG of at most 2048 px on its longest side (UPL-003, Test 53), uploads it
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
count and "Bs 500 en total", then one card per transfer, oldest first: the
Client's first letter in a tinted circle, her name in Lora over the Plan, a
Palo de rosa chevron on the right, and under a thin rule the amount in Lora
and an amber clock with how long ago it was sent ("Hace 3 minutos", "Ayer,
19:40") (MOB-042). With nothing to review the screen reads "No hay
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

### D. Cancel a Session as the Administrator

From **Pagos pendientes** tap **Cancelar una clase**. Pick the Branch (the
**Sucursal:** pill with its pin and down chevron, then a Branch chip), a day
chip, and a Class Type chip (**Todas** by default); the list shows every
Session of that day including full ones, except the ones that already
started (the backend refuses to cancel those, MOB-044). Each card ends in a Palo de rosa
chevron beside the time and the Class Type in Lora, names the Trainer after a
person icon and «Sucursal …» after a pin, and closes with "N reservas" and
the seat pill under a thin rule: "N cupos" in Palo de rosa oscuro on Palo de
rosa tinte, "Llena" in grey on a neutral sand pill, never red (MOB-042,
MOB-047).
No match reads "No hay clases con estos filtros." / "Prueba otro día, otra
sucursal u otro tipo de clase.". Tap a card: **Cancelar sesión** repeats the
Session, "N clientes afectados", and an amber warning "Esto no se puede
deshacer" with the live counts ("Se cancelarán las 2 reservas de esta clase,
se reembolsará una clase a cada cliente afectado — incluso si ya no podían
cancelar por su cuenta — y se les notificará.", plus "También se notificará a
las N en lista de espera." when someone waits) above the red **Sí, cancelar
sesión** and the plain **Cancelar**. Confirming
shows **Sesión cancelada** with "Se notificó a los N clientes afectados." ("Se
notificó al cliente afectado." for one) and "Se reembolsó una clase a cada
cliente."; **Volver** returns to the search.
The fixtures ship no Bookings, so book a class from the Client app first
(Test 7); cancelling a Session without Bookings answers
`409 session_has_no_bookings` and the screen shows "No pudimos cancelar la
sesión. Inténtalo de nuevo.".

### E. Paying fully with Credit

When the available Credit covers the whole price, **Continuar al pago**
activates the Plan immediately (`POST /api/v1/credit-purchases`) and lands on
"¡Pago confirmado!" without a QR. The fixtures cannot reach this (Bs 60 is
below the cheapest Plan), so the automated purchase-flow spec covers it; to
see it by hand, create a Plan priced under Bs 60 in Planes and buy it as
Sofía (Test 70, «Payments»).

## Test 11: act for a Client as the Assistant in the Staff app

Start the Staff app (Test 1B) with the backend and worker running (Test 2 and
the worker command from Test 5) and log in as `camila.rojas@example.com`
(Assistant assigned to Centro). The Assistant root is **Buscar cliente**.

### A. Find a Client and read her overview

Type at least two characters in **Buscar por nombre, teléfono o correo**
("luc", "7001", or "lucia@"). Each result is a white row with the Client's
first letter in a tinted circle, her name over «phone · email» (one line,
trimmed with an ellipsis when the row is narrower, MOB-046), and a Palo de
rosa chevron (MOB-042); a still-pending Client carries a **Pendiente** tag
before the chevron. With no match the screen
reads "No se encontró ningún cliente." and keeps **+ Nuevo cliente** as the
next step. Tap Lucía: the overview shows her Plan card ("Paquete de 8 clases",
"N clases restantes", "Vence el …", **Activa**), her next reservation, the
**Reservar clase** and **Registrar pago en efectivo** actions, **Ver
reservas** (only while a Plan is active), and the **Historial** card with her
last two classes and **Ver historial completo**. A Client without a Plan reads
"Sin plan activo" under a card icon, with "Esta clienta no tiene clases
disponibles. Registra un pago para activar un plan y poder reservar." and
**Reservar clase** disabled.

### B. Bookings, cancellation, and history

**Ver reservas** opens **Reservas de la clienta** under the banner "Viendo
reservas de: Lucía Fernández". Cards mirror the Client app: **Cancelar** for a
reservation outside the 2 h 30 window, **No cancelable** plus **Reprogramar**
inside it, **En lista de espera** plus **Salir de la lista de espera**.
**Reprogramar** opens **Reprogramar clase** under the banner with the same
option cards as the Client's (Test 5 B: the shared Session card with the
«N cupos» pill at the footer's right and a 2 px Palo de rosa border once
selected; MOB-048). Items
at a Branch you are not assigned to keep their action disabled with "Solo en
tus sucursales". Cancelling asks "¿Cancelar esta reserva de Lucía Fernández?"
first. With nothing upcoming the screen centres a quiet calendar, "Esta
clienta no tiene reservas próximas." in Lora 21, the line "Puedes reservarle
una clase desde el horario del estudio.", and **Reservar una clase** under
them (MOB-041; `lucia@example.com` has a Plan and no upcoming Booking in the
fixtures). **Ver historial completo** opens
**Historial de clases** under "Viendo historial de: …", drawn exactly like the
Client's own (Test 5 B): «Ha asistido a» over «N clases desde <mes>», then
month groups ("Septiembre 2026" with its count) of rows between thin rules
with the day column, the Class Type, and «Entrenadora · Sucursal». A Client
without attendance reads «Esta clienta aún no tiene clases en su historial.»
under the quiet clock, with no supporting line.

### C. Book a class for her

**Reservar clase** opens **Reservar una clase** with the banner "Reservando
para: Lucía Fernández", the **Sucursal:** pill, the seven day chips, and the
Class Type chips; the Session cards look exactly like the Client's (Test 5 B:
the time and the Lora Class Type, the seat pill in the same tones with
**Llena** for a full class, the Trainer after a person icon, the chevron), and
like the Client's list it leaves out today's Sessions
that already started (a Client cannot be booked into one, MOB-044). The
Session she already holds a Booking in (her «Próxima reserva» on the
overview) carries the neutral **Ya reservada** pill instead of the seat
count, and its detail shows "La clienta ya tiene esta clase reservada."
where **Reservar** would be, with no button (UX-003; a class she only waits
for keeps its count). Tap a Session: the detail shows Trainer, Branch, date, time, duration,
and a white box with «X de Y cupos disponibles» beside a **Con cupos** pill
(Palo de rosa oscuro on Palo de rosa tinte); a full class reads «0 de Y cupos
disponibles» beside **Completa** on the neutral sand pill, never red or green,
and no bar is drawn (MOB-048; follow-up 87). **Reservar** books it for the Client and lands
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
from there goes back to **Buscar cliente**. While a Client's Plan is still
in force (paid through today with classes left or an upcoming Booking, as
Lucía's is), **Registrar pago en efectivo** on the overview is disabled with
"Podrá comprar otro plan cuando este termine." under it, so the picker never
opens (UX-003); Isabel's Plan has no classes left and no Booking, so hers
stays enabled. Should two Assistants race, the confirmation still answers
"El cliente ya tiene un plan activo."

### E. Invite a new Client and manage the invitation

From **Buscar cliente** tap **+ Nuevo cliente**. Fill **Nombre**, **Correo
electrónico**, and optionally **Teléfono (opcional)**; the form explains
"Enviaremos un enlace de activación al correo. Vence en 7 días." **Crear
cuenta** creates the pending Client, queues the activation email (the worker
delivers it to the local capture), and opens her overview with the card
**Cuenta pendiente de activación**: the email, "El enlace de activación vence
el …", the 30-day removal note under a thin rule, **Cambiar correo** (a link under the
address), **Reenviar enlace**, and **Cancelar invitación** (confirmed with
"¿Cancelar la invitación de …?", then back to **Buscar cliente**). A second
send within a minute shows, inside the card, a white box with a clock: "Ya
enviamos un correo a esa dirección hace poco. El enlace vigente sigue
sirviendo." with "Podrás reenviarlo en 0:59." counting down from the server,
and **Reenviar enlace** disabled with a plain border. Too many emails from your own Account in a short
time show "Enviaste muchos correos en poco tiempo…" instead (Test 5 H). Creating her again with the same email reopens the
invitation: her overview starts with "Ana ya estaba pendiente de activación.
Le enviamos un enlace nuevo y conservamos sus datos.". An email of another
account answers "Este correo ya pertenece a otra cuenta. No se creó ni se
cambió nada." under the field. A Client who registered herself from the app is
not sent anything: the form says her email waits for verification and offers
**Enviar enlace de verificación** (24 hours, `POST
/api/v1/assistant/client-invitations/{clientId}/verification-emails`) and **Ver
cliente**. Her overview, from **Ver cliente** or from the search, shows the
same offer in place of the invitation card: no **Cuenta pendiente de
activación**, **Cambiar correo**, **Reenviar enlace**, or **Cancelar
invitación**, because she already chose a password; its button is the card's
48 pt one, and a second send within a minute shows the same white clock box
as **Reenviar enlace**. To create one, register
from the Client app (Test 4) and search for her by email. Once the pending Client has a Payment or Booking, **Cancelar
invitación** is replaced by "La cuenta ya tiene pagos o reservas, así que la
invitación se mantiene." and the account stays pending until she activates
it.

### F. Tablet layout

Open the same Metro URL in an iPad Simulator (for example iPad Pro 11-inch)
with Expo Go installed. **Buscar cliente** becomes a split view: the search
and results sit in a left column and the right panel shows a person icon in
a circle, "Selecciona un cliente para ver sus detalles", and "Busca por
nombre, teléfono o correo en el panel izquierdo. Su ficha se abrirá aquí, sin
perder la lista.". A result row keeps «phone · email» on one trimmed line in
the 360 pt column (MOB-046). Tapping a result highlights it and shows her
overview in the right panel without navigating away; **Ver reservas** and
**Ver historial completo** also open in that panel (the empty reservations
state centres in the panel with its button), with **Volver** returning
to the overview. **Reservar clase**, **Registrar pago en efectivo**, and
**+ Nuevo cliente** open full-screen: the classes (each card with its Trainer
line and chevron) and the Plans show as a two-column grid, and the Session detail, the cash confirmation, and the new
Client form sit in a centered card. Finishing a booking, a cash Payment, or a
new Client returns to the split with that Client in the panel (also when the
same email reopened her invitation, with its notice). Cancelling an
invitation clears the panel.

Client search ignores accents and case: "lucia" finds Lucía Fernández and
"guzman" finds Sofía Guzmán (STAFF-004).

## Test 12: see the agenda and record attendance as a Trainer

Load the fixtures (Test 5A) and start the backend. Open the Staff app (Test
1B) and log in as `emma.vargas@example.com` with `emma-local-2026`.

1. **Mi agenda** greets you by name ("Hola, Emma", MOB-043) and lists today's
   Sessions you lead, the ones that already started included (attendance is
   recorded after the class ends, MOB-044). Each card
   ends in a Palo de rosa chevron beside the 24-hour time ("07:00 – 07:50",
   as the Client's list writes it) and the Class Type in Lora,
   names the Branch after a small pin, and closes with "N de M reservados"
   after a person icon and a **Con cupos** pill (Palo de rosa oscuro on Palo
   de rosa tinte) or a **Completa** pill (grey on a neutral sand pill, never
   green) under a thin rule (MOB-042, MOB-047). Book a class for today as
   `lucia@example.com` in the Client app (or through Swagger) first if the
   list is empty.
2. Tap a Session to open its roster ("Centro · 07:00 – 07:50" under the
   title): every booked Client with **Asistió** and
   **No asistió** choices, or "No hay reservas para esta sesión." A Session
   that has not ended yet shows "Podrás marcar asistencia cuando termine la
   clase." instead of the choices (the API answers `403` before the end,
   Test 61).
3. Mark every Client and tap **Guardar asistencia** (enabled only once every
   Client has an outcome): "Asistencia guardada." appears under the button
   ("No pudimos guardar la asistencia." if the API refused). "Asistió"
   classes then appear in the Client's **Ver historial** as «Ha asistido a»
   with the month group of Test 5 B.
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
export DATABASE_URL=postgresql://$USER@localhost:5433/pilates_test_bootstrap
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
`dropdb pilates_test_bootstrap`. To complete the activation, either start the
worker on that database and take the `activation` email's `token` from
`apps/backend/.data/email-capture/` (Test 34), or print the queued link with
`node dist/src/administrator-activation-link-main.js` (Test 42 C); paste it
into the admin web's `/crear-contrasena?token=…` page (Test 24, step 10).

## Test 15: book an Evaluation and manage the Nutritionist's availability

Load the fixtures (Test 5A) and start the backend and both apps (Test 1).

**In the Client app** as `lucia@example.com`:

1. Open **Perfil → Evaluación nutricional**. Only days with an open turno
   appear; each turno is 45 minutes and disappears 3 hours before it starts.
   With more than one Branch, each turno names its Branch.
2. Tap a time, check the summary on **Confirmar evaluación** ("Es gratuita —
   no usa clases de tu plan." and "…puedes cancelarla desde Mis evaluaciones
   hasta 3 horas antes."), and tap **Confirmar**. You land on **Mis
   evaluaciones** with "Evaluación confirmada".
3. Tap **Cancelar** and confirm: the sheet says the turno is freed and "Podrás
   reservar otra evaluación para este mes." (or "para noviembre" when the
   Evaluation is next month's). Inside 3 hours of the start the card shows
   "Ya no se puede cancelar" instead. With nothing upcoming the list says this
   month's Evaluation is still free, or, once it took place, "Ya usaste tu
   evaluación de este mes. Puedes reservar la de noviembre, también gratuita."
4. Book one again and open **Evaluación nutricional**: days in that month
   disappear. When no unused month has open turnos, the screen shows "Ya usaste
   tu evaluación de este mes." (naming the month when the used one is a later
   month). A Client without an active plan sees "Necesitas un plan activo…"
   with **Ver planes**. A studio cancellation reaches the inbox as "…Ya puedes
   reservar otra este mes." (or "…otra para octubre.").

**In the Staff app** as `gabriela.flores@example.com`:

1. **Mi agenda** groups upcoming Evaluations by day ("Hoy", "Mañana"). Each
   row shows the time in Lora over "45 min", a thin vertical divider, the
   Client over "Primera evaluación" or "Seguimiento", and a Palo de rosa
   chevron (MOB-042). Tap a card, then **Cancelar
   evaluación**, and confirm: the Client is notified, the turno is freed, and
   the "Evaluación cancelada" strip fades after 8 seconds. An Evaluation that
   already started offers no **Cancelar evaluación**.
2. **Mi disponibilidad** lists the weekly blocks from Monday to Sunday with
   their turnos and bookings, and "Desde…"/"Hasta…" when a block starts later
   or ends.
3. **+ Nuevo horario**: pick a day, a start and end on the 15-minute grid, and
   the date it starts ("A partir del", today by default). The preview counts the
   turnos ("1 turno de 45 min", "3 turnos de 45 min"), and reopening a time
   sheet marks the current time in Palo de rosa profundo with a check. A
   Nutritionist with two Branches also picks the Branch. An overlapping block is refused with "Se
   superpone con otro de tus horarios."
4. Tap a block to edit it ("Aplicar cambios desde") or **Eliminar horario**.
   When it already has bookings, a sheet confirms that those Evaluations stay.

## Test 16: watch the worker's retention sweeps

When the worker starts, and then every hour, its `retention_sweep` marks
housekeeping rows that have outlived their provisional retention (BE-008)
as removed: idempotency records past their own expiry and at least 48 hours
old, Authentication Sessions 90 days after they were revoked or expired,
throttle events 30 days after they stopped counting, and notifications 180
days after they were read. Unread notifications and audit records are never
touched. Nothing is physically deleted
([ADR-0086](./adr/0086-soft-delete-every-database-row.md)): the row stays
with `deleted_at` set and leaves every list. To see it, insert an old read
notification for a fixture Account in `pilates_dev_sim` (for example
`read_at = now() - interval '200 days'`), start the worker, and a few
seconds later the row has `deleted_at` and the inbox no longer lists it.
The worker logs only a sanitized `retention_sweep_failed` event if a sweep
fails. The other housekeeping sweeps (pending Accounts, abandoned and
released images, open Purchase Intents) are Test 68.

## Test 17: manage Staff Members as the Administrator (API)

The admin web now does all of this on the Personal page (Test 26); to try
the API directly, use Swagger or curl as `paola.mendoza@example.com` (Test 3
shows how to log in and authorize):

1. `GET /api/v1/administrator/staff-members` lists every Staff Member with
   `page`, `pageSize` (up to 100), and optional `role`, `branchId`, and
   `status` (`pending`, `active`, `deactivated`) filters;
   `GET …/staff-members/{id}` reads one (the admin web's panel, Test 26;
   `404 staff_member_not_found` for an unknown id).
2. `POST /api/v1/administrator/staff-members` with a name, email, Role, and
   Branches creates a pending Staff Member and queues the Activation Link
   email. An Administrator is created without Branches (they hold every
   Branch; Branches sent for one answer `400 invalid_branch_assignment`);
   every other Role needs at least one active Branch.
3. `POST …/{id}/activation-link` sends a new link while the person is still
   pending (at most one per minute per email; a limited send answers `429
   email_throttled` with `Retry-After` in seconds). While pending,
   `POST …/{id}/email-corrections` `{ email }` moves the invitation to a new
   address (old links stop working, a fresh 7-day link and 30-day window;
   `400 email_unchanged` for the same address) and
   `POST …/{id}/invitation-cancellation` answers `204` and marks the Account,
   the Staff Member, and its Branch rows removed (both answer `409
   staff_member_not_pending` once activated). Creating a member with a pending
   member's email reopens that invitation (`201` with `invitationReopened:
   true`, Role and Branches unchanged); a Client's email answers `409
   email_belongs_to_client` and another Staff Member's `409 email_in_use`.
4. `PUT …/{id}/role` and `PUT …/{id}/branches` change the Role or the
   Branches. A Nutritionist's Availability Blocks end from today when her Role
   changes or she loses a Branch (booked Evaluations stay). A Trainer who still
   leads upcoming Sessions or Session Schedules cannot lose that Branch, change
   Role, or be deactivated (`409 trainer_has_upcoming_sessions`).
5. `POST …/{id}/deactivation` disables the Account and signs it out
   everywhere.

You cannot change or deactivate yourself (`409 own_staff_member`) or remove the
last active Administrator (`409 last_administrator`). Other Roles get `403`.

## Test 18: the Promotions carousel, Home shortcuts, Mi plan, and notification taps

In the Client app as `lucia@example.com`:

0. **Novedades del estudio.** With the two Promotions of Test 33 published
   (the fixtures ship none), **Inicio** shows the carousel under the
   greeting: one card per published Promotion in the admin web's order, the
   image at 16:9 (the portrait one is centre-cropped), the headline, and the
   description; swipe sideways to page one card at a time and watch the dots
   under the cards follow ("Promoción 1 de 2" for VoiceOver). A card does
   nothing when tapped. While the list loads, a beige placeholder card holds
   the space; with nothing published, or when the API cannot be reached, the
   section disappears and the rest of Inicio stays. Unpublish both in the
   admin web (Test 33, **Dejar de publicar**) and pull Inicio down to
   refresh: the section is gone. On an iPad the card stops at 720 pt and the
   next one peeks on the right.
1. **Inicio** shows the shortcuts under an **Accesos rápidos** eyebrow
   (MOB-042): a full-width **Reservar una clase** card with a calendar in a
   tinted tile, the title in Lora, "Horarios de esta semana", and a Palo de
   rosa chevron (without an active Plan the card turns Arena with a grey
   calendar and title, "Necesitas un plan activo para reservar", and a quiet
   lock instead of the chevron), over two half-width tiles with no chevron:
   **Evaluación nutricional** (a trend icon; "Próxima: …" when one is booked,
   otherwise "Agenda tu cita del mes"; it opens Mis evaluaciones or the
   availability) and **Mis referidos** (a person icon; "N amigas invitadas" or
   "Invita amigas y gana crédito").
2. **Ver detalle** opens **Mi plan**: "Suscripción actual" with dates such as
   "13 de octubre de 2026" and "Podrás comprar un plan nuevo cuando este
   termine."; while expiring, an amber banner; once expired, "Último plan",
   "Venció el …", and **Comprar un plan**. As `isabel@example.com` (no
   classes left) the classes line reads "Sin clases disponibles". Mi plan
   refreshes when it regains focus and on pull (UX-004): confirm Lucía's
   pending transfer in the admin web while the screen is open elsewhere and
   it shows the new Plan on its next focus, without the loading logo.
3. In **Perfil → Notificaciones**, tapping an Evaluation notice opens Mis
   evaluaciones, a class-cancelled notice opens Mis reservas, a payment notice
   opens the payment status, and a Plan notice opens Mi plan.

In the Staff app, a Trainer's "Tu clase … se canceló" notice and a
Nutritionist's Evaluation notices open **Mi agenda**. The Staff roots (Mi
agenda, the results of Buscar cliente, Pagos pendientes, the Nutritionist's
agenda, Mi disponibilidad) and both apps' Notificaciones refresh when they
regain focus (closing the roster, a review, or a client refetches the list
behind it) and on pull, with the same Palo de rosa spinner (UX-004).

## Test 19: run the mobile critical journeys and the release smoke check

The committed Maestro flows under `apps/client-mobile/.maestro` and
`apps/staff-mobile/.maestro` are the critical journeys. Each flow's header
names the fixture Account it logs in as and what it needs beyond the
fixtures; this test is the checklist for the whole suite.

**Before a run.** Rebuild the database from the migrations and load fresh
fixtures **before each suite** (Test 5A; stop the API and worker first:
`dropdb pilates_dev_sim && createdb pilates_dev_sim`, then `db:migrate:deploy`
and `db:fixtures` on it). The Staff suite needs the fixtures as they ship,
not a database the Client suite has used: its seed buys Plans for Mariana and
Sofía, which the Client suite gives a pending transfer and closes. A quick way
to reset between suites is a template: load the fixtures once into
`pilates_journeys_base`, then `dropdb --force pilates_journeys && createdb
pilates_journeys -T pilates_journeys_base` before each suite, with the API and
the worker restarted on it (the fixtures' 30-day window and Valeria's
three-day Plan count from the day the template was loaded, so rebuild the
template on a new day). Start the API **and the worker** on it
(`pnpm --filter @pilates/backend start:worker`): `profile-photo.yaml`
uploads a photo that stays «processing» until the worker rebuilds it, and
without the worker the flow times out waiting for «Quitar foto». Serve both
apps in development mode (Expo Go cannot run a production bundle here): the
staff Metro on 8082 and the client Metro on any free port (8083 below,
because another project holds 8081 on this machine). The studio QR on 10 is
the untracked placeholder `apps/backend/.data/transfer-qr.png` (Test 10B); a
fresh git worktree does not have it, so copy it from your main checkout or
`purchase-plan-transfer.yaml` finds only the grey placeholder. Then seed what
the fixtures do not ship:

- **Two published Promotions** with the headlines of Test 33, «Nueva sala de
  Reformer en Urubó» and «Clases de Barre los sábados», created in the
  admin web (Test 33) or through Swagger (Test 32C) with the worker running
  for their image variants. `home-plan-and-notifications.yaml` asserts those
  two headlines; its `PROMOTION_1` and `PROMOTION_2` defaults cannot be
  changed from the command line, because a flow's `env:` value wins over
  `-e` (a `-e EMAIL=sofia@example.com` against the booking flow's Lucía
  default still logs in as Lucía).
- **Two notifications for Lucía**, which the same flow opens from Perfil →
  Notificaciones: an Evaluation cancelled by the studio («El estudio
  canceló tu evaluación nutricional…»: book one of Gabriela's slots as
  `lucia@example.com` through `POST /api/v1/evaluation-slots/{slotId}/evaluations`,
  then cancel it as `gabriela.flores@example.com` with
  `DELETE /api/v1/nutritionist/evaluations/{id}`), and a class cancelled by
  administration («Tu clase de … fue cancelada por administración.»: book a
  Session inside her Plan as Lucía, then cancel it as
  `paola.mendoza@example.com` with
  `POST /api/v1/administrator/sessions/{id}/cancel`). Both must fall inside
  Lucía's Plan (it ends 20 days after the fixtures), or the API refuses the
  booking.
- **One image in each Simulator's photo library** for `profile-photo.yaml`:
  `xcrun simctl addmedia <udid> photo.jpg` (Maestro has no command that
  reaches the library, so the flow picks the first grid cell of whatever is
  there).

**Run.** From each app folder, with the device's UDID (the iPhone 16 Pro and
the iPad Pro 11 here; shut the iPhone down before the iPad run, or the iPad
driver does not connect):

```sh
cd apps/client-mobile
maestro --udid <udid> test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8083 \
  -e PASSWORD=emma-local-2026 -e API_URL=http://127.0.0.1:3100 .maestro
# rebuild the database here, then:
cd ../staff-mobile
API_URL=http://127.0.0.1:3100 node .maestro/seed.mjs
maestro --udid <udid> test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8082 \
  -e PASSWORD=emma-local-2026 -e API_URL=http://127.0.0.1:3100 .maestro
```

`API_URL` is the API the apps talk to: several flows seed their own classes
through it before they log in (`.maestro/scripts/seed.js`, run by Maestro's
`runScript`, so the flow reads the new Session's id and day). With a
development build (Test 45) instead of Expo Go, pass the app's id and the
dev-client link: `-e APP_ID=com.emmapilates.client -e
"APP_LINK=exp+emma-pilates-client://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083"`
(`com.emmapilates.staff` and `exp+emma-pilates-staff://…8082` for Staff).
On the Android emulator the development launcher ignores the `exp+` link:
pass the app's own scheme instead,
`"APP_LINK=emmapilates-client://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083"`
(`emmapilates-staff://` for Staff), run `adb reverse tcp:<port> tcp:<port>`
for both Metro ports and the API's, and use `--udid emulator-5554`. The
launcher can still drop the first link while it starts, so
`subflows/open-app.yaml` sends it again on Android. Android's photo picker
labels each photo «Photo taken on …» and wants «Done»;
`subflows/pick-first-photo.yaml` handles both pickers, and the emulator's
library needs one image too (on this machine the emulator still holds
`mob065-receipt.png` in Pictures; a push into Pictures with `adb` is refused).

`seed.mjs` (Node, no dependencies) does what Maestro's scripts cannot: Mariana
and Sofía each buy the 8-class Plan by transfer with a generated receipt
image (so the worker must be running), and Emma gets a five-minute class at
Centro starting about two minutes later with Lucía booked, which has ended by
the time the suite reaches the Trainer's attendance. It prints one line per
item; run it once per fresh database.

The flows find controls by `testID` (MOB-066), not by their Spanish labels:
the login fields and button (`login-email`, `login-password`,
`login-submit`), the Client tabs (`tab-home`, `tab-booking`, `tab-bookings`,
`tab-profile`), and per-item ids such as `session-card-<id>`,
`browse-day-<YYYY-MM-DD>`, or `pending-payment-<id>`. Text is still asserted
where it is the behaviour under test (a refusal message, a confirmation).

Since NOT-002 a booking, an Evaluation, and a Staff role's first home can
raise the notification sheet «¿Te avisamos?» while the system has not asked
yet. The flows answer «Ahora no» through `subflows/dismiss-push-permission.yaml`
(an optional step, so a device that already answered runs as before), and they
do it **before** asserting «Reserva confirmada» or «Evaluación confirmada»:
the sheet hides the screen beneath it from Maestro, and those notices last
eight seconds.

The Client suite runs its eleven flows in the order its `config.yaml` pins
(Maestro's own order is not the file order): `login-errors-and-recovery`
(a wrong password shows «El correo o la contraseña no son correctos.», then
«¿Olvidaste tu contraseña?» sends Lucía a recovery link that is captured,
never opened), `book-and-cancel-class`
(Lucía books the first Session of the day and cancels it; Sofía's fixture
Plan is expired, so she cannot book), `email-change` (Lucía asks, resends, and cancels an email
change; the captured link of Test 34 is not read), `evaluation-book-and-cancel`
(Lucía), `home-plan-and-notifications` (Lucía; the Promotions and
notifications above), `profile-photo` (Lucía; the worker and the library
photo above), `promotions-consent`, `purchase-plan-transfer` (Mariana buys
the first Plan from Home: 08 → 09 → 10 with the studio QR → a receipt from
the library → 11 «Pago en revisión»; the worker and the library photo
again), `waitlist-join-and-leave` (the flow seeds a one-seat class tomorrow at
05:00 in Centro that Valeria fills; Lucía joins its Waitlist from 04 and
leaves it from 05), `reschedule-booking` (the flow books Lucía on a class
about 10 minutes away, inside the 2 h 30 window where 05 offers
«Reprogramar», and a later one the same day for Valeria, both ten minutes
long; Lucía moves to it; it fails after about 23:30, when the second class
would fall on the next day), and last `close-account` (Sofía closes her Account for good,
Test 35: nothing after it logs in as her, but the database is spent, so
rebuild it before the next run instead of re-applying the fixtures). The
three seeding flows add classes at Centro early tomorrow and in the next
hour, which is why they run after the flows that read today's fixture
schedule.

The Staff suite runs its ten flows in its `config.yaml` order:
`administrator-pending-payments`
(Paola; «No hay pagos pendientes.» is accepted, so no transfer is needed),
`administrator-view-as` (Paola sees the app as Emma from Perfil and leaves
with «Salir», Test 67), `assistant-client-search` (Camila finds Lucía), `nutritionist-availability`
(Gabriela publishes and removes a Friday block), `trainer-agenda-and-inbox`
(Emma; an empty day is accepted), then the journeys that change things:
`administrator-review-payments` (Paola confirms Mariana's transfer and
rejects Sofía's with a reason, S12; both come from `seed.mjs`),
`administrator-cancel-session` (the flow seeds a class tomorrow at Centro
booked by Lucía; Paola cancels it from S13 and S14 reports one Client told
and refunded), `assistant-create-client` (Camila creates «Paula Maestro»
with a new `maestro.<time>@example.com` address on every run, S05, and lands
on the pending invitation, S06), `assistant-cash-payment-and-booking` (Camila
takes Isabel's cash Payment for the first Plan, S08–S10, then books her into
a class the flow seeds tomorrow at Centro, S07 and S11), and last
`trainer-attendance` (Emma opens `seed.mjs`'s finished class, waits for it to
end if needed, marks Lucía «Asistió», and saves, S03). Every run changes the
database: rebuild it before each suite and between the iPhone and the iPad.

**The floating dev-tools button.** In development mode Expo Go and the
development builds draw a dev-menu button over the top-right corner of
every screen, where the Staff avatar «Tu cuenta» and the Nutritionist's
«+ Nuevo horario» sit. Every Staff flow parks it first through
`subflows/park-dev-gear.yaml`. On iOS the button is in the view hierarchy as
`gearshape.fill`, and a `swipe` from that element moves it to the
bottom-right corner, on the phone and on the tablet alike. On Android a swipe
opens the dev menu instead and the button's touch area covers the whole
avatar, so the subflow taps it («Tools»), switches **Tools button** off in
the menu, and closes it. Each step runs only when the button is on screen. The Client flows tap nothing under it. A render error in
Expo Go opens LogBox over the recovery screen (Test 1); none of the
committed flows provokes one.

To check that the release bundles build, run
`EXPO_PUBLIC_API_URL=https://api.example.com pnpm --filter @pilates/client-mobile release:smoke`
(and the same for `@pilates/staff-mobile`). The script behind it is the
`pilates-mobile-release-smoke` bin of `@pilates/tooling`
(`packages/tooling/scripts/mobile-release-smoke.mjs`, linted by that
package's `lint`, Test 8). It prints `mobile_release_smoke_passed` with both
bundle sizes. Store builds and updates follow the
[mobile release runbook](./runbooks/mobile-release.md) and need the Expo,
Apple, and Google accounts first.

## Test 20: search every Branch as the Administrator

In the Staff app as `paola.mendoza@example.com`, open **Cancelar una clase**,
tap **Sucursal**, and choose **Todas las sucursales**: the day's Sessions of
every Branch appear together, each card naming its Trainer and Branch
("Emma Vargas · Urubó"). The API behind it is
`GET /api/v1/administrator/sessions?from=…&until=…` (Administrators only).

## Test 21: manage the catalog, schedules, and reports as the Administrator (API)

The admin web does all of this on its pages (Tests 25, 29, and 30); to try
the API directly, use Swagger or curl as `paola.mendoza@example.com` (Test 3
shows how to log in and authorize). Other Roles get
`403 administration_access_denied`. The rule codes these commands answer
(`invalid_catalog_value`, `class_type_name_taken`, `invalid_schedule`,
`effective_date_invalid`, `session_not_editable`) are listed in Test 70.

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
   start. `POST …/{id}/end` stops it from a date. `POST …/batch` takes the
   same Branch, Class Type, Trainer, capacity, and `effectiveFrom` once, plus
   `rows` (1 to 7 of `{"weekday": 2, "startsAtLocal": "06:00"}`), and creates
   one schedule per row in one transaction, answering `{"schedules": [...]}`
   with each row's counts; rows that repeat or overlap each other answer
   `409 schedule_rows_overlap` with the row named in `detail` ("Row 2
   repeats row 1") and nothing is saved, as with `trainer_not_assignable`.
   A reassigned Trainer gets a
   notice such as "Se te asignó una clase: Mat Pilates, sábado 26 de
   septiembre, 16:00.".
3. **Single Sessions**: `POST /api/v1/administrator/sessions` adds a one-off
   Session; `PATCH …/{id}` changes its start, Trainer, or capacity. Overlaps
   answer `409 session_overlap`, and capacity below the booked count answers
   `409 capacity_below_bookings`.
4. **Oversight**: `GET evaluations?from=…&until=…&branchId=…` (booked
   Evaluations of one Branch, each with `kind` `first` or `follow_up`),
   `DELETE evaluations/{id}` (cancels it for the Client), `GET
   referrals?query=sofia` (with the studio's `awardedCount` and
   `pendingCount` and each referrer's `referrerReferralCount`), `GET credits`
   (Clients with available Credit, the studio total, and each one's
   `lastMovementKind`), and
   `GET reports/income?from=…&until=…&branchId=…` (income by month and method;
   with a Branch only its cash counts).

## Test 22: run the Back Office as the Administrator (API)

These are the API calls behind the admin web's Back Office pages (Test 28);
use Swagger or curl as `paola.mendoza@example.com` (Test 3 shows how to log in
and authorize). Every
route below lives under `/api/v1/administrator/`; other Roles get
`403 back_office_access_denied`. The four `POST`s that record a Withdrawal,
Restock, Salary Payment, or Expense need an `Idempotency-Key` header with a new
UUID; sending the same key and body again returns the first result without
recording twice, and the same key with a different body answers
`409 idempotency_key_reused`.

1. **Supplies** (Insumos): `POST supplies` with a Branch, `name`,
   `initialQuantity`, and `lowStockThreshold` creates one; `GET
   supplies?branchId=…` pages that Branch's active Supplies (`page`,
   `pageSize`, and `status=active|archived|all`) with `lowStock` set when the
   quantity is at or below the threshold and the Branch's `lowStockCount` on
   every page. `PUT supplies/{id}`
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
titled after the page, "Horario · Emma", and loads Lora and Work Sans from
Google Fonts; before you sign in it reads "Iniciar sesión · Emma"). While
it loads, the page shows only the Emma logo on the cream background
(Test 66).
Every page now needs a signed-in Administrator, so start the backend
(Test 2) and log in first as Test 24 describes; `/api/v1` is proxied to
`http://127.0.0.1:3100` like the Vercel origin will do.

To try the built app instead of the development server (what a deployment
serves), build it and start the preview server on port 4173 with the same
proxy; the backend must then also trust that origin:

```sh
pnpm --filter @pilates/admin-web build
pnpm --filter @pilates/admin-web preview
```

```sh
DATABASE_URL="postgresql://$USER@localhost:5433/pilates_dev_sim" ADMIN_WEB_TRUSTED_ORIGINS="http://localhost:5173,http://localhost:4173" pnpm dev:backend
```

The built app is split by page: the shell, the Login pages, and the session
check load first, and each page's code arrives the first time you open it
(or as soon as you point at its sidebar entry). In the browser's developer
tools (Network) you can see one small `*-route-*.js` file per page.

1. **Sidebar.** On a desktop-width window the "Emma" wordmark sits once, at
   the top of the sidebar, and the content area is the warm Superficie tone,
   a shade lighter than the sand behind the Login card. The left sidebar shows **Horario**,
   then **Catálogo** (Tipos de clase, Planes, Sucursales), **Back Office**
   (Clientes, Pagos, Insumos, Evaluaciones nutricionales, Personal, Nómina,
   Gastos, Categorías de gasto), **Reporte**, and **Promociones** (Promociones,
   Referidos, Créditos). There is no "Descuentos". Every entry is a real page
   (Tests 25 to 30 and 33); the entry you choose is highlighted in the
   sidebar and the address changes (`/promociones`, for example).
2. **Branch selector.** The top bar shows **Sucursal Centro**. Click it: a
   popover lists Centro, Equipetrol, and Urubó with their addresses, marks the
   current one with a check, and ends with **Gestionar sucursales** (opens
   Sucursales). Choosing Urubó closes the popover, the cell reads **Sucursal
   Urubó**, and you stay on the same page. Esc or a click outside closes it.
   It works from the keyboard too: open it with Enter, the current Branch
   has focus, the arrow keys (and Home/End) move between Branches, and Enter
   chooses. Press Tab on a fresh page and the first thing focused is a
   **Saltar al contenido** link that jumps past the sidebar; after any
   sidebar navigation focus lands on the new page's content.
   On **Reporte** the cell is replaced by "El reporte usa su propio filtro de
   sucursal" (the report has its own selector, Test 30). On **Pagos**,
   **Clientes**, **Nómina**, **Categorías de gasto**, **Referidos**, or
   **Créditos** the
   popover first says "Esta página no se filtra por sucursal — …" and still
   lets you switch for the next page. The Branches are the active ones the
   API returns (Test 25); archived Branches never appear here.
3. **Narrow browser.** Make the window narrower than 1024 px (or open the
   address on a phone). The sidebar disappears behind the **Abrir menú**
   button, which opens a drawer with the same sections that closes after you
   pick one, and the Branch selector opens as a sheet from the bottom.
4. **Unknown address.** Open `http://localhost:5173/no-existe`: "Página no
   encontrada" with **Volver al horario**. A list address with a bad page,
   such as `/promociones?page=abc&pageSize=500`, is accepted and treated as
   page 1 of 20.

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
DATABASE_URL="postgresql://$USER@localhost:5433/pilates_dev_sim" pnpm --filter @pilates/backend db:fixtures
DATABASE_URL="postgresql://$USER@localhost:5433/pilates_dev_sim" pnpm dev:backend
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
6. **Show the password** (WEB-022, design follow-up 92). Every password
   field (**Contraseña** on the Login card, the three fields of **Cambiar
   contraseña**, and both fields of the emailed **Crear contraseña** page)
   starts hidden, with an eye inside its right end. Click the eye: the typed
   text appears, the icon gets a slash, and its label becomes **Ocultar
   contraseña**. The value and the caret stay where they were, and the focus
   stays in the field. Click again to hide it. Each field toggles on its own.
   With the keyboard, **Tab** from a field reaches its eye (focus ring) and
   **Space** or **Enter** toggles it without submitting. Logging in works
   the same with the password shown.
7. **Log out.** Open the menu, choose **Cerrar sesión**: it first asks
   "¿Cerrar sesión?" with **Cancelar**, which has focus (press Enter to keep
   your session). Confirm, and you are back on Login;
   the session cookie is gone and going back to a page asks you to log in.
   A session that ended behind the browser's back (log out from a second
   tab, or `DELETE /api/v1/admin-web/authentication-sessions/current` with
   the cookie jar) sends the next click to Login with "Tu sesión terminó.
   Vuelve a iniciar sesión." and brings you back to that page after Login;
   with the cookie gone, `GET /api/v1/admin-web/authentication-sessions/current`
   answers `401 authentication_required`.
8. **Throttling.** On Login, submit a made-up email such as
   `nobody.admin-login@example.com` with any password six times. The seventh
   try shows "Demasiados intentos. Intenta de nuevo en un momento." with a
   countdown from the server (0:30 at first) and a disabled button.
9. **Recovery.** **¿Olvidaste tu contraseña?** opens **Recuperar contraseña**.
   Any email gives the same "Revisa tu correo" state ("El enlace vence en 30
   minutos.") whether or not it belongs to an Account. Once the device or
   network budget is full (Test 5 G), a note with a clock above the field
   reads "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya
   recibiste un enlace, sigue sirviendo." with "Podrás pedirlo en m:ss." and
   **Enviar enlace** stays disabled.
10. **Links.** Open
    [http://localhost:5173/crear-contrasena?token=not-a-real-link-secret](http://localhost:5173/crear-contrasena?token=not-a-real-link-secret):
    "Este enlace no es válido". With the worker running, real links are in
    `apps/backend/.data/email-capture/` (Test 34): paste a captured activation
    or recovery link's `token` after `?token=` to see the form, or a used or
    superseded one for "Este enlace ya no es válido". An activation link whose
    invitation the 30-day cleanup removed (to fake one locally, set that
    pending Account's `pending_expires_at` to the past in `pilates_dev_sim`)
    shows "Esta invitación ya no está activa" with **Volver a iniciar
    sesión**. Finish each kind once: an activation link (a Staff Member
    invited in Test 26) saves the password through
    `POST /api/v1/account-activations` and returns to Login with "Tu cuenta
    está activa. Inicia sesión con tu nueva contraseña." and no session; a
    recovery link (step 9, for Paola) goes through
    `POST /api/v1/admin-web/password-recoveries` and lands on Horario
    signed in, her other sessions revoked. Either token answers `expired` a
    second time and the page shows the used-link state.
11. **Narrow browser.** At a phone width the top bar keeps only the avatar, the
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
   grid for it without leaving the page: "Cargando el horario…" first, then
   that Branch's Sessions, never the previous Branch's under the new name.
2. **Nueva sesión.** **+ Nueva sesión** opens the 408 px side panel. **Una sola
   vez** asks for Tipo de clase, Entrenadora (only Trainers assigned to the
   Branch), Fecha, Hora, **Duración** (60 minutes to start, 5 to 240, with a
   fixed "min" inside the box), and Capacidad (filled from the Class Type).
   A Class Type has no duration (WEB-027): every Session chooses its own, so
   a one-off Saturday 18:00 Mat Pilates of 75 minutes shows 18:00 – 19:15 on
   the grid. **Cada semana** swaps Fecha and Hora for **Días y horas** and
   **Vigente desde**: one row per day, each with its Día, its Hora, and its
   own Duración box (60 to start). **Agregar día** adds a row for the next
   day at the last row's time and minutes (up to seven); the × button removes a row (there is none while only one row is
   left). For example Martes 06:00, Jueves 06:00, and Sábado 08:00 from next
   Monday: **Guardar** creates the three weekly schedules together and the
   page says "3 series semanales creadas: 12 sesiones en los próximos 30
   días." (one row keeps "Serie semanal creada: …"). Two rows on the same day
   and time are refused before anything is sent ("Ya está el jueves a las
   06:00." under the second row, both of its fields in red), and so is a row
   that starts inside another row's own duration ("Se cruza con …"): Lunes
   07:00 for 120 minutes and Lunes 08:00 clash, Lunes 07:00 for 45 and
   Lunes 08:00 do not. Nothing is
   saved if the Trainer or Class Type is refused. Each row is its own weekly
   schedule afterwards: click one of its Sessions and **Esta y las futuras**
   shows only that day and time. **Guardar** with empty fields marks each one;
   a Session that overlaps another says "Se cruza con otra sesión…".
   **From an empty slot** (desktop width only): point at an empty hour of a
   day column, for example Friday at 10:00. It shows a pale fill, a dashed
   rose border, and "+ 10:00"; click it and **Nueva sesión** opens with
   **Una sola vez**, that Fecha, and Hora `10:00` already filled in, in the
   Branch from the top bar, and every other field empty as with the button.
   Every field can still be changed; **Cada semana** starts on that weekday
   with **Vigente desde** on that date. An hour a Session covers completely
   has no slot, and a block still opens **Editar sesión**. With the keyboard,
   **Tab** from a block moves to the next empty hour of that day (the dashed
   border and a dark focus ring) and **Enter** opens the panel. A slot on a
   past day opens the form too, and **Guardar** says "Elige una fecha desde
   hoy." under Fecha. At a phone width the day list has no slots: only
   **+ Nueva sesión** creates there.
3. **Editar sesión.** Click a block. The panel names the day, time, and
   "N de M lugares reservados" (plus "N en lista de espera"). A Session a
   weekly schedule generated offers **Solo esta sesión** (change its Trainer,
   date, time, Duración, or capacity; Duración starts at the Session's own
   minutes, and a new start keeps them unless you change them; capacity
   cannot go below the booked seats) or
   **Esta y las futuras** (change the weekly schedule from a **Vigente desde**
   date, with the series' own Duración: unbooked Sessions move, booked ones
   stay, and the page says how many of each). **Terminar la serie** stops the schedule from a date after asking.
4. **Cancelar sesión.** Only a Session with Bookings offers it (an empty one
   says it cancels itself 2 hours before). The confirmation says every
   Booking is refunded even inside the 2 h 30 window and that the waitlist is
   notified; afterwards the Session disappears from the grid and the page
   says "Sesión cancelada: N reservas reembolsadas y avisos enviados.". To try
   it, book a Session first as a Client (Test 10 or the Staff app, Test 11).
5. **Sucursales, Tipos de clase, Planes.** Each is a dense table with
   pagination and one filter in the address (`?status=archived`,
   `?visibility=hidden`). **+ Nueva …** and a row open the side panel. A new
   Branch asks for **Nombre** and **Dirección** under "Aparecerá en el
   selector de sucursal al guardarla."; an existing one explains that it
   already appears in the top bar and in every Back Office record that
   depends on it, so renaming moves nothing, and its **Archivar sucursal**
   dialog says it leaves the selector, receives no new Sessions, and keeps
   its history. Plans
   show prices as `Bs 1.050,00`, last 1, 3, 6, or 12 months, and always carry
   a class count; **Ocultar en la app** hides one from the Client catalog.
   A Class Type needs a description, and a taken name is marked on its field.
   Tipos de clase has no Duración column and its form no Duración field: the
   length of a class is chosen in Horario. Both apps' Session detail shows
   the Session's own minutes («90 minutos» for an 18:00 – 19:30 class), on
   the Client's 04 and the Assistant's S08 alike.
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

## Test 26: look up Clients and manage Staff Members in the admin web

Start the backend on `pilates_dev_sim` after loading the fixtures and start
the admin web, exactly as Test 24 describes, and log in as
`paola.mendoza@example.com` / `emma-local-2026`.

1. **Clientes.** Back Office → **Clientes** lists every Client of the studio,
   read-only: no **+ Nuevo** button, because accounts are born in the Staff app
   or by registration. The subtitle counts them in the feminine ("6 clientas ·
   5 con plan activo") and the footer says "Mostrando 6 de 6 clientas". Each
   row shows the name, the email and phone, the current Plan (or "Sin plan
   activo"), and **Activo**, **Expirado** (had a Plan before), or **Sin plan**
   (never bought one). The Branch selector says this page is not filtered by
   Branch.
2. **Search.** Type in **Buscar por nombre, correo o teléfono**: after a
   moment the address gains `?q=…` and the table shows the matches. Accents
   and capitals do not matter ("guzman" finds Sofía Guzmán). A search that
   matches no one keeps the table header and says "No se encontró ninguna
   clienta.", "Revisa cómo escribiste el nombre o el teléfono.", and where
   accounts come from, with "Mostrando 0 de 6 clientas" and both page buttons
   disabled.
3. **Detalle de cliente.** Click a Client: the side panel (the whole screen on
   a phone) shows "Cliente desde dd/mm/aaaa", the contact, the Plan with its
   dates and remaining classes ("5 de 8"), the Credit as `Bs 0,00`, how many
   Clients she referred, and her referral code. Without an active Plan the
   block reads "Sin plan activo", plus "Último plan vencido el dd/mm/aaaa." if
   she had one. A Client invited from the Staff app who has not created her
   password yet shows **Pendiente de activación**. Nothing here is editable;
   the only action is «Cerrar cuenta» in the footer (Test 35), which a
   deactivated account does not offer. The list is
   `GET /api/v1/administrator/clients?q=…&page=…&pageSize=…` and the panel
   `GET …/clients/{clientId}` (`404 client_not_found` for a closed or
   unknown one).
4. **Personal.** Back Office → **Personal** lists every Staff Member with the
   Role as a plain label (Entrenador, Asistente, Administrador, Nutricionista),
   the contact, the Branches ("Todas" for an Administrator), and **Activo**,
   **Pendiente**, or **Desactivado**. The **Rol** filter shows one Role at a
   time and stays in the address (`?role=trainer`).
5. **Nuevo miembro.** **+ Nuevo miembro** opens the 408 px panel: Nombre,
   Correo electrónico ("Le enviaremos un enlace de activación a este correo.
   Vence en 7 días."), Teléfono (opcional), the four Roles as a 2×2 choice, and
   the Branches as chips. Choosing **Administrador** replaces the chips with
   "Todas las sucursales (implícito por el rol)". **Guardar** with empty fields
   marks each one; an email of another Staff Member is marked on its field,
   and a Client's email says "Este correo pertenece a una cuenta de clienta. No
   se creó ni se cambió nada; usa otro correo.". Saving closes the panel and
   says "Invitación enviada a …: tiene 7 días para activar su cuenta."; there
   is never a temporary password. The email of a member still pending reopens
   that invitation instead (a new link, Role and Branches unchanged) and the
   page says "… ya tenía una invitación pendiente. La abrimos y enviamos un
   enlace nuevo; su rol y sus sucursales no cambiaron." (within a minute of
   the last email it answers "Ya enviamos un correo a esa dirección hace
   poco…" instead).
6. **Editar miembro.** Click a Staff Member. The name, email, and phone are
   read-only. Change the Role or the Branches and **Guardar**: the page says
   "Guardamos los cambios de …". The chips list the active Branches; a
   member still assigned to a Branch archived since shows only the active
   ones, and saving sends only those (the archived assignment is dropped
   rather than refused). A Trainer who still leads upcoming Sessions
   (Emma Vargas) keeps her Branch and the panel explains to swap her in
   Horario first. A pending member shows **Pendiente de activación** between
   the Nombre and Teléfono rows (there is no separate Correo row), in a pale
   card with a thin beige border: the address with **Cambiar correo** at the
   end of the same line (Nuevo correo, "Los enlaces enviados a … dejarán de
   funcionar; enviaremos uno nuevo de 7 días.", then **Guardar correo** and
   **Cancelar** side by side at the bottom of the card), when the link
   expires, "Si no activa su cuenta en 30 días desde el último envío o
   cambio, la invitación se elimina. Es distinto de los 7 días de cada
   enlace.", and a full-width white **Reenviar enlace** (greyed text and
   border while it waits); a second email within a minute shows,
   after a clock icon at the top of the panel above the Nombre row, "Ya
   enviamos un correo a esa dirección hace poco. El enlace vigente sigue
   sirviendo." and "Podrás reenviarlo en 0:59." from the server's wait, with
   **Reenviar enlace** disabled. Its
   footer offers **Cancelar invitación** ("¿Cancelar la invitación de …?"):
   the links stop working, the email is freed, and the member leaves Personal
   (marked removed, never deleted). An active member's footer offers
   **Desactivar cuenta** instead, which asks first and then signs the person
   out everywhere. Your own account and a deactivated one open read-only.
7. **Horario follows.** After a Staff change, **+ Nueva sesión** in Horario
   offers the updated list of Trainers for the selected Branch.

Every change stays in `pilates_dev_sim`; the fixtures command restores the
fixture Accounts but does not delete Staff Members you created. With the
worker running, the activation email lands in the local capture (Test 34):
paste its `token` into the admin web's link page (Test 24, step 10) to activate
the new person. Cancelled invitations and removed members stay as rows marked
removed.

## Test 27: review transfer Payments in the admin web

Start the backend on `pilates_dev_sim` after loading the fixtures, start the
worker next to it (receipt uploads are verified by the worker), and start the
admin web, as Tests 10 and 24 describe. Raise a transfer with a receipt as
`mariana@example.com` from the Client app (Test 10B) or through Swagger (Test
7, "Buying a Plan through Swagger"). Then log in to the admin web as
`paola.mendoza@example.com` / `emma-local-2026`.

1. **The badge.** The sidebar shows the number of transfers waiting next to
   **Pagos** on every page; with nothing waiting it shows no number.
2. **Pagos.** Back Office → **Pagos** lists the studio's transfer Payments,
   not only one Branch's (the Branch selector says this page is not filtered
   by Branch). There is no **+ Nuevo** button: Clients raise Payments from the
   app. The subtitle reads "Todo el estudio · 1 transferencia esperando
   revisión". The **Estado** filter starts on **Pendiente**, oldest first;
   **Todos**, **Confirmado**, and **Rechazado** stay in the address
   (`?status=all`; the page reads
   `GET /api/v1/administrator/payments?status=…&q=…&page=…&pageSize=…`,
   while the Staff app's list is `…/payments/pending`, Test 7). Each row
   shows the Client, the Plan, the amount she
   transferred as `Bs 560,00` on the right (with "con Bs 60,00 de crédito"
   under it when Credit paid part), the date and time sent in Bolivia time
   (`23/09/2026 · 22:51`), and **Pendiente**, **Confirmado**, or **Rechazado**.
   Cash and Credit-only Payments never appear: they are confirmed when they are
   recorded. **Buscar por cliente** finds a name without accents or capitals
   ("mariana").
3. **Only pending rows open.** A **Confirmado** or **Rechazado** row does
   nothing; the row is the whole record.
4. **Revisar pago.** Click a pending Client: the side panel (the whole screen
   on a phone) shows the Client and Plan, **Monto a verificar**, the Plan price
   and **Crédito aplicado** when Credit was used, the date, **Transferencia**,
   and the receipt image read straight from the API (never cached). **Ver en
   grande** (or a click on the image) opens it above everything; Esc, the ✕,
   or a click outside returns to the panel as it was.
5. **Confirmar pago** asks first ("¿Confirmar el pago de Mariana Peña?"); after
   confirming, the panel closes, the page says "Pago de Mariana Peña
   confirmado: su plan Paquete de 8 clases empieza hoy.", the badge drops, and
   Clientes shows her new Plan.
6. **Rechazar** replaces the buttons with **Motivo del rechazo** ("La clienta
   verá este mensaje para corregir y volver a enviar."), which has focus so
   you can type at once; **Confirmar rechazo**
   stays disabled until you type a reason, refuses more than 300 characters,
   and **Cancelar** goes back. After rejecting, the page says "Pago de Mariana Peña
   rechazado: le avisamos el motivo." and she can send a new receipt.
7. **Someone else first.** Open a pending Payment, decide it from the Staff app
   (Test 10C) or Swagger, then press **Confirmar pago** in the browser: the
   panel says "Otra persona ya decidió este pago." with the new state (and the
   reason of a rejection) and offers no buttons.

Payments, their Subscriptions, and the Credit ledger are append-only money
history, so the Payments you make here stay in `pilates_dev_sim`; the fixtures
command does not remove them.

## Test 28: run the Back Office in the admin web

Start the backend on `pilates_dev_sim` after loading the fixtures and start
the admin web, exactly as Test 24 describes, and log in as
`paola.mendoza@example.com` / `emma-local-2026`. The fixtures add no Back
Office rows; everything below is created from the screens (an earlier walk
may have left some in `pilates_dev_sim`). Dates are Bolivia dates whatever
time zone your computer uses; money is written `Bs 1.050,00`.

1. **Insumos.** Back Office → **Insumos** lists the selected Branch's
   Supplies with **Cantidad en stock** on the right and an amber **Stock
   bajo** pill when the stock is at or below the Supply's alert threshold.
   The subtitle counts them ("Sucursal Centro · 1 con stock bajo") and the
   sidebar shows the same count beside **Insumos** in amber, on every page;
   choosing another Branch in the top bar changes both. The header has
   **+ Nuevo insumo**, **Registrar retiro**, **Registrar reposición**, and the
   **Ver historial de retiros** link, in that order.
2. **Nuevo insumo.** The side panel asks for **Nombre**, **Cantidad en stock**
   (typed only now), and **Umbral de alerta**; **Guardar** with empty fields
   marks each one. A name another active Supply of the Branch already has is
   refused on its field. Saving says "Insumo «…» creado con N unid.".
3. **Editar insumo.** Click a Supply: the stock is read-only ("Cambia solo con
   «Registrar retiro» y «Registrar reposición»."); the name and threshold can
   change. **Archivar insumo** asks first ("¿Archivar este insumo?", with
   **Volver** and **Archivar**) and the
   Supply leaves Insumos and Registrar retiro; its Withdrawals stay in the
   history. There is no delete.
4. **Registrar retiro.** Choose an Insumo (each option shows its stock, "(6
   unid.)") and a quantity. More than the stock marks the field ("Solo hay 6
   unid. en stock.") and disables **Registrar**. After recording, the page
   says "Retiro registrado: quedan N unid. de …" and the table and sidebar
   count update. If someone else takes units while the panel is open (a
   second browser, or Test 22's API call), **Registrar** is refused and the
   panel shows the new stock. A Withdrawal cannot be edited or undone; make up
   for an over-recorded one with a Reposición.
5. **Registrar reposición.** The same panel with **Cantidad repuesta** and no
   maximum; afterwards "Reposición registrada: ahora hay N unid. de …".
6. **Retiros e insumos consumidos.** **Ver historial de retiros** (the only way
   in) opens the Branch's Withdrawals for the current month, newest first,
   with **Insumo**, **Cantidad retirada**, and the date and time; "N retiros
   en septiembre de 2026." above them and the units per Supply under
   **Consumo del mes**. The arrows move between months (not past the current
   one) and **Insumo** filters by one Supply, archived ones included as
   "(archivado)"; both stay in the address (`?month=2026-08&supplyId=…`). A
   month without Withdrawals says "Sin retiros en este rango.". **Insumos**
   stays highlighted in the sidebar and **Volver a Insumos** goes back.
7. **Nómina.** Back Office → **Nómina** lists every Salary Payment of the
   studio (the Branch selector says the page is not filtered by Branch), with
   **Empleado**, **Monto**, and **Fecha**, and an **Empleado** filter.
   **+ Registrar pago** asks for the Staff Member (a deactivated one is
   listed as "(cuenta desactivada)" for a final payment), the amount (`3.500`
   or `3.500,00`), and the date, which cannot be after today. Clicking a row
   corrects it ("Guardamos la corrección del pago de …"); a payment is never
   deleted, and each record and correction writes an audit record.
8. **Gastos.** Back Office → **Gastos** lists the selected Branch's Expenses
   with a **Categoría** filter. **+ Nuevo gasto** says which Branch it is
   recorded in ("Se registra en la sucursal Centro."), and **+ Nueva
   categoría** opens a row to add a category without leaving the form; the
   new one is chosen at once. A correction changes the category, amount, or
   date, never the Branch. A pasted address naming a category (or, in
   Nómina, a Staff Member) the studio does not have falls back to **Todas**
   / **Todos** once the list loads.
9. **Categorías de gasto.** The studio's categories, the same for every
   Branch (the selector says the page is not filtered by Branch). A category
   an Expense uses shows "En uso" and its delete icon is disabled; an unused
   one is deleted after "¿Eliminar «…»?". The row at the bottom adds one; a
   name that already exists (ignoring capitals) is refused.
10. **Narrow browser.** At a phone width every table becomes one card per row
    (a Supply without the amber pill shows no Estado line), the four Insumos
    actions wrap under the title, every panel fills the screen, and the
    drawer keeps the Insumos count.

Supplies, Withdrawals, Restocks, Salary Payments, and Expenses are never
deleted (Withdrawals and Restocks cannot even be edited), so what you create
here stays in `pilates_dev_sim`; only an unused category can be deleted. Date
pickers follow the browser's language, as Test 25 notes.

## Test 29: read the Evaluation, Referral, and Credit lists in the admin web

Start the backend on `pilates_dev_sim` after loading the fixtures and start
the admin web, exactly as Test 24 describes, and log in as
`paola.mendoza@example.com` / `emma-local-2026`. The fixtures hold no
Evaluations: book a few first as Clients (Test 15, or Test 7's API calls as
`lucia@example.com` and `valeria@example.com`, whose Plans cover this
month). The fixtures' Referrals and Credit belong to Sofía (an earlier walk
or Test 10 may have added more). All three pages are read-only: there is no
**Nuevo** button, and clicking a row opens nothing.

1. **Evaluaciones nutricionales.** Back Office → **Evaluaciones
   nutricionales** shows the selected Branch's booked Evaluations for the
   current Bolivia week: **Cliente** with "Primera evaluación" or
   "Seguimiento" under the name (a Client's second Evaluation is a
   Seguimiento), **Nutricionista**, and **Fecha y hora** ("jue 24/09 ·
   15:00", Bolivia time whatever your computer's zone). The subtitle counts
   them ("Sucursal Centro · 2 evaluaciones agendadas"); there is no status
   column. The arrows and **Hoy** move between weeks, and **Nutricionista**
   narrows to one of the Branch's Nutritionists; both stay in the address
   (`?week=2026-09-28&nutritionistStaffMemberId=…`). A week without
   Evaluations says "Sin evaluaciones en este rango.".
2. **Branch scope.** Evaluations happen at a Branch, so choosing another
   Branch in the top bar shows only that Branch's Evaluations. To see one at
   Equipetrol, assign Gabriela to Centro and Equipetrol in **Personal**,
   publish a block there as Gabriela (Test 15), and book it as a Client.
3. **Referidos.** Promociones → **Referidos** lists every Referral with
   **Cliente que refiere** (and "N referidas en total" under her name),
   **Cliente referido**, **Fecha de registro**, and a green **Crédito
   otorgado** or amber **Pendiente** pill. The subtitle counts the whole
   studio ("2 referidos · 2 con crédito otorgado, 0 pendientes") and stays
   put while you search; **Buscar por nombre de cliente** finds either
   Client, ignoring accents ("mariana pena"). A search that finds nothing
   keeps the table's header and says "No se encontró ningún referido.".
4. **Créditos.** Promociones → **Créditos** lists the Clients whose
   available Credit is above zero, the amount right-aligned ("Bs 60,00"),
   and the last movement's date with what it did: "Crédito ganado",
   "Reservado para un pago", "Usado en un pago", or "Devuelto al saldo". The
   subtitle reads "Bs 60,00 en saldo activo · 1 clienta con crédito", and
   **Total en saldo activo** closes the table while nothing is searched.
5. **Studio-wide pages.** On Referidos and Créditos the Branch selector says
   "Esta página no se filtra por sucursal — …" and switching Branch changes
   nothing on the page.
6. **After a Payment decision.** Confirm a transfer in **Pagos** (Test 27)
   whose Client was referred, then open Referidos and Créditos: the Referral
   turns **Crédito otorgado** and the referrer's Credit appears or grows
   without reloading the browser.
7. **Narrow browser.** At a phone width each row becomes a labelled card,
   the week stepper and the search stay above the cards, and the Créditos
   total stays under them.

## Test 30: read the income and expense report in the admin web

Start the backend and the admin web as Test 24 describes and log in as
`paola.mendoza@example.com`. The fixtures' confirmed Payments give some
income; record an Expense in two Branches and a Salary Payment first (Test
28) so every rule shows. Money is written `Bs 1.050,00`, dates are Bolivia
dates whatever your computer's time zone.

1. **Opening.** **Reporte** opens on **Todas las sucursales** and the last six
   months up to today (**Desde** / **Hasta**; the subtitle repeats them). The
   top bar shows "El reporte usa su propio filtro de sucursal" instead of the
   Branch cell.
2. **Three figures.** **Ingresos** (green rule) is every confirmed Payment in
   the range, with the cash and transfer split under it; **Gastos** (red rule)
   is payroll plus every Branch's Expenses; **Neto** is the difference, with a
   minus sign when expenses win ("−Bs 2.690,50").
3. **Mes por mes.** One pair of bars per month of the range, empty months
   included, green for income and red for expenses; pointing at a month (or
   tabbing to it) shows its two figures. **Totales por mes** lists the same
   numbers exactly, with a total.
4. **Gastos por categoría.** In Todas las sucursales the first row is
   **Nómina** ("Viene de Nómina, no de las categorías"), then each Expense
   Category, then **Total de gastos**.
5. **One Branch.** Choose Centro in **Sucursal**: income counts only the cash
   collected at Centro, expenses only Centro's Expenses, the Nómina row is
   gone, and a line says "La nómina y los ingresos por transferencia se ven
   solo en «Todas las sucursales»." Archived Branches are listed as
   "(archivada)" so their history stays readable. The Branch and the range
   stay in the address (`?branch=…&from=2026-09-01&to=2026-09-24`); an
   address naming a Branch the studio does not have falls back to **Todas
   las sucursales**.
6. **Range.** Change **Desde** or **Hasta**; a start after the end says "La
   fecha inicial no puede ser posterior a la final." and keeps the last
   report. A range with no movement says "Sin ingresos ni gastos en este
   rango.".
7. **After a confirmation.** Confirm a pending transfer in **Pagos** (Test
   27) and come back: Todas las sucursales grows by its amount, a single
   Branch does not change.
8. **Narrow browser.** At a phone width the figures stack, the chart keeps
   its pairs, and both tables become cards.

Date pickers follow the browser's language, as Test 25 notes.

## Test 31: run the admin web's critical journeys with Playwright

These are the end-to-end journeys ADR-0043 asks for: the built admin web
(`vite preview`) talking to the real backend on a database the suite creates
for itself, loads the development fixtures into, and drops at the end. They
cover only what the Jest tests cannot: a real cookie, the real proxy, the real
backend rules.

You need PostgreSQL running locally with the `pilates_test_fixtures` admin
database (Test 8 creates it), the `psql` command on your PATH, and the
Chromium build Playwright caches (`pnpm --filter @pilates/admin-web exec
playwright install chromium` downloads it once; this project pins
Playwright 1.61.0, whose Chromium is build 1228). Nothing else may be
listening on ports 3101 or 4173. Then, from the project root:

```sh
pnpm test:admin-e2e
```

The script builds the backend and the admin web, then runs
`playwright test` in `apps/admin-web`. Its global setup prints the three
process ids (the API, the worker, and the preview server), the ports, and
the `pilates_test_*` database name it made, and its teardown stops the three
servers and drops that database. Since WEB-034 the worker runs too, because
the payment journeys send a real transfer receipt the way the Client app
does, and only the worker turns it into variants. The seventeen journeys take
about thirty seconds:

1. **Sessions.** Paola signs in and lands on Horario; the
   `__Host-emma-admin-session` cookie is HttpOnly, Secure, SameSite Lax, and
   host-only, and page scripts cannot read it. She logs out from the user
   menu and the old address asks her to sign in again. A signed-out visit to
   `/catalogo/planes?page=2` returns there after Login. When the session is
   ended behind the browser's back, the next click returns to Login with
   "Tu sesión terminó" and signing in again lands on the page she was on.
2. **Branch scope.** In Horario, next week shows Centro's Mat Pilates; after
   choosing Equipetrol in the top bar the grid shows Pilates Prenatal and no
   Mat Pilates, and the week in the address does not move.
3. **A filtered table.** Personal narrowed to Entrenador puts
   `role=trainer` in the address, shows the three Trainers, and keeps both
   after a reload.
4. **A mutation.** Gastos starts empty on the fresh database; an Expense of
   Bs 450,50 is recorded at Centro with the category "Mantenimiento" typed
   into the form's inline row, the notice and the row appear, and Equipetrol
   still has no Expenses.
5. **Authorization.** Camila, an Assistant, gets the same neutral rejection
   as a wrong password; a state-changing request sent with the session cookie
   from `https://attacker.example` is refused with `403 untrusted_origin`
   while the session stays valid.
6. **Narrow browser.** At 420 px the sidebar is behind **Abrir menú**, the
   Branch selector opens as a bottom sheet, Personal shows one labelled card
   per member, and nothing scrolls sideways.
7. **Promociones.** The empty carousel, two drafts saved without an image,
   the second dragged above the first by its handle (the "Soltar en posición
   1" line, the saved order surviving a reload), and one deleted after the
   confirmation.
8. **Client closure (AW22).** Sofía, whose transfer the journey sends
   first, cannot be closed: the dialog refuses at once with «No se puede
   cerrar todavía…» and «Ir a Pagos», its button disabled. Lucía's dialog
   lists her Plan ending without refund and the erasure line, closing her
   says «Cuenta de Lucía Fernández cerrada.», and she is gone from the four
   remaining Clients after a reload.
9. **Transfer review (AW28/AW29).** Mariana's and Sofía's transfers (sent
   through the API with a receipt the worker finalised) wait in Pagos.
   Mariana's panel shows «Monto a verificar», Bs 560,00, the receipt image
   (read from the API) and its enlargement; confirming asks first and says
   «Pago de Mariana Peña confirmado: su plan Paquete de 8 clases empieza
   hoy.». Sofía's is rejected with a reason («Confirmar rechazo» stays
   disabled until one is typed). Under `?status=all` both rows read
   Confirmado and Rechazado and no longer open.
10. **Staff (AW23/AW24).** Valentina Soria is invited as a Nutritionist at
    Centro («Invitación enviada a valentina@emmapilates.bo: tiene 7 días
    para activar su cuenta.»), her row reads Pendiente and her panel
    «Pendiente de activación» with «Reenviar enlace» and «Cancelar
    invitación». Camila Rojas is deactivated after the confirmation («Camila
    Rojas ya no tiene acceso: cerramos todas sus sesiones.»), reads
    Desactivado, and opens read-only. Her invitation is cancelled from the
    panel («Sí, cancelar invitación» → «Cancelamos la invitación de Valentina
    Soria.») so Personal shows its six fixture members again.
11. **Session create and edit (AW03).** In next week's Horario, a one-off
    Reformer Pilates with Daniela Ortiz next Saturday at 11:00 for 75
    minutes (capacity 12 filled from the Class Type) appears as
    «11:00 – 12:15»; from Editar sesión (no «Solo esta sesión» choice for a
    one-off) the hour moves to 12:00 and the block follows, also after a
    reload.
12. **Report (AW16).** Ingresos, Gastos, and Neto agree with each other
    (Neto is the difference, parsed from the tiles, since earlier journeys
    may have confirmed a transfer or recorded an Expense), the chart and both
    tables are there, Centro shows only its cash (Valeria's Bs 780,00) and
    its Expenses with the Nómina row gone, a start after the end keeps the
    last report, and January 2020 says «Sin ingresos ni gastos en este
    rango.».
13. **Promotion Contacts (AW35).** Valeria closes her own Account through
    the API keeping promotions; AW35 lists her as Cuenta cerrada with her
    phone and today's date, the search narrows and empties, «Exportar CSV»
    downloads `contactos-promociones-aaaa-mm-dd.csv` with the BOM header and
    her row, and «Dejar de enviar a Valeria Quiroga» → «Borrar contacto»
    leaves «Todavía no hay contactos.» with the export disabled.
14. **Security headers (WEB-030, WEB-037).** Every response carries the
    policy of Test 62 and the overlays lock the page behind them; that test
    reads the journey.

Three of these files hold more than one case: `session.spec.ts` is the
three parts of item 1 and `authorization.spec.ts` the two of item 5 (the
neutral rejection and the untrusted origin), which is how fourteen files
make seventeen journeys.

To run one file or watch the browser, use Playwright directly from
`apps/admin-web`, for example
`pnpm exec playwright test e2e/session.spec.ts --headed`. A failed journey
leaves a screenshot and a trace under `apps/admin-web/test-results/`
(`pnpm exec playwright show-trace <file>` opens it). The two servers'
stderr goes to `apps/admin-web/test-results/e2e-backend.stderr.log`,
`e2e-worker.stderr.log`, and `e2e-preview.stderr.log`, so a backend that crashed at startup ("The backend
did not answer…") can be read there; `E2E_DEBUG=1 pnpm test:admin-e2e`
prints it in the terminal instead. If a run is killed
before its teardown, stop the servers it left (`lsof -ti tcp:3101`,
`lsof -ti tcp:4173`) and drop its database (the name is in the run's first
line; `psql -l | grep pilates_test_` lists them). The teardown itself waits
at most five seconds for each server before killing it.

Set `TEST_DATABASE_URL` to another `pilates_test_*` admin database, or
`E2E_API_PORT` and `E2E_WEB_PORT` to other ports, when the defaults collide
with something on your machine.

CI runs the same seventeen journeys in the **web-e2e** job of
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (WEB-017), beside
the web-unit job as soon as quality-web passed (EXT-005), on every pull
request that touches the admin web and on every push to `main`. The job runs
`pnpm test:admin-e2e` exactly as above, on a `postgres:18-alpine` service
container: a `psql` step first creates the `pilates_test_ci` admin database
the api-integration job also uses, and
`TEST_DATABASE_URL` points the global setup at it, so the run creates its
own `pilates_test_*` database beside it as it does locally (the setup's line
and the teardown's «stopped the three servers and dropped database …» line
are both in the step's log). The runner has no browser, so the shared setup
action installs the pinned Chromium (`playwright install chromium`, kept in
GitHub's cache under `~/.cache/ms-playwright` by Playwright version, about
fifteen seconds to download when the cache is cold) and its system packages
(`playwright install-deps chromium`, about fifteen seconds on every run).
The backend starts with its development defaults: no secret is needed. A
failed run uploads `apps/admin-web/test-results/` (the traces, the
screenshots, and both servers' stderr) as the `web-e2e-test-results`
artifact, kept for seven days, from the run's summary page; download it,
unzip it, and open a trace with `pnpm exec playwright show-trace <file>`. A
green run uploads nothing. The job takes about three minutes (the setup
with the browser about 1 m 20 s, both builds about 35 s, the journeys about
45 s on the two-core runner since WEB-034 added seven, with the worker's
boot and two receipt uploads inside them).

## Test 32: image variants and Promotions through Swagger

Start the backend and the worker on `pilates_dev_sim` after loading the
fixtures (Tests 5A and 10B). The worker is what rebuilds every upload into its
serving variants (ADR-0073; the sizes are in
[`UPL-002-image-variants.md`](./implementation/UPL-002-image-variants.md)).

### A. Upload an image and watch the variants appear

Log in through Swagger as any fixture Account. Every upload takes three calls:

| Step | Endpoint                                  | What you should see                                                                              |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | `POST /api/v1/uploads`                    | `{ purpose, mediaType, byteSize, checksum }` (base64 SHA-256 of the bytes) → `201` with `uploadUrl` |
| 2    | `PUT /api/v1/uploads/{id}/object`         | The raw bytes with their `Content-Type` → `204` (curl: `--data-binary @file`)                   |
| 3    | `POST /api/v1/uploads/{id}/finalize`      | With an `idempotency-key` → `202 processing`                                                     |
| 4    | `GET /api/v1/uploads/{id}`                | `processing`, then `ready` a second later (`failed` with the worker stopped never happens: it waits) |

Once it is `ready`, `apps/backend/.data/uploads/private/<purpose>/<id>/` holds
one file per variant (`readable` and `thumbnail` for a receipt, `display` and
`thumbnail` for a profile photo, `promotion_480/960/1440` for a Promotion) and
the `pending/<purpose>/<id>` original is gone. A Promotion image smaller than
1200×675 ends `failed` with `image_dimensions_too_small`; an animated image
with `image_animated_not_allowed`. Failed originals stay under `pending/` until
the three-day cleanup (Test 68, ADR-0089) removes them. The refusals the
three calls answer before anything is stored (a wrong media type, size,
checksum, or order of calls) are listed in Test 70, «Uploads».

### B. The receipt variants in the review screens

Raise a transfer with a receipt as a Client without a Plan (Test 7, "Buying a
Plan through Swagger"; `mariana@example.com` unless an earlier walk already
bought her one, then `isabel@example.com`). As `paola.mendoza@example.com`,
`GET /api/v1/administrator/payments/{paymentId}/receipt` answers the
`readable` JPEG (longest edge 2048 px, metadata stripped) and
`?variant=thumbnail` the 800 px one; `?variant=original` is a `400`. The admin
web's Revisar pago (Test 27) and the Staff app's review (Test 10C) keep their
routes and show the readable variant in the panel and enlarged. A receipt
uploaded before this change has no variants and is served from its original
while that file exists.

### C. Promotions as the Administrator

Still as Paola, upload a horizontal image of at least 1200×675 with
`purpose: promotion` (section A), then:

| Step | Endpoint                                                      | What you should see                                                                       |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | `POST /api/v1/administrator/promotions` (`idempotency-key`)   | `{ headline, description, displayStartsOn, displayEndsOn, imageAssetId }` → `201`, `state: draft`, last `displayOrder`; the same key replays the same row |
| 2    | `GET /api/v1/administrator/promotions`                        | Every live Promotion in carousel order with `state` (`draft`, `scheduled`, `active`, `ended`) and `image.thumbnailUrl` |
| 3    | `GET …/promotions/{id}/image?variant=promotion_480`           | The private 480×270 WebP, `no-store`                                                      |
| 4    | `POST …/promotions/{id}/publish`                              | `state: active` when today is inside the window; without an image `409 promotion_image_required` |
| 5    | `GET /api/v1/promotions` (as `lucia@example.com`)             | Only published Promotions inside their window, each with three public `image.sources` URLs |
| 6    | `GET /api/v1/promotion-images/{asset}/{kind}/{version}`       | No credential needed; `Cache-Control: public, max-age=31536000, immutable`               |
| 7    | `PUT …/promotions/order` `{ "promotionIds": [...] }`          | Every live id exactly once, or `409 promotion_order_incomplete`                            |
| 8    | `PUT …/promotions/{id}`                                       | Edits copy, window, or image; a new or removed image unpublishes (follow-up 39)           |
| 9    | `POST …/promotions/{id}/unpublish`                            | `state: draft`; the public URLs answer `404` from then on                                 |
| 10   | `DELETE …/promotions/{id}`                                    | `204`; the row is archived and its image released                                          |

An Assistant or a Client gets `403 administration_access_denied` from every
`administrator/promotions` route. When the worker next runs its hourly sweep
(or right after it starts), the released variants disappear from
`.data/uploads` and `system.image_variants` gets their `deleted_at`. Archived
Promotions stay in `booking.promotions`; the fixtures command does not remove
them.

## Test 33: manage Promociones in the admin web

Start the backend and the worker on `pilates_dev_sim` after loading the
fixtures (Test 32: the worker rebuilds every uploaded image), start the admin
web, and log in as `paola.mendoza@example.com` / `emma-local-2026`, as Test 24
describes. The fixtures ship no Promotion, so the page starts empty. Have a
horizontal image at hand: JPG, PNG, or WEBP, at least 1200 × 675 pixels and
under 20 MB (any landscape photo; a portrait one works too and shows the
crop).

1. **Empty carousel.** Promociones → **Promociones** reads "Ninguna
   promoción en el carrusel" under the title, then one box: "Todavía no hay
   promociones." and "Crea la primera con «Nueva promoción»; las clientas la
   verán en el inicio de la app cuando la publiques.". The Branch selector
   is not applied: Promotions belong to the studio.
2. **Nueva promoción.** The side panel ("Entrará al final del carrusel")
   starts with the image: drop a file on the dashed target or click **Sube
   una imagen**. The target reads "Subiendo la imagen…" while the three
   upload calls and the worker run (a second or two), then the preview
   appears at 16:9 with the file name and size ("portada.jpg · 1600 × 900")
   and **Cambiar imagen** / **Quitar**. A portrait or very wide file shows
   its discarded edges dimmed and says which ones are lost. A file smaller
   than 1200 × 675, another format, or one over 20 MB is refused under the
   target before anything is uploaded. Fill **Título** (80 characters),
   **Descripción** (280), **Fecha de inicio**, and **Fecha de fin**;
   **Publicar** stays disabled until all of them and the image exist, while
   **Guardar borrador** saves a private draft at any time (an empty submit
   marks each missing field; an end date before the start is refused on its
   field).
3. **States.** A draft card reads **Borrador** and, without an image, shows
   "Sin imagen" in place of the thumbnail. **Publicar** makes it **Activa**
   when today falls inside the window, **Programada** before it, and
   **Finalizada** after it. The page says what happened ("Promoción «…»
   publicada.") and the card shows its position badge and the 480 px
   thumbnail read from the API with your session (never cached).
4. **Reorder.** Drag a card by its six-dot handle: the lifted card tilts,
   the others dim, and a line reads "Soltar en posición N"; dropping saves
   the whole order and the badges renumber. From the keyboard, focus a handle,
   press the space bar, move with the arrows, press the space bar again to
   drop (Escape puts it back). Reload: the order stays, and `GET
   /api/v1/promotions` as `lucia@example.com` (Test 32C) lists the published
   ones in that order.
5. **Editar promoción.** Click a card: the panel names its position, shows
   the current image ("Imagen actual · 1600 × 900"), and, on a published
   Promotion, whether today is inside the range. A published one offers
   **Guardar cambios** and **Dejar de publicar**; a draft offers **Guardar
   borrador** and **Publicar**. **Cambiar imagen** or **Quitar** on a
   published one warns that it stops being published when saved: save, see
   the card drop to **Borrador**, then publish it again.
6. **Eliminar promoción.** The link under the footer asks first ("¿Eliminar
   la promoción «…»?", **Volver** / **Eliminar**); afterwards the card is
   gone and the page says so. The row is archived, never removed, and its
   image is released: the worker deletes the variants at its next hourly
   sweep or when it starts.
7. **Narrow browser.** At 420 px the cards stack with the handle on the
   left, the headline wraps to two lines, and the panel is a full-screen
   sheet with the dates stacked.

Deleted Promotions stay archived in `booking.promotions`; the fixtures
command does not remove them. A refused upload leaves nothing behind; one the
worker refused waits under `pending/` for the three-day cleanup (Test 68).

## What you cannot test yet

The following are not ready for manual product testing:

- opening an emailed link on iOS: Universal Links need the Apple Developer
  team (gate 9), so on the iOS Simulator paste the captured token into
  Swagger (Test 34). On Android the link opens the app with a development
  build whose host you approve by hand, or with a staging build (Test 57);
  the tap from a real email on a store build runs with REL-010, because the
  current Play builds predate LNK-001's intent filters;
- «El registro venció» on a device, which needs seven days to pass after the
  registration (the automated tests show it);
- enforcing a SecureStore Face ID prompt in Expo Go or the iOS Simulator;
- real push delivery on iOS, which needs the APNs key (gate 9): the
  Simulators show pushes only through `xcrun simctl push`, while Android
  receives real pushes on the development, staging, and Play builds
  (Tests 46 and 48);
- iOS store builds and TestFlight (gate 9), and the Play closed test and
  production release (REL-003 to REL-007);
- the Playwright journeys in Firefox or WebKit (only Chromium is installed);
- the admin web's «No tienes permiso…» refusal copies, an email change for
  an Account that is not active (`account_not_active`), and a registration
  that refers to itself (`referral_self_reference`): each needs a state the
  API never lets a tester reach, so the Jest and e2e suites cover them
  (Tests 70 and 72);
- the inbox's fallback for a notification type the push catalog does not
  know («Emma Pilates» / «Tienes una notificación nueva.», silent): nothing
  sends one until a new type ships;
- real push delivery on iOS devices and the `InvalidCredentials` receipt
  Expo answers for them until the APNs key is uploaded (gate 9, Test 46);
- a real Coordinator login (IDN-009): Test 77's counts-only response is
  proven by a cast and by a page rendered from a payload with no centavo
  keys. Store-review rows are not excluded until REL-016 marks them. Extra
  classes (BKM-008) are not counted in «Clases pendientes de dar». The
  renewal percent uses active clients as the denominator, not plans that
  expired this month: the fact table cannot see those.

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

## Test 34: change the login email and read the captured emails

Since IDN-008 an active Account changes its email only after opening a link
sent to the new address (the rule is in
[`IDN-008-email-change-proposal.md`](./implementation/IDN-008-email-change-proposal.md)).
Start the API and the worker on `pilates_dev_sim` (Test 5A); the worker is
what delivers the emails, and in local development it also writes each one as
a JSON file under `apps/backend/.data/email-capture/`
(`<time>-<purpose>-<recipient>.json`, with `subject` and `link`).

### A. In the Client app

Log in as `lucia@example.com`, open **Perfil → Editar**. The **Correo
electrónico** field is editable now (the note «escríbenos al estudio» is
gone). Type `lucia.nueva@example.com` and tap **Guardar cambios**: the screen
stays on Editar perfil, the field goes back to the current address, and a
card reads **Revisa tu correo nuevo** with the new address and the 24-hour
deadline. **Reenviar correo** answers «Te enviamos otro enlace.» whether or
not an email went out (one per address per minute, five per hour, ten per day,
like registration); **Cancelar cambio** removes the card. Saving with the
same address only saves name and phone and returns to Perfil. Meanwhile the
capture directory holds two files: `email_change` to the new address (with
the link) and `email_change_notice` to the current one (no link). The
screen's four calls are `POST /api/v1/accounts/current/email-change`
`{ "email" }` (`202`), `GET …/email-change` (the pending card, `pending: null`
with nothing pending), `POST …/email-change/resends`, and
`DELETE …/email-change`; the last two answer `404 email_change_not_pending`
once the card is gone, and every one of them `403 impersonation_forbidden`
from an impersonating Administrator (Test 67).

### B. Confirm the change

The iOS Simulator cannot open the link (Universal Links wait for gate 9; on
the Android emulator a development build opens it, Test 57). Copy the `token`
from the `email_change` file's `link` and send it to `POST /api/v1/email-changes` as
`{ "token": "…" }` (Swagger, no credential needed): `{ "status": "changed" }`
the first time, `expired` the second. Pull Perfil: the summary shows
`lucia.nueva@example.com`, the signed-in session keeps working (ADR-0030),
Login now needs the new address and refuses the old one, and
`system.audit_records` holds `account.email_change_requested` and
`account.email_changed` (with `previousEmail`). Change it back the same way
before other tests, or reload the fixtures.

### C. What stays neutral

Asking for an address that another Account already uses (`sofia@example.com`)
answers `202` and shows the same pending card, but no email is written and
no link can ever be opened; asking for the current address answers `400`
`email_unchanged`. A password change or recovery cancels the pending change.
The admin web's client detail (AW22) always shows the current address.

### D. Other captured links and the Spanish templates

The same directory holds registration verification (`verification`),
activation (`activation`), and recovery (`password_recovery`) emails, so
Tests 4 and 6 can be completed with real tokens through
`POST /api/v1/client-email-verifications`, `POST /api/v1/account-activations`,
and `POST /api/v1/password-recoveries`. `POST /api/v1/authentication-links/inspection`
tells a captured activation or recovery link apart: `current`, `expired`, or
`removed` (Test 6A); the admin web's link page opens the same tokens
(Test 24, step 10). The directory is ignored by Git and
safe to delete.

Since EML-001 each file is the real message: `subject`, `text` (plain text),
and `html` (a simple card in the design palette with the link as a Palo de
rosa button and as a bare URL). The subjects are «Confirma tu correo para
activar tu cuenta» (24 horas), «Activa tu cuenta en Emma Pilates Studio»
(7 días), «Crea una contraseña nueva» (30 minutos), «Confirma tu correo
nuevo» (24 horas), and, for the current address of an email change, «Alguien
pidió cambiar el correo de tu cuenta» (no link). Links start with
`AUTHENTICATION_LINK_BASE_URL` (`https://links.emmapilates.test` locally;
`https://links.emmapilatesstudio.com` on production and `links-staging.` on
staging, LNK-001, Test 57). Open the `html` value in a browser to see
the card; the copy comes from design follow-ups 33–38 and the IDN-008 rule.
No file ever holds a raw address in its name or in the worker's log: the
worker logs a digest of the recipient (`AUTHENTICATION_EMAIL_DIGEST_KEY`),
and so does `system.email_suppressions` (Test 56).

## Test 35: close a Client Account

BE-007 lets a Client close their own Account (Perfil → «Cerrar mi cuenta»,
screen 24) and an Administrator close a Client's (AW22 → «Cerrar cuenta»).
Closing is permanent, so use a disposable database, not the one you keep:

```sh
createdb -T pilates_dev_sim pilates_test_closure
DATABASE_URL="postgresql://$USER@localhost:5433/pilates_test_closure" \
  pnpm --filter @pilates/backend start
```

1. Log in as `sofia@example.com` (Test 3 shows how) and read
   `GET /api/v1/clients/current/credit`: Bs 60 available.
2. `POST /api/v1/accounts/current/closure` with `{"password": "wrong"}` returns
   `400` `current_password_incorrect`; with `{}` it returns `400`
   `invalid_request`.
3. Repeat with the fixture password and `"keepPromotions": true`. It returns
   `200` with the counts: `forfeitedCreditCentavos: 6000` and the classes left
   on the ended Plan. A `keepPromotions` that is not a boolean returns `400`;
   leaving it out means `false`.
4. The old credential now returns `401`, and logging in again with the same
   email and password returns `401`.
5. Log in as `paola.mendoza@example.com` and
   `POST /api/v1/administrator/clients/{id}/closure` for `lucia@example.com`'s
   Client id (`GET /api/v1/administrator/clients?q=lucia` before closing). A
   second call returns `404` `client_not_found`, and Lucía no longer appears in
   the Clientes list.
6. In `psql`, see the two `account.closed` audit records (actor role empty for
   Sofía's own closure, `administrator` for Lucía's) and Sofía's
   `account_closure` ledger entry of 6000. Both closures erased the personal
   data (BE-021, ADR-0097): `booking.clients` shows «Cliente eliminado» with no
   phone and no `profile_image_asset_id`, and `system.accounts` shows
   `cerrada-<account id>@cuentas-cerradas.invalid` with no `password_hash`.
   `booking.promotion_contacts` holds one row, Sofía's name, email, and phone
   with `consented_at` set, and none for Lucía (an Administrator's closure
   never keeps one). Sofía's audit `metadata` says `"keptPromotionContact":
   true`.
7. A Client with a transfer Payment awaiting review gets `409`
   `closure_payment_pending` and nothing changes; confirm or reject the Payment
   in Pagos first (Test 27).

In the Client app (API on the copy, `EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1`),
log in as `sofia@example.com`, open Perfil, scroll to the Error-tone
«Cerrar mi cuenta» link under «Cerrar sesión», read the consequences (her
plan ends and her Bs 60 of Credit is forfeited) and the note that her name,
email, phone, and photo are erased, see the «Quiero seguir recibiendo
promociones de Emma Pilates» box unticked, tick it (the whole row toggles it),
type the password, and confirm: the app returns to Iniciar sesión with «Cerramos tu cuenta. Gracias
por entrenar con nosotras.». The Maestro flow `.maestro/close-account.yaml`
does the same.

In the admin web, open a Client in Clientes and press «Cerrar cuenta» at the
foot of the panel: the dialog lists what applies to her and ends with «Se
borran su nombre, correo, teléfono y foto. Sus pagos y clases se conservan
sin sus datos, para la contabilidad del estudio.» (WEB-029), and after
confirming the list reloads without her under «Cuenta de … cerrada.». For
`isabel@example.com`, whose transfer awaits review, the dialog refuses at
once and links to Pagos.

Drop the copy afterwards: `dropdb pilates_test_closure`.

## Test 36: Vercel previews (retired)

Pull-request previews of the admin web and the shared development API on
Render and Neon they called were retired on 2026-10-17 (EXT-016,
[ADR-0091](./adr/0091-retire-the-shared-development-environment.md)). Vercel
now deploys only `main` (`git.deploymentEnabled` in
`apps/admin-web/vercel.json`), and only the production host proxies
`/api/v1`; any other Vercel address of a deployment answers `404` there.

What the preview used to prove is covered elsewhere:

- everything the admin web does, locally against `pilates_dev_sim`
  (Tests 23–33) and in the Playwright journeys (Test 31);
- that `middleware.ts` and the Vercel Functions under `api/` import nothing
  local, which Vercel's separate compilation needs, by
  `src/vercel/compiled-alone.spec.ts` in the admin-web Jest suite (CI's
  web-unit job);
- the deployed proxy, the `__Host-` cookies over HTTPS, and the origin
  check, on production after every merge (Test 38).

If the production admin web answers `500 MIDDLEWARE_INVOCATION_FAILED`, read
the deployment's Logs in Vercel: the middleware failed to load or run.


## Test 37: check the Better Stack monitors fire and recover

Better Stack's free plan (ADR-0081, ADR-0066) holds the three monitors
below plus the «Database backup» heartbeat (Test 43) and, since 2026-10-21,
the «Production admin web», «Public pages», and «Link host» monitors (Test
74), all alerting by email to the account's only team member. Its dashboard is at
https://betterstack.com; the error DSN and the heartbeat URL are credentials
and live only in your own `apps/backend/.env` (commented out) and in the
hosts' environments, never in the repository.

**Production API readiness** (Uptime → Monitors) checks
https://p01--api--mmps25fn9k9x.code.run/health/ready every 3 minutes. It was
the paused «Dev API readiness» monitor until 2026-10-13. Northflank and Aiven
never sleep, so the check costs nothing. To test it:

1. In Northflank, open the `api` service and click **Pause**.
   `curl -s -o /dev/null -w "%{http_code}\n" https://p01--api--mmps25fn9k9x.code.run/health/ready`
   answers `503` («no healthy upstream»).
2. Within about 6 minutes (one check plus the 3-minute confirmation period)
   the monitor turns **Down** and «New incident started» arrives.
3. Click **Resume**; once `curl` answers `200` (about 5 minutes on 0.2 vCPU),
   the monitor turns **Up** and «Incident resolved» arrives within about 3
   minutes.

**emma-pilates-api** (Error tracking → Applications) receives the API's
unexpected failures through the Sentry SDK when `ERROR_REPORTING_DSN` is set.
Only failures that are not an `HttpException` are reported, so 4xx answers and
readiness's deliberate `503` never are. An event carries the error type, a
string `code` as the `error_code` tag (Prisma's `P1010`, for example), the
stack's file, function, and line, environment, release, service, and the
request's `x-request-id` as `request_id`; never the message, the request, a
user, local variables, or the host name, because driver messages can echo
query arguments. Search the host's logs for the `request_id` to read the full
message. The **Incidents** integration (Error tracking → Integrations) emails
on **New error occurs** and **Error is automatically re-opened**. To test it
locally:

1. Uncomment `ERROR_REPORTING_DSN` in `apps/backend/.env`, then
   `pnpm --filter @pilates/backend build`.
2. From `apps/backend`, start the API on a database that does not exist:
   `DATABASE_URL=postgresql://postgres@localhost:5433/missing_database BOOT_WITHOUT_JOB_RUNTIME=true PORT=3199 node --env-file=.env dist/src/main.js`.
3. `curl -i -X POST -H "Content-Type: application/json" -d '{"email":"probe@example.com","password":"probe-password-123"}' http://localhost:3199/api/v1/authentication-sessions`
   answers `500` `unexpected_error`; note its `x-request-id`.
4. In Better Stack the error appears (or re-opens) as
   `PrismaClientKnownRequestError`; its event's **Tags** show `error_code` and
   that `request_id`, **Request** and **Breadcrumbs** are empty, and an email
   arrives. **Resolve** it; «Incident resolved» arrives.
5. Stop the API and comment the DSN out again.

The production API on Northflank reads the same `ERROR_REPORTING_DSN` from its
`production` secret group, so its unexpected failures arrive here with
environment `production` and the commit as release.

**Worker heartbeat** (Uptime → Heartbeats) expects a ping every minute with
a one-minute grace. The worker pings `WORKER_HEARTBEAT_URL` after every
30-second heartbeat whose queue counts it could read; a failed read logs
`worker_heartbeat_failed` and skips the ping, and a failed ping logs
`worker_heartbeat_ping_failed` without the URL. Before EXT-002
production had no worker, because `worker-main` refused
`NODE_ENV=production`, and the heartbeat stayed **paused**. To test it:

1. **Resume** the heartbeat and uncomment `WORKER_HEARTBEAT_URL`.
2. From `apps/backend`, run the worker on `pilates_dev_sim`:
   `DATABASE_URL=<your local URL ending in /pilates_dev_sim> node --env-file=.env dist/src/worker-main.js`.
   Within a minute the heartbeat turns **Up**.
3. Stop the worker (`Ctrl+C`); about two minutes later the heartbeat turns
   **Down** and «New incident started» («Missed heartbeat») arrives.
4. Start the worker again; «Incident resolved» arrives within a minute.
5. Stop the worker, **Pause** the heartbeat, and comment the URL out again.


## Test 38: check the production API and the production admin web

Production runs on free plans (EXT-003, gate 4): the API on Northflank
(https://p01--api--mmps25fn9k9x.code.run, US Central), the database on Aiven
(PostgreSQL 18, DigitalOcean US West), and the admin web on Vercel Hobby
(https://emma-pilates-admin.vercel.app), whose `/api/v1` the Vercel proxy
sends to Northflank. [The release runbook](./runbooks/production-release.md)
says how a commit gets there and where each setting lives.

**What production can and cannot do yet.** It answers health, OpenAPI, and
every endpoint's validation and authorization, refuses untrusted admin
origins, stores data in Aiven and images in R2, and runs the worker (EXT-002)
and the daily backup (EXT-009). The first Administrator was activated through
a link printed in the `api` shell, so the admin web can be signed into
(step 4). Since EXT-001 the worker sends the authentication emails through
Resend (Test 56), and since LNK-001 their links open the apps on Android
(Test 57); iOS waits for gate 9. The transfer instructions are the studio's
real QR image (PAY-003).

1. From the repository root, with the commit Northflank shows on the `api`
   service:

   ```sh
   SMOKE_BASE_URL=https://p01--api--mmps25fn9k9x.code.run SMOKE_EXPECTED_RELEASE=<full commit hash> pnpm --filter @pilates/backend smoke
   ```

   It prints `"passed":true` (liveness, readiness with that release, OpenAPI,
   and an anonymous request refused `401` as a problem).
2. Through the admin web's proxy, an admin login from a foreign origin is
   refused before any password check:

   ```sh
   curl -s -X POST -H "Origin: https://attacker.example" -H "Content-Type: application/json" -d '{"email":"probe@example.com","password":"probe-password-123"}' https://emma-pilates-admin.vercel.app/api/v1/admin-web/authentication-sessions
   ```

   answers `403` `untrusted_origin`. (`/api/v1/authentication-sessions`, the
   mobile login, is not origin-checked and answers `401`.)
3. In a private browser window, open https://emma-pilates-admin.vercel.app and
   sign in with a made-up account (`probe@example.com`,
   `probe-password-123`). The form says «El correo o la contraseña no son
   correctos.»; DevTools → Network shows `authentication-sessions` `401`
   `authentication_failed` in RFC 9457 form; Application → Cookies holds only
   `__Host-emma-admin-client`, HttpOnly, Secure, SameSite Lax, Path `/`,
   host-only. Reload `/catalogo/planes`: the login page loads, not a `404`.
4. **Signed in** (WEB-010, verified 2026-10-14). In a private window with
   DevTools → Network (Preserve log), sign in as the production
   Administrator. `admin-web/authentication-sessions` answers `201` and
   `authentication-sessions/current` `200`. Before any screenshot of
   Application → Cookies, right-click the header and untick **Value** (the
   session cookie is a credential). The two cookies are
   `__Host-emma-admin-client` and `__Host-emma-admin-session`, both
   HttpOnly, Secure, SameSite Lax, Path `/`, host-only; `document.cookie` in
   the Console prints `''`. Pages load (empty while production has no
   Branches), a reload keeps the session, and «Cerrar sesión» returns to
   the login page, removes the session cookie, and keeps the client one;
   Back stays on the login page.
5. To re-measure the hops (ADR-0087), send
   `curl https://p01--api--mmps25fn9k9x.code.run/api/v1/hop-probe` and the same
   path through `https://emma-pilates-admin.vercel.app`, then search the path
   in the `api` service's Logs and open each line: `forwardedFor` is `1`
   directly and `2` through Vercel (measured 2026-10-13; a request with two
   forged `X-Forwarded-For` entries showed `3`, so Northflank appends).
   `TRUSTED_PROXY_HOPS=1`, plus one with the proxy proof, lands on the
   visitor.

Test 37 covers the production readiness monitor firing and recovering.

## Test 39: count database connections per process

Each process (the API and the worker) holds one Prisma pool and one pg-boss
pool, and `DATABASE_POOL_MAX` caps the two together (BE-018, ADR-0027). The
API gives pg-boss 1 connection and Prisma the rest, because jobs are sent
through Prisma's transaction; the worker splits the budget in half. Every pool
names itself in `application_name`.

1. With PostgreSQL 18 set up as in Test 2, copy the simulation database and
   build the backend:

   ```sh
   createdb -T pilates_dev_sim pilates_connections && pnpm --filter @pilates/backend build
   ```

2. In two terminals under `apps/backend`, start the API and the worker on the
   copy with the production value:

   ```sh
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_connections" DATABASE_POOL_MAX=4 node dist/src/main.js
   ```

   ```sh
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_connections" DATABASE_POOL_MAX=4 node dist/src/worker-main.js
   ```

3. Load every module at once: log in as `lucia@example.com` and
   `paola.mendoza@example.com` (`POST /api/v1/authentication-sessions`), then
   send 25 parallel requests each to `/health/ready`,
   `/api/v1/notifications/unread-count`, `/api/v1/plans`,
   `/api/v1/uploads/<any UUID>`, and
   `/api/v1/administrator/expense-categories`, while this runs in a third
   terminal:

   ```sh
   psql -d postgres -c "select application_name, count(*) from pg_stat_activity where datname = 'pilates_connections' group by 1 order by 1"
   ```

   You should see at most `pilates-api-pgboss` 1, `pilates-api-prisma` 3,
   `pilates-worker-pgboss` 2, and `pilates-worker-prisma` 2: eight in all.
   Every request answers `200` (the made-up upload `404`), none `5xx`.
   Before BE-018 the API alone reached 16 at `DATABASE_POOL_MAX=2`.
4. Stop both with Ctrl+C: the count drops to 0. Then
   `dropdb pilates_connections`.

**In production**, with the Aiven URL exported from a hidden prompt (never
printed), the same query against the database `emma` (with
`datname = 'emma'`) shows the `api` service's two pools within 4.

## Test 40: release a merge to staging, then promote it to production

Since EXT-017 ([ADR-0092](./adr/0092-release-to-staging-before-promoting-to-production.md))
a push to `main` whose `CI` run passes starts the `Release Staging`
workflow; production changes only when you start `Release Production`
([runbook](./runbooks/production-release.md)). Staging must be resumed
first if it is paused (runbook, «Pause and resume staging»).

0. Staging costs money while it runs (about $0.015 an hour for `api` and
   `worker` together, Pay as you go): resume both services before this test
   and **pause them again when you are done** (Test 74 has the steps and
   the cost check).
1. After a pull request merges, find the merge's staging release:

   ```sh
   gh run list --repo DaleneyRuben/emma-pilates --workflow release-staging.yml --limit 3
   ```

   A run for the merge commit appears a few seconds after its `CI` run
   passes (none while `CI` fails).
2. When it completes, read its stages:

   ```sh
   gh run view <run id> --repo DaleneyRuben/emma-pilates --log | grep -E "migrate (build|run)|api build|worker|readiness reports|outcome|passed|vercel.app"
   ```

   In order: the `migrate` build and run, the `api` build, `readiness
   reports <full hash>`, the `worker` build and rollout,
   `{"outcome":"released"}`, the smoke JSON with `"passed":true`, and the
   staging admin web deployment's URL.
3. Check staging yourself:

   ```sh
   curl -s https://p01--api--jmys6w5p8vlk.code.run/health/ready
   gh api repos/DaleneyRuben/emma-pilates/commits/<full hash>/statuses --jq '.[0] | {context, state}'
   ```

   answer `{"status":"ready","release":"<full hash>"}` and
   `{"context":"release/staging","state":"success"}`. Open
   https://emma-pilates-admin-staging.vercel.app: the sign-in screen loads and
   a wrong password answers with the usual error (the proxy reaches the
   staging API).
4. Promote it:

   ```sh
   gh workflow run release-production.yml --repo DaleneyRuben/emma-pilates
   ```

   The run's first step prints `{"outcome":"promote","sha":"<full hash>"}`,
   then the same release stages against production, the smoke JSON, and the
   production admin web deployment. Production's `/health/ready`
   (https://p01--api--mmps25fn9k9x.code.run/health/ready) then reports the
   same hash.
5. Refusals: `gh workflow run release-production.yml -f sha=<an older main
   commit with no staging status>` ends at the first step with `did not pass
   staging (release/staging is missing)`; a commit behind production ends
   with `is behind production's …`. Nothing is deployed in either case.
6. Two merges in quick succession: only the newest pending staging release
   runs; one whose commit is no longer main's head ends `superseded`, deploys
   nothing, and records no status.
7. The production release ends with the smoke check against production
   (`SMOKE_API_DOCUMENTATION=hidden`, Test 3), so a release that serves
   Swagger on production fails there. Copying production's data into
   staging is a separate, last-resort workflow (Test 74). When a
   release fails, the runbook's «When a release fails», «Release a commit
   by hand», and «Change a setting» sections say what to read in
   Northflank and Vercel, how to release a commit without the workflow,
   and that a secret edit needs a manual restart.

## Test 41: check that the QR is the only transfer instruction

Since PAY-003 the backend no longer reads `TRANSFER_BENEFICIARY_NAME`,
`TRANSFER_BANK_NAME`, or `TRANSFER_ACCOUNT_NUMBER`; only
`TRANSFER_QR_IMAGE_PATH` remains, and production refuses to start without it.
`GET /transfer-instructions` keeps its three bank fields, always empty and
marked deprecated in the contract, so app builds from before PAY-003 keep
working until no supported release reads them. Start the API on
`pilates_dev_sim` with fixtures loaded (Test 5A).

1. Log in as Sofía and read the instructions:

   ```sh
   TOKEN=$(curl -s -X POST http://127.0.0.1:3100/api/v1/authentication-sessions -H 'content-type: application/json' -d '{"email":"sofia@example.com","password":"emma-local-2026"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['credential'])")
   curl -s -i http://127.0.0.1:3100/api/v1/transfer-instructions -H "authorization: Bearer $TOKEN"
   ```

   The answer is `200` with `Cache-Control: no-store` and
   `{"beneficiaryName":"","bankName":"","accountNumber":"","qrImageUrl":"/api/v1/transfer-instructions/qr"}`.
2. `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/api/v1/transfer-instructions/qr -H "authorization: Bearer $TOKEN"`
   prints `200 image/png`; without the header both routes answer `401`.
3. In the Client app (Test 10 B), open **Pago por transferencia**: the QR card
   holds the QR and the "Escanea el código…" line only. The app no longer
   calls `GET /transfer-instructions` (the API's request log shows
   `/purchase-intents/current` and `/transfer-instructions/qr` only).
4. Setting the three retired variables changes nothing: the API starts and
   the answer above stays empty.

## Test 42: store uploads in S3-compatible storage (Cloudflare R2)

Since EXT-002 the API and the worker keep uploaded images in one object store
chosen by `OBJECT_STORAGE` ([ADR-0088](./adr/0088-proxy-upload-bytes-through-the-api.md)):
`local` (the default: `UPLOADS_LOCAL_STORAGE_ROOT` on disk, used locally and in
CI) or `s3` (production, on Cloudflare R2). The apps still send
the bytes to `PUT /api/v1/uploads/{id}/object`; the API writes them to the
store, so no contract changed. Production refuses to start unless
`OBJECT_STORAGE=s3` and the four `OBJECT_STORAGE_*` settings are set, with an
HTTPS endpoint.

### A. Run the S3 adapter locally against MinIO

1. Install and start MinIO on ports the project does not otherwise use:

   ```sh
   brew install minio
   MINIO_ROOT_USER=pilateslocal MINIO_ROOT_PASSWORD=pilateslocalsecret minio server --address 127.0.0.1:9100 --console-address 127.0.0.1:9101 ~/minio-pilates
   ```

   Create the bucket `pilates-local` in the console at http://127.0.0.1:9101.
2. Run the integration suite with the S3 spec enabled (it is skipped without
   the endpoint; CI runs it against S3Mock):

   ```sh
   OBJECT_STORAGE_TEST_ENDPOINT=http://127.0.0.1:9100 \
   OBJECT_STORAGE_TEST_ACCESS_KEY_ID=pilateslocal \
   OBJECT_STORAGE_TEST_SECRET_ACCESS_KEY=pilateslocalsecret \
   TEST_DATABASE_URL="postgresql://$USER@localhost:5433/pilates_test_fixtures" \
   pnpm --filter @pilates/backend test:integration -- test/storage
   ```

   Three cases pass: a 1 MB object comes back byte for byte, `put` refuses an
   existing key while `replace` overwrites it, and `delete` is idempotent.
3. Start the API and the worker on `pilates_dev_sim` with the S3 settings
   (`OBJECT_STORAGE=s3`, `OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:9100`,
   `OBJECT_STORAGE_BUCKET=pilates-local`, and the MinIO user and password as
   the access key and secret). Upload a receipt from the Client app (Test 10 B)
   and a profile photo (Test 19): both reach `READY`, the bucket holds
   `private/transfer_receipt/<id>/readable` and `thumbnail` (or
   `private/profile_photo/<id>/display` and `thumbnail`), the `pending/` copy is
   gone, and nothing new appears under `apps/backend/.data/uploads`.

### B. Production

1. Upload a receipt through the production API (any signed-in Account may
   upload; Test 7 lists the four calls). `GET /api/v1/uploads/{id}` answers
   `ready` within a few seconds; it stays `processing` if the worker service
   is down.
2. In Cloudflare, R2 → `emma-pilates-prod-images` → Objects shows the two
   variants under `private/transfer_receipt/<id>/`.
3. Northflank → `worker` → Logs shows the finalize job for the upload (and
   `authentication_email_disabled` once at start only while the worker has
   no `RESEND_API_KEY`, Test 56).

### C. The first Administrator without email

On an environment whose worker cannot send email yet, the first
Administrator's Activation Link is read from the queue in the `api`
service's shell, right after the bootstrap command
([runbook](./runbooks/first-administrator-bootstrap.md)); this is how
production's first Administrator was activated before EXT-001:

```sh
node dist/src/administrator-activation-link-main.js
```

It prints `activation_link_found` with a link to the admin web's
`/crear-contrasena` page, or `activation_link_not_found` (exit 1) when no
current link is queued. Locally, on a disposable database after
`admin:bootstrap`, `POST /api/v1/authentication-links/inspection` with the
printed token answers `{"status":"current","purpose":"activation"}`.

## Test 43: back up the database and restore the dump

Since EXT-009 Northflank's scheduled `backup` job runs
`node dist/src/database-backup-main.js` every day at 03:00 in La Paz: it
counts the five tables the restore drill compares, writes a custom-format
`pg_dump` (version 18, over TLS verified against Aiven's CA), uploads it once
as `daily/<database>-<UTC time>.dump`, copies it over
`monthly/<database>-<La Paz month>.dump`, and pings Better Stack («Database
backup»), or `…/fail` when a step failed or the dump is under half the size of
the one before. R2's lifecycle rules delete `daily/` after 30 days and
`monthly/` after 365; the job never deletes
([runbook](./runbooks/backups-and-restore-drills.md)).

### A. Run the job locally against MinIO

1. Start MinIO as in Test 42 A and create a bucket for the dumps (the
   console at http://127.0.0.1:9101, or
   `aws --endpoint-url http://127.0.0.1:9100 s3 mb s3://pilates-backups` with
   the MinIO user and password as `AWS_ACCESS_KEY_ID` and
   `AWS_SECRET_ACCESS_KEY`).
2. Run the job on `pilates_dev_sim` with PostgreSQL 18's `pg_dump`:

   ```sh
   cd apps/backend
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_dev_sim" \
   BACKUP_STORAGE_ENDPOINT=http://127.0.0.1:9100 \
   BACKUP_STORAGE_BUCKET=pilates-backups \
   BACKUP_STORAGE_ACCESS_KEY_ID=pilateslocal \
   BACKUP_STORAGE_SECRET_ACCESS_KEY=pilateslocalsecret \
   BACKUP_PG_DUMP_PATH=/opt/homebrew/opt/postgresql@18/bin/pg_dump \
   pnpm backup:run
   ```

   It prints one `database_backup_succeeded` line with the key, the monthly
   key, `sizeBytes` (about 300 KB for the fixtures), `sha256`, and
   `rowCounts`, and exits 0. The bucket holds the daily key and the monthly
   copy. A second run reports the first one's size as `previousSizeBytes`.
   With PostgreSQL 14's `pg_dump` the run prints `database_backup_failed`
   with `stage` `dump` and the server version mismatch, and exits 1.
3. Check the bucket against the retention rules:

   ```sh
   BACKUP_STORAGE_ENDPOINT=http://127.0.0.1:9100 \
   BACKUP_STORAGE_BUCKET=pilates-backups \
   BACKUP_STORAGE_ACCESS_KEY_ID=pilateslocal \
   BACKUP_STORAGE_SECRET_ACCESS_KEY=pilateslocalsecret \
   BACKUP_DATABASE=pilates_dev_sim pnpm backup:check
   ```

   It prints `"passed": true` with the counts and the latest dump, and lists
   `problems` otherwise (`no_daily_dump`, `latest_daily_stale`,
   `latest_daily_shrank`, `daily_missing`, `monthly_missing`,
   `daily_kept_too_long`, `monthly_kept_too_long`), exiting 1.

### B. Restore the dump into a throwaway database

Follow the drill in the
[runbook](./runbooks/backups-and-restore-drills.md#restore-drill) with the
MinIO bucket in place of R2. On 2026-10-14 the `pilates_dev_sim` dump restored
in 1.1 s with `pg_restore --no-owner --no-acl --exit-on-error`; its SHA-256
matched the object's `sha256` metadata, `prisma migrate status` said «Database
schema is up to date!», the five row counts equalled the job's `rowCounts`,
the API on port 3199 against the copy passed `pnpm smoke`, and the
fixture-free checks gave 2 audit guards, 4 ledger triggers, no negative
balance, and no Client without exactly one live Account.

### C. The automated checks

- `pnpm --filter @pilates/backend test` covers the key names, the retention
  check, the run's order and failures, the `pg_dump` arguments and settings,
  the bucket adapter, and the release's backup build stage.
- The integration suite's `test/storage/s3-backup-store` spec runs against
  MinIO (and S3Mock in CI) when `OBJECT_STORAGE_TEST_ENDPOINT` is set;
  `test/backup` counts the drill tables on a disposable database and, when
  `BACKUP_TEST_PG_DUMP_PATH=/opt/homebrew/opt/postgresql@18/bin/pg_dump` is
  set, writes a real dump (CI's runner has no `pg_dump` 18, so it skips that
  case).

### D. The job's image

`apps/backend/Dockerfile` installs `postgresql-client-18` from PostgreSQL's
repository only when built with `--build-arg POSTGRESQL_CLIENT_MAJOR=18`
(Northflank's `backup` job sets it); the API, worker, and `migrate` images
build without it and have no `pg_dump`. Checked on 2026-10-14: the backup
image is 274 MB compressed against 256 MB, `pg_dump --version` reports 18.6,
and against a TLS PostgreSQL 18 signed by a throwaway CA, with production's
`DATABASE_URL` shape, the job succeeded with the right CA mounted at
`/etc/secrets/emma-ca.pem` and both the row count (node-pg) and `pg_dump`
refused a wrong CA (`certificate verify failed`). In production the image
refuses to start without an HTTPS storage endpoint and `BACKUP_HEARTBEAT_URL`.

### E. Production

1. Northflank → job `backup` → **Run**. The run ends Success in under 30 s,
   and its log has one `database_backup_succeeded` line with the key, the
   size, the SHA-256, and the row counts (the first run, 2026-10-14: 286,411
   bytes).
2. Cloudflare → R2 → `emma-pilates-prod-backups` shows the dump under
   `daily/` and the month's copy under `monthly/`, both the logged size.
3. Better Stack «Database backup» shows the heartbeat a minute later.
4. The weekly check and the restore drill run from the Mac with the
   read-only token, as the
   [runbook](./runbooks/backups-and-restore-drills.md) shows.

## Test 44: check worker and admin-web error reporting and the progress-gated heartbeat

Since EXT-011 the worker reports to Better Stack like the API: every failed
scheduled sweep and every finalize-upload job that fails unexpectedly or is
dead-lettered, as service `worker` with a `job` tag (the sweep's name, such
as `evaluation_reminders`, or the queue `uploads.finalize.v1`) and the error
code; never the message or job data. The admin web reports uncaught errors,
unhandled rejections, and render errors (including the startup error page)
as service `admin-web`, only when `VITE_ERROR_REPORTING_DSN` is set at build
time (Vercel Production only); since WEB-032 a page that crashes inside the
shell (Test 64) and every read or write TanStack Query gave up on (a 5xx or
an unreachable backend, once per failure, after its retry) are reported too;
4xx API answers are never reported, and no message, page URL, user, or
breadcrumbs leave the browser. Stacks are
minified: no source maps are uploaded. Since EXT-012 the browser sends its
events to its own origin, `/api/monitoring/envelope`, and a Vercel Function
(the dev server locally) forwards them to the DSN's ingest, so Brave Shields
and ad blockers no longer drop them. The function forwards only envelopes
addressed to the configured DSN (403 otherwise), only POST (405), only up to
64 KB (413), and nothing at all without a DSN (404); it sends the body alone,
without cookies, browser headers, or the client's address.

The worker's 30-second heartbeat pings Better Stack «Worker heartbeat» only
while the worker makes progress (ADR-0066): the oldest ready
`uploads.finalize.v1` job (and the authentication email job, once email is
enabled) is under 5 minutes old, and every sweep succeeded within twice its
interval plus 2 minutes (4 minutes for the every-minute sweeps, 12 for
purchase-intent expiry, 2 hours 2 minutes for the hourly ones). Otherwise it
logs `worker_progress_stalled` with the reasons once per change, skips the
ping, and logs `worker_progress_resumed` when they clear.

### A. Locally, against a receiver on the Mac

1. Save this receiver as `receiver.mjs` outside the repository and start it;
   it prints each error event and each ping:

   ```js
   import { createServer } from 'node:http';
   import { createServer as createTls } from 'node:https';
   import { readFileSync } from 'node:fs';
   const handler = (req, res) => {
     const chunks = [];
     req.on('data', (chunk) => chunks.push(chunk));
     req.on('end', () => {
       const body = Buffer.concat(chunks).toString();
       if (req.url.startsWith('/ping')) console.log('ping', new Date().toISOString());
       else for (const line of body.split('\n').slice(1)) if (line.includes('"exception"')) console.log(line);
       res.writeHead(200, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' });
       res.end('{}');
     });
   };
   createServer(handler).listen(8799);
   createTls({ key: readFileSync('key.pem'), cert: readFileSync('cert.pem') }, handler).listen(8800);
   ```

   The heartbeat URL must be HTTPS, so make a throwaway certificate next to
   it first:
   `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 2 -subj "/CN=localhost" -addext "subjectAltName=IP:127.0.0.1"`.
2. Copy the simulation database, build, and start the worker on the copy:

   ```sh
   createdb -T pilates_dev_sim pilates_test_monitoring
   cd apps/backend && pnpm build
   NODE_EXTRA_CA_CERTS=<dir>/cert.pem \
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_test_monitoring" \
   ERROR_REPORTING_DSN=http://publickey@127.0.0.1:8799/1 \
   WORKER_HEARTBEAT_URL=https://127.0.0.1:8800/ping \
   RELEASE_ID=monitoring-local \
   node --env-file=.env dist/src/worker-main.js
   ```

   The receiver prints a ping every 30 seconds.
3. **A failing sweep.** Break the every-minute reminder sweep:
   `psql -d pilates_test_monitoring -c "alter table booking.evaluations rename column hour_reminder_recorded_at to hour_reminder_recorded_at_broken"`.
   Within a minute the worker logs `evaluation_reminders_failed` and the
   receiver prints an event with type `PrismaClientKnownRequestError`, tags
   `service` `worker`, `error_code` `P2022`, `job` `evaluation_reminders`,
   and no message. About 4 minutes after the sweep's last success the worker
   logs `worker_progress_stalled` with `sweep_stale:evaluation_reminders`
   and the pings stop. Rename the column back; within a minute it logs
   `worker_progress_resumed` and the pings return.
4. **A stuck queue.** Pause the worker (`kill -STOP <node pid>`), add an
   upload job that has waited 10 minutes, and hold a lock on it so the
   worker skips it:

   ```sh
   psql -d pilates_test_monitoring -Atc "insert into pgboss.job (name, data, state, start_after) values ('uploads.finalize.v1', '{\"version\":1,\"imageAssetId\":\"0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d\"}', 'created', now() - interval '10 minutes') returning id"
   psql -d pilates_test_monitoring -c "begin; select id from pgboss.job where id = '<id>' for update; select pg_sleep(120); commit;" &
   kill -CONT <node pid>
   ```

   At the next heartbeat the worker logs `worker_progress_stalled` with
   `queue_stuck:uploads.finalize.v1` and skips the ping. When the lock ends,
   the worker completes the job, logs `worker_progress_resumed`, and pings
   again.
5. **The admin web.** Start the API on the same copy (`PORT=3100`) and the
   admin web with a local DSN:
   `VITE_ERROR_REPORTING_DSN=http://publickey@127.0.0.1:8799/2 pnpm dev:admin`.
   At 1440 and 420 px the login page and, after logging in as
   `paola.mendoza@example.com`, the schedule look exactly as before. A wrong
   password shows «El correo o la contraseña no son correctos.» and nothing
   reaches the receiver. In the browser console, run
   `setTimeout(() => { throw new TypeError('x') }); Promise.reject(new RangeError('y'))`:
   two events arrive (`TypeError` from `onerror`, `RangeError` from
   `onunhandledrejection`), tagged `service` `admin-web`, without the
   message or the page URL. The receiver logs each request with
   `user-agent` `node` and `content-type` `application/x-sentry-envelope`
   and no `origin` or `referer`: the dev server's tunnel sent it, not the
   browser, whose network panel shows only
   `POST http://localhost:5173/api/monitoring/envelope`. Stop the API and
   reload `/`: the startup error page appears and one `ApiError` event
   arrives through React's root error handler.
6. **The tunnel refuses other destinations.** With the dev server still up:
   `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/monitoring/envelope`
   prints `405`, and
   `curl -s -o /dev/null -w "%{http_code}\n" -X POST --data-binary $'{"dsn":"http://publickey@evil.example/2"}\n{}' http://localhost:5173/api/monitoring/envelope`
   prints `403`; the receiver prints nothing for either.
7. Stop everything and `dropdb pilates_test_monitoring`.

Verified on 2026-10-14 (EXT-011): every step above as described, with 7
events in all and none holding an email, a message, a URL, or request data.
Step 5 through the tunnel and step 6 verified on 2026-10-14 (EXT-012) at
1440 and 420 px: 4 events, all sent by the dev server, none holding an
email, a message, or a URL.

### B. In production

1. The worker inherits `ERROR_REPORTING_DSN` from Northflank's `production`
   group, so its events go to `emma-pilates-api` in Better Stack with the
   `service` tag `worker`.
2. The admin web reports only when Vercel Production has
   `VITE_ERROR_REPORTING_DSN`; a change to it needs a redeploy, because Vite
   inlines it at build time and the tunnel function reads it at deploy time.
   With Brave Shields **up** on https://emma-pilates-admin.vercel.app, run
   `setTimeout(() => { throw new TypeError('tunnel check') })` in the
   console: the Network tab shows `POST /api/monitoring/envelope` answered
   `200` (nothing to `betterstackdata.com`), and the error appears in
   `emma-pilates-admin` within a minute, environment `production`, Users 0,
   no message. `curl -s -o /dev/null -w "%{http_code}\n" -X POST --data-binary $'{"dsn":"https://k@evil.example/1"}\n{}' https://emma-pilates-admin.vercel.app/api/monitoring/envelope`
   prints `403`. Verified on 2026-10-14 (EXT-012, release `a5832790`): with
   Shields up («0 trackers, ads, and more blocked») the `envelope` fetch
   answered `200` and the `TypeError` reappeared in `emma-pilates-admin`,
   `production`, Users 0; `GET` answered `405` and garbage `400`.
3. «Worker heartbeat» goes Down when the worker stops making progress, not
   only when it stops; the worker's logs in Northflank show
   `worker_progress_stalled` with the reasons.

## Test 45: install and run the EAS development builds

Expo Go cannot receive remote push notifications, so push work (NOT-002) runs
on **development builds**: each app's own native binary with the Expo
development client, built by EAS from the `development` profile (REL-001,
gate 6). They load JavaScript from your Metro server like Expo Go does, so a
JavaScript change needs no new build; a native change (a new native module,
permission, or plugin) does, and each build spends one of the free plan's
monthly builds (15 iOS and 15 Android).

**Get the builds.** List them with
`cd apps/client-mobile && eas build:list --profile development --limit 4`
(the same in `apps/staff-mobile`); `eas whoami` must print `daleneyfernando`
first (the Mac also has a work Expo login). Each finished build has an
artifact URL: a `.tar.gz` holding `EmmaPilates.app` (or
`EmmaPilatesStaff.app`) for the iOS Simulator, and an `.apk` for Android.
Building again is
`eas build --platform all --profile development --non-interactive --no-wait`
from the app folder, only after a native change.

**Install.** iOS:
`curl -sL <tar.gz url> | tar -xz -C <folder>` and
`xcrun simctl install <udid> <folder>/EmmaPilates.app` on the iPhone 16 Pro
(`49C1E5FE-…`) and the iPad Pro 11 (`57B2FBC4-…`). Android: boot the
emulator (`~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1`),
then `adb install -r client.apk` and `adb reverse tcp:3100 tcp:3100` (and
`tcp:8082`, `tcp:8083`) so the emulator reaches the API and Metro at
`127.0.0.1`.

**Run.** Start the API on `pilates_dev_sim` and each Metro with
`EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1 ./node_modules/.bin/expo start --dev-client --port 8083`
(client) or `--port 8082` (staff). Open the app: its launcher lists both
Metro servers; tap the app's own server, or open
`emmapilates-client://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083`
(`xcrun simctl openurl <udid> …` or
`adb shell am start -a android.intent.action.VIEW -d … com.emmapilates.client`;
`emmapilates-staff://` and port 8082 for the Staff app). iOS asks «Open in
"Emma Pilates"?» first; the first launch shows the developer-menu intro
(«Continue»), and the floating «Tools» gear opens the menu afterwards.

**Maestro on a development build.** Maestro needs a Java runtime; the Mac has
none on its `PATH`, so use Android Studio's:
`export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.
Then pass the installed app instead of Expo Go:

```sh
cd apps/client-mobile
maestro --udid <udid> test -e APP_ID=com.emmapilates.client \
  -e "APP_LINK=emmapilates-client://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083" \
  -e PASSWORD=emma-local-2026 .maestro/book-and-cancel-class.yaml
```

For Android, `--device emulator-5554` instead of `--udid`. The login subflows
answer iOS's «Open» prompt and the developer-menu intro, so the flows of
Test 19 run unchanged. Since NOT-002 the apps also offer notifications
(«¿Te avisamos?») after a booking or an Evaluation and on a Staff role's first
home; the journeys answer «Ahora no» through each app's
`subflows/dismiss-push-permission.yaml`, and Test 46 tests the sheet itself.
A development build installed since NOT-002 has `expo-notifications` and the
Firebase configuration; an older one cannot receive push, so reinstall from
the latest `development` build.

## Test 46: push notifications on the development builds

Push (NOT-002) runs only on the development builds of Test 45: Expo Go cannot
receive remote push. Android receives real pushes through Firebase on the
emulator. iOS registers on the Simulators, but real delivery needs the APNs
key (gate 9), so the Simulators are checked with `xcrun simctl push`.

**Before you begin.**

- Load the fixtures on `pilates_dev_sim` (Test 19, «Before a run»). Start the
  API (port 3100) and the **worker**, both with `apps/backend/.env`:
  `DATABASE_URL="postgresql://$USER@localhost:5433/pilates_dev_sim" node --env-file=.env dist/src/worker-main.js`
  after `pnpm --filter @pilates/backend build`. The worker sends the pushes,
  and `.env` holds `EXPO_ACCESS_TOKEN`: enhanced push security is on for
  `emma-pilates`, so Expo refuses a push without the token
  ([infrastructure](./architecture/infrastructure.md), «Settings and
  secrets»). Ask the user to add the line if it is missing; never paste the
  value into a chat.
- Install the latest development builds (Test 45) on the Android emulator,
  the iPhone 16 Pro, and the iPad Pro 11, and start both Metro servers.
- On Android, `adb reverse` ports 3100, 8082, and 8083 as in Test 45.

**A. The permission sheet (all three devices).**

1. Client: sign in as `lucia@example.com`, open Reservar, book a class.
   After «Reserva confirmada» the sheet «¿Te avisamos?» rises with the Client
   text. It does **not** show at sign-in. It also follows a Waitlist join
   and «Evaluación confirmada».
2. Tap «Activar notificaciones»: only now does the system prompt appear
   («Allow Emma Pilates to send you notifications?» on Android, «"Emma
   Pilates" Would Like to Send You Notifications» on iOS). Allow it. The API
   log shows `PUT /api/v1/notifications/devices/current` 204 once or twice,
   then no more. A steady stream of them is a token-listener loop. The
   database has an active row:
   `select platform, deactivated_at from system.account_devices;`.
3. Staff: sign in as `paola.mendoza@example.com`. The sheet shows on
   «Pagos pendientes» with the Staff text.
4. «Ahora no» hides the sheet for 30 days. A reinstall resets it (iOS) or
   clears the app's data (Android).
5. Deny on one device (iOS «Don't Allow»): the API logs
   `POST …/devices/current/deactivate` 204, and Perfil → Notificaciones shows
   «Las notificaciones están desactivadas en este dispositivo…» with «Abrir
   Ajustes», which opens the system Settings.

**B. A real push on Android, with sound.** Send the app to the background
(Home), then, as Paola, cancel a Session Lucía has booked:
`POST /api/v1/administrator/sessions/{id}/cancel` with an `idempotency-key`
(sign in with `POST /api/v1/authentication-sessions`, header
`x-client-identifier`). Within seconds the shade shows «Clase cancelada»
with the full inbox text and the bell icon on channel `actionable`
(`adb shell dumpsys notification --noredact | grep emmapilates`).
`pgboss.job` has a completed `notifications.push-dispatch.v1` job, and
`system.notification_deliveries` has a `submitted` row with a ticket.

**C. A silent push.** A silent type (`payment_confirmed`,
`subscription_expiring`, `evaluation_booked`, `evaluation_cancelled`)
arrives on channel `updates`, with no bell, in the shade's quiet section.
For example, confirm one of Lucía's transfer Payments as Paola (Test 10).
Private types show generic lock-screen copy, never names, amounts, or
reasons («Comprobante rechazado» / «Revisa tu pago en la app.»).

**D. Taps.** Tap the notification. The API logs
`POST /api/v1/notifications/{id}/read` 204, and the app opens the inbox's
destination: Mis reservas for a Session, Mi plan for a Subscription,
«Revisar pago» for an Administrator's payment. Two Android traps:

- A **force-stopped** app (`am force-stop`, or «Force stop» in Settings)
  gets no FCM pushes until it is opened again. That is Android's rule. Use
  Home, or `adb shell am kill` while it is in the background, for «closed».
- **Cold starts** need a `preview` or store build. Check two cases. First,
  the task still in Recents: Home, then `adb shell am kill com.emmapilates.client`
  until `adb shell pidof com.emmapilates.client` prints nothing (one `am kill`
  sometimes leaves the process alive). Android then reopens the old task
  (`START … result code=2` in `adb logcat`) and delivers the tap through
  `onNewIntent`, which Expo drops before the app has loaded; the
  `@pilates/mobile-core/launch-tap-plugin` config plugin forwards it, and the
  tap marks read and routes. Second, the task removed
  (`adb shell am stack remove <task id>`, the id from
  `adb shell dumpsys activity recents`): a new task (`result code=0`) routes
  too. Checked 2026-10-15 on a release build of the Client app. The
  development build's launcher relaunches the app without the notification,
  so cold taps there do not route.

**E. Receipts.** Fifteen minutes after a send, the worker's 5-minute sweep
reads Expo's receipts: `delivered`, or `failed` with
`device_not_registered` and the device deactivated. That last case is what
happens to the row left by an uninstalled app. A delivery still without a
receipt after 24 hours becomes `discarded`.

**F. iOS with `simctl push`.** Background the app and send an Expo-shaped
payload. The identifiers go under `body`. Use a real unread entry of the
signed-in Account so the read call succeeds:

```sh
cat > push.apns <<'JSON'
{
  "Simulator Target Bundle": "com.emmapilates.client",
  "aps": { "alert": { "title": "Clase cancelada", "body": "Tu clase de Reformer Pilates fue cancelada." },
           "sound": "default", "badge": 2 },
  "body": { "notificationId": "<unread notification id>", "type": "session_cancelled",
            "destinationType": "session", "destinationId": "<session id>" }
}
JSON
xcrun simctl push <udid> com.emmapilates.client push.apns
```

Tap the banner while it shows (Notification Center taps do not open the app
on the Simulator). The entry is marked read and Mis reservas opens. This
works from a cold start too (`xcrun simctl terminate` first). Leave out
`sound` for a silent push.

**G. Badge and sign-out.** The app-icon badge equals the inbox's unread
count (Perfil's count): check it on the iOS Home Screen. Stock Android
launchers show a dot, not a number, so the badge call there is best-effort.
Sign out: the badge clears, and the device row becomes
`deactivation_reason = 'logout'`.

## Test 47: check mobile error reporting

Since EXT-013 both apps report to Better Stack through `@sentry/react-native`
when the bundle was built with `EXPO_PUBLIC_ERROR_REPORTING_DSN`: uncaught
errors, unhandled promise rejections, and render errors a screen's
«Algo salió mal» boundary caught, tagged `service` `client-mobile` or
`staff-mobile`. The environment is `development` for any bundle Metro
serves, otherwise the build's update channel (`preview`, `production`). No
message, breadcrumbs, user, device context, screenshot, session, or tracing
leaves the device, and 4xx API answers are never reported. Without the DSN
nothing starts. A development build made before EXT-013 has no Sentry native
module: JavaScript errors still arrive (without a release), and native
crashes need a build that has it.

### A. Locally, against a receiver on the Mac

1. Save Test 44's receiver (the HTTP half is enough) and start it on port
   8799. For the emulator, `adb reverse tcp:8799 tcp:8799`.
2. Add a temporary probe at the end of the app's `index.ts` (never commit
   it):

   ```ts
   setTimeout(() => {
     throw new TypeError("probe lucia@example.com");
   }, 15000);
   setTimeout(() => {
     void Promise.reject(new RangeError("rejection lucia@example.com"));
   }, 16000);
   ```

3. Start Metro with a local DSN, for example
   `EXPO_PUBLIC_ERROR_REPORTING_DSN=http://publickey@127.0.0.1:8799/3 ./node_modules/.bin/expo start --dev-client --port 8091`,
   and open the development build on it (Test 45). Fifteen seconds after
   the bundle loads the red «Uncaught Error» screen shows the probe, and the
   receiver prints two events: `TypeError` (mechanism `onerror`, level
   `fatal`) and `RangeError` (`onunhandledrejection`), environment
   `development`, the app's `service` tag, frames named
   `app:///main.jsbundle` (iOS) or `app:///index.android.bundle` (Android),
   and no message, email, user, breadcrumbs, or contexts. No «Sentry»
   alert appears, and «Dismiss» shows the login screen as usual.
4. Remove the probe.

Verified on 2026-10-15 (EXT-013) on the EAS development builds from Metro:
both apps on the iPhone 16 Pro, the iPad Pro 11, and the Android emulator,
12 events in all, none holding the email, the message, or a URL.
Step C 1–2 verified the same day against `emma-pilates-mobile`: 12
exceptions in 4 groups (each error type once per bundle name), all
`development`, Users 0, no message.

### B. Source maps (release builds only)

Release builds name their source map by a debug id that Metro injects (the
apps' `metro.config.js`). Check it without a build:
`expo export --platform ios --source-maps --output-dir <dir>` in an app
folder; the `.hbc.map` has a `debugId` and the `.hbc` holds the same id as
`sentry-dbid-<id>`. An EAS `preview` or `production` build uploads the map
when its EAS environment has `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_PROJECT`,
and `SENTRY_AUTH_TOKEN` (see the mobile release runbook); without them the
build log shows a failed upload and the build still succeeds. Development
builds never upload.

### C. In Better Stack

1. Start Metro with the real DSN instead of the local one
   (`EXPO_PUBLIC_ERROR_REPORTING_DSN=<emma-pilates-mobile DSN>`), add the
   probe, and open each app.
2. In Better Stack (Brave), Errors → `emma-pilates-mobile`: a `TypeError`
   and a `RangeError` appear within a minute for each app, environment
   `development`, tag `service` `client-mobile` or `staff-mobile`, Users 0,
   and no message.
3. After the next native build (Test 45), repeat with the build itself: the
   event also carries the release (`com.emmapilates.client@1.0.0+<build>`),
   and an EAS release build with the upload variables shows readable frames.

## Test 48: install from Play Internal testing and use production

Needs a phone or tablet whose Play Store is signed in with an account on the
«Equipo interno» list (mobile release runbook).

### A. Install
1. Open each app's «Join on the web» link (Play Console → the app → Test and
   release → Testing → Internal testing → Testers) in the device's browser,
   accept, and install. Expected: the listing shows
   `com.emmapilates.client (unreviewed)` or `com.emmapilates.staff
   (unreviewed)`, and the app opens without a red screen.

### B. Staff app on production
1. Log in with the production Administrator. Expected: the Administrator
   destinations, with every Branch.

### C. Client app on production
1. Register with an address you control. Expected: the «check your email»
   screen. Since EXT-001 the verification email arrives (Test 56); before
   it, none did, and step 2 stood in for it.
2. In the Northflank `api` shell run
   `node dist/src/client-email-verification-main.js <that address>`.
   Expected: `"status":"verified"`; a second run answers `not_found`.
3. Log in with that address and password. Expected: Home.

Verified locally on 2026-10-15 against `pilates_dev_sim` (API from
`dist/`, no worker): a registration answered 202, the command answered
`not_found` for another address, `verified` for the address in capitals,
`not_found` on a rerun, and `POST /api/v1/authentication-sessions` then
returned a credential.

Verified on production on 2026-10-15 by the user on an Android phone with
the Play Internal testing builds (versionCode 2): A, B, and C, then a full
booking run (Plan bought, receipt uploaded and approved in the Staff app,
class booked) with push notifications, including a tap with the app closed.

## Test 49: forms stay above the keyboard on Android

Android draws edge to edge since Expo 57, so the window no longer shrinks for
the keyboard; every form now lifts itself above it (MOB-058). Run it on the
development builds of Test 45 on the Android emulator, and on the iPhone 16
Pro and iPad Pro 11 to check that iOS still behaves as before. Type with the
on-screen keyboard: `adb shell input text` switches Gboard to its floating
hardware-keyboard toolbar, which covers nothing and proves nothing
(`adb shell pm clear com.google.android.inputmethod.latin` puts it back).

1. Client login: tap «Contraseña». Expected: the form slides up so the field
   and «Iniciar sesión» are both above the keyboard.
2. «Regístrate»: tap «Confirmar contraseña». Expected: the field stays above
   the keyboard, and a swipe up brings «Crear cuenta» into view with the
   keyboard still open.
3. Signed in as `lucia@example.com`: Perfil → Editar → tap «Nombre».
   Expected: «Guardar cambios», pinned under the form, rises above the
   keyboard. Perfil → «Cambiar contraseña» and «Cerrar mi cuenta» behave the
   same way with their own buttons.
4. Staff, signed in as `camila.rojas@example.com`: «+ Nuevo cliente» → tap
   «Teléfono (opcional)». Expected: the field and «Crear cuenta» stay above
   the keypad. As the Administrator, «Revisar pago» → «Rechazar» lifts its
   reason field the same way.

Verified on 2026-10-15 on the Android emulator (Medium Phone, API 36) with
the development builds: before the fix the keyboard's top edge (y 1500 of
2400) hid «Iniciar sesión» (y 1376–1512); after it the button sat at
y 1085–1221. Steps 1–4 passed in both apps on the emulator, the iPhone 16
Pro, and the iPad Pro 11 (Staff login included; iOS was never affected and
still behaves), except the Administrator's rejection reason (not run: it
needs a pending transfer). On iOS the keyboard appears a few seconds after
the tap; wait for it before judging the screen.

## Test 50: submit buttons show they are working

From the tap until the request answers, the button that sent it keeps its
colour and size, shows a spinner in place of its label, ignores further
taps, and screen readers hear it as busy (MOB-060, design follow-up 93).
Primary buttons spin white on Palo de rosa; the Error-outline destructive
buttons («Cerrar mi cuenta», «Quitar horario») spin in Error; the solid
Error buttons of `S12` and `S14` spin white; the outlined ones («Unirme a la
lista de espera», «Reenviar correo», «Reenviar enlace») spin in their label
colour. A disabled button that is not busy still turns grey.

On the local API the answer is too quick to see, so slow it down: a small
Node proxy on port 3101 that holds every non-GET request for 8 seconds and
forwards it to 3100 (any `http.createServer` that waits, then pipes to
`127.0.0.1:3100`), and start each Metro with
`EXPO_PUBLIC_API_URL=http://127.0.0.1:3101/api/v1` (add
`adb reverse tcp:3101 tcp:3101` on Android). Run it on the development
builds of Test 45 on the Android emulator, the iPhone 16 Pro, and the iPad
Pro 11, in both apps.

1. Client login as `lucia@example.com`: tap «Iniciar sesión». Expected: the
   same rose button with a white spinner and no text until Home opens.
2. Perfil → Editar → «Guardar cambios»: the same.
3. Perfil → «Cerrar mi cuenta», type a **wrong** password (a right one
   closes the Account), tap «Cerrar mi cuenta». Expected: the white button
   with its Error outline and an Error spinner, then the wrong-password
   message.
4. Staff login as `camila.rojas@example.com`: as step 1.

Maestro's `clearKeychain` (the login subflows) clears the Simulator's whole
keychain, so the other app on the same Simulator is signed out too; its
screens then fail to load until it signs in again.

Verified on 2026-10-15: steps 1 and 4 on the emulator, the iPhone 16 Pro,
and the iPad Pro 11; step 2 on the emulator; step 3 on the emulator and the
iPhone 16 Pro. Screen readers heard «Iniciar sesión, busy» and «Cerrar mi
cuenta, busy» on Android.

### The admin web (WEB-023)

The admin web follows the same rule. A 16 px ring turns once every 0.8
seconds in place of the label: white on Palo de rosa, Error on the Error
outline. The button keeps its colour, width, and height, its label stays
readable to screen readers (`aria-busy`), and a second click or Enter sends
nothing. Only the button that sent the request spins. In a panel with two
actions, such as «Ocultar en la app» beside «Guardar» on a Plan, the other
one only turns grey. The confirming button of every «¿…?» dialog spins too.

To see it, put the same kind of proxy on port 3111 in front of the API on
3110 (non-GET requests held 4 seconds) and start the admin web with
`ADMIN_API_PROXY_TARGET=http://127.0.0.1:3111 pnpm dev:admin`. At 1440 and
420 px:

1. «Tu cuenta» → «Cerrar sesión» → «Cerrar sesión»: the outlined Error
   button spins in Error until the Login page opens.
2. Log in as `paola.mendoza@example.com`: «Iniciar sesión» spins white
   until Horario opens.
3. Planes → a Plan → «Ocultar en la app»: the link spins and «Guardar» is
   grey; click «Mostrar en la app» afterwards to put it back.
4. «Nueva sesión» at an hour another Session already takes: «Guardar» spins,
   ignores a second click, then shows "Se cruza con otra sesión…".

Verified on 2026-10-16 in the built-in browser: step 1 and step 3 at 1440
px; step 2 at 1440 px; step 4 at 420 px.

## Test 51: the studio QR is drawn whole, opens full screen, and saves to the photos

`10`'s studio QR (MOB-062, design follow-up 95) keeps its own proportions
inside a 190 pt box, so a bank QR that is not square is never cropped;
tapping it or «Ampliar» opens «QR del estudio», a light full-screen view
closed by «Cerrar» (and by Android's back gesture). The app reads the QR's
size from the image's own PNG or JPEG header, because Android does not
measure an inline image.

The local QR is square, so serve a taller one: start the API with
`TRANSFER_QR_IMAGE_PATH=<a PNG about 420 × 600, for example a bank export
with a header band>` (any path; the variable overrides
`.data/transfer-qr.png`). Run it in the Client app on the Android emulator,
the iPhone 16 Pro, and the iPad Pro 11.

1. Sign in as `sofia@example.com` (expired Plan), tap «Comprar un plan» →
   «Paquete de 8 clases» → «Continuar al pago». Expected: the whole QR,
   header band and bottom edge included, about 133 × 190 pt, with «Ampliar»
   under it.
2. Tap the QR. Expected: «QR del estudio» on Superficie with a close «✕»,
   the QR whole on a white card (as wide as the phone allows, at most a
   480 pt column on the iPad), and «Guárdalo para elegirlo desde la galería
   en tu app bancaria.» under it.
3. Tap «Cerrar» (on Android also try the back gesture). Expected: back on
   «Pago». «Ampliar» opens the same view.

In a development build the Expo developer gear floats over the top-right
corner, where «Cerrar» is; drag the gear aside first.

Verified on 2026-10-15 with a 420 × 600 test QR: steps 1–3 on the emulator
(the QR drawn 350 × 499 px, the back gesture and «Cerrar» both close); steps
1–2 on the iPhone 16 Pro; steps 1–3 on the iPad Pro 11 (the card capped at
480 pt).

### Saving the QR (MOB-063)

«Guardar QR» (under the QR and as the view's button) adds the QR to the
photo library with `expo-media-library`, a native module, so it needs a
build of the Client app at version 1.0.1 or later; the 1.0.0 development
builds and Expo Go do not have it. To test without spending an EAS build,
build the Client app locally against the local API:

```sh
cd apps/client-mobile
export EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1
npx expo start --dev-client --port 8081
```

and, in a second Terminal with the same `EXPO_PUBLIC_API_URL`:

```sh
cd apps/client-mobile
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
adb reverse tcp:3100 tcp:3100 && adb reverse tcp:8081 tcp:8081
npx expo run:android --no-bundler --device Medium_Phone_API_36.1
```

For iOS, CocoaPods needs a UTF-8 locale and Sentry's upload step needs to be
switched off locally:

```sh
cd apps/client-mobile
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_ALLOW_FAILURE=true
npx expo run:ios --no-bundler --device <iPhone 16 Pro UDID>
xcrun simctl install <iPad UDID> ~/Library/Developer/Xcode/DerivedData/EmmaPilates-*/Build/Products/Debug-iphonesimulator/EmmaPilates.app
```

The local builds land in the ignored `apps/client-mobile/android` and `ios`
folders and are signed for debugging only; they replace the EAS development
build on that device. Run `./gradlew --stop` in `android` afterwards.

On iOS, reset the app's photo access first so the prompt appears
(`xcrun simctl privacy <UDID> reset photos com.emmapilates.client` and the
same with `photos-add`); an earlier `simctl privacy grant all` hides it.

4. On «Pago», tap «Guardar QR» under the QR. Expected on iOS: «“Emma
   Pilates” Would Like to Add to Your Photos» with «Permite que Emma Pilates
   guarde el QR del estudio en tus fotos.» (add access only, never «access
   your photos»); on Android 13 or later no prompt at all. Allow it. Expected:
   the green «QR guardado en tus fotos.» strip under the two actions, gone
   after about eight seconds, and the QR whole in the device's photos (on the
   emulator, `adb shell content query --uri
   content://media/external/images/media` lists `DCIM/emma-pilates-qr.png`
   at the image's own size).
5. Tap «Ampliar», then the «Guardar QR» button. Expected: a spinner in the
   button while it saves, then the same strip under «QR del estudio».
6. Refusal (iOS): reset the photo access, tap «Guardar QR», and choose
   «Don't Allow». Expected: the Error line «No pudimos guardar el QR.
   Permite que Emma Pilates agregue fotos en Ajustes.» under the actions
   (under the button in the full-screen view) and no new photo. Android 13
   and later never refuse: adding a photo needs no permission there.

Verified on 2026-10-15 with the 420 × 600 test QR, local debug builds of
version 1.0.1: steps 4–5 on the emulator (two `DCIM/` PNGs at 420 × 600, no
prompt, the strip faded); steps 4 and 6 on the iPhone 16 Pro (the photo
landed at 420 × 600; the refusal line under the actions and under the
view's button); step 5 on the iPad Pro 11, allowing the prompt (spinner, then
the strip, the photo at 420 × 600; only the add-photos access granted).

### No camera or microphone (MOB-064)

The Client app only picks photos from the gallery, so its build asks for
neither the camera nor the microphone: the `expo-image-picker` plugin in
`app.json` sets `cameraPermission` and `microphonePermission` to `false`,
which removes the picker library's own `CAMERA` and `RECORD_AUDIO` from the
Android manifest and leaves the iOS camera and microphone usage strings
out. After `npx expo prebuild --clean --no-install` in `apps/client-mobile`:

```sh
grep -E "CAMERA|RECORD_AUDIO" android/app/src/main/AndroidManifest.xml
grep -E "NSCamera|NSMicrophone" ios/EmmaPilates/Info.plist
cd android && ./gradlew :app:processReleaseMainManifest
grep -cE "permission\.(CAMERA|RECORD_AUDIO)" app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
```

Expected: the first lists both only with `tools:node="remove"`, the second
prints nothing, and the merged release manifest counts `0`. On a local build,
`adb shell dumpsys package com.emmapilates.client` lists neither under
«requested permissions», and the receipt picker (Test 10) and «Guardar QR»
above still work.

Verified on 2026-10-19 with a local debug build of version 1.0.1 on the
Android emulator (API 36), as Sofía: «Guardar QR» showed the strip and saved
`DCIM/emma-pilates-qr.png` with no prompt; «Sube tu comprobante de
transferencia» opened the system photo picker with no prompt, and the picked
photo uploaded to «Comprobante listo. Toca para cambiarlo.».

### No photo library read access (MOB-065)

The receipt and profile photo picks open the system photo picker
(PHPicker on iOS, the photo picker on Android), which runs outside the app
and needs no permission, so the app no longer asks iOS for read access to
the library: `pickImage()` makes no permission request, and both the
`expo-image-picker` and `expo-media-library` plugins set `photosPermission`
to `false`, which leaves `NSPhotoLibraryUsageDescription` out of the build.
«Guardar QR» keeps its add-only `NSPhotoLibraryAddUsageDescription`. After
`npx expo prebuild --clean --no-install` in `apps/client-mobile`:

```sh
grep -E "NSPhotoLibrary|NSCamera|NSMicrophone" -A1 ios/EmmaPilates/Info.plist
```

Expected: only `NSPhotoLibraryAddUsageDescription` with «Permite que Emma
Pilates guarde el QR del estudio en tus fotos.». On a local build (the
recipe above), reset the app's photo access on iOS (`photos` and
`photos-add`), then as Sofía:

1. «Pago» → «Sube tu comprobante de transferencia». Expected: the system
   picker at once, with iOS's own «Private Access to Photos» note and no
   «Allow access to your photos» alert; the pick uploads to «Comprobante
   listo. Toca para cambiarlo.».
2. Perfil → «Editar» → «Cambiar foto». Expected: the same picker with no
   alert; the photo appears in the circle.
3. «Guardar QR». Expected: only the add-photos alert of step 4 above, then
   the strip.

Verified on 2026-10-19 with local debug builds of version 1.0.1 against a
disposable database, as Sofía: steps 1–3 on the iPhone 16 Pro and the iPad
Pro 11 after resetting `photos` and `photos-add` (the simulators' TCC
databases then held only `kTCCServicePhotosAdd`, no read access); step 1 on
the Android emulator (API 36), which still opened the system photo picker
with no prompt and uploaded the receipt.

## Test 52: show the password on mobile

Every password field in both apps carries an eye inside its right end
(MOB-059, design follow-up 92): login, registration, the password link
(activation and recovery), change password, and the Client's close
account. It starts hidden; a tap shows the typed text with the eye crossed
out («Ocultar contraseña»), a second tap hides it again («Mostrar
contraseña»), and the value and cursor stay. Each field toggles on its own.
The admin web side is WEB-022 (Test 24, step 6).

Run it on the development builds of Test 45 on the Android emulator, the
iPhone 16 Pro, and the iPad Pro 11, in both apps.

1. Client login: type `lucia@example.com` and the fixture password, tap the
   eye. Expected: the password in plain text and the crossed-out eye; tap
   again for the dots, then «Iniciar sesión» signs in with it.
2. «Regístrate»: type different passwords in «Contraseña» and «Confirmar
   contraseña» and open only the second eye. Expected: only that field
   shows its text.
3. Perfil → «Cambiar contraseña»: fill two fields and open the middle eye.
   Expected: only «Contraseña nueva» shows its text.
4. Perfil → «Cerrar mi cuenta»: type a **wrong** password and open the eye.
   Expected: the text with the cursor at its end. Do not submit a right one.
5. A password link: send `POST /api/v1/password-recovery-requests` for a
   fixture, take the `token` from the newest `password_recovery` file in
   `apps/backend/.data/email-capture/` (the worker must be running), and
   open the form (see below). Both fields carry the eye.
6. Staff login as `camila.rojas@example.com`, then «Tu cuenta» → «Cambiar
   contraseña», and the Staff password link: as steps 1, 3, and 5.

Open the password link in a development build as Test 57 describes (the
https link host, approved by hand for the debug key).

The developer gear sits on the Staff «Tu cuenta» avatar on Android, and a
swipe from it opens the developer menu; drag it away with
`adb shell input swipe 970 172 200 1800 800`. The iOS Simulator does not draw
the dots of a hidden field in Maestro screenshots, so a hidden field may
look empty there.

Verified on 2026-10-16: steps 1–6 on the Android emulator (Medium Phone,
API 36), the iPhone 16 Pro, and the iPad Pro 11.

## Test 53: a receipt or profile photo uploads small

The Client app re-encodes every picked image, whatever its format, once as a
JPEG of at most 2048 px on its longest side at quality 0.8 before it declares
the upload (UPL-003): 2048 px is the studio's readable receipt (ADR-0073), so
nothing larger is worth sending over a phone network. The picker hands over
the original (`quality: 1`) so the photo is encoded only once. The worker
polls the `uploads.finalize.v1` queue every 0.5 s instead of pg-boss's
default 2 s. Receipts and the profile photo share the code; the Staff app
uploads nothing.

Run it on the development builds of Test 45 (Android emulator, iPhone 16 Pro,
iPad Pro 11) with the API **and the worker** on `pilates_dev_sim`. Seed a
large photo and a large screenshot first: `xcrun simctl addmedia <udid>
photo.jpg shot.png` on iOS; `adb push photo.jpg /sdcard/Pictures/` and a
`MEDIA_SCANNER_SCAN_FILE` broadcast on Android.

1. As Sofía, upload a receipt as in Test 10 B, picking the large photo
   (for example a 4288 × 2848 JPEG of about 3 MB). Expected: «Comprobante
   adjunto» within a couple of seconds, and the newest row of
   `system.image_assets` is `image/jpeg`, a few hundred kilobytes, with
   `verified_width` × `verified_height` at most 2048 on the longer side
   (`select declared_media_type, declared_byte_size, verified_width,
   verified_height from system.image_assets order by created_at desc limit 1`).
2. Repeat with the large PNG screenshot. Expected: `image/jpeg`, the height
   2048 for a tall screenshot, and the `readable` variant under
   `apps/backend/.data/uploads/private/transfer_receipt/<id>/` still sharp
   to read.
3. As Lucía, Perfil → «Editar» → «Cambiar foto» with the large photo.
   Expected: the photo in the circle and «Quitar foto», the row again a
   JPEG of at most 2048 px.
4. Timings: `processing_started_at - created_at` is the PUT (declare to
   finalize) and `finalized_at - processing_started_at` the queue pickup plus
   the worker; locally the second is under a second for a 2048 px JPEG.

On production the same query answers the real numbers for a phone; read it
in the database console as the timing check after a release.

Verified on 2026-10-16: steps 1, 3, and 4 on the Android emulator (Medium
Phone, API 36), steps 1, 3, and 4 on the iPhone 16 Pro, and steps 1, 2, and
4 on the iPad Pro 11.

## Test 54: a screen's first load shows the breathing logo

While a screen loads its data for the first time, both apps show only the
studio's logo, centred in the content area under the screen's header, with
the tab bar kept (MOB-061, design follow-up 94): nothing for 400 ms, a 300 ms
fade, then a slow breath every 2.8 s; 240 pt wide on phones and 300 pt from
768 pt wide (the iPad, where the Staff split shows it in the detail panel).
Screen readers hear the screen's own label («Cargando notificaciones»,
«Cargando cliente», …) as progress. The plain «Cargando…» text is gone; the
Promotions placeholder card and the receipt's «Cargando el comprobante…» stay.
The launch screen before any screen, on a cold start, is Test 65.

Run it on the development builds of Test 45 (Android emulator, iPhone 16 Pro,
iPad Pro 11). A local API answers in well under 400 ms, so slow it down with a
throwaway proxy (never committed) in front of it: a Node `http` server on
3101 that waits 6 s and forwards each request to 3100, and start each Metro
with `EXPO_PUBLIC_API_URL=http://127.0.0.1:3101/api/v1` (on Android also
`adb reverse tcp:3101 tcp:3101`). A screen whose data an earlier screen
already fetched (Perfil and Mi crédito after Inicio) shows its content at once.

1. Client, as Lucía: Perfil → Notificaciones. Expected: the logo centred
   under «Notificaciones» with the tab bar below, its opacity changing
   between two screenshots a second apart, then «No tienes notificaciones.»
   in its place.
2. Client: Perfil → Mis evaluaciones (first visit). Expected: the same.
3. Staff, as Camila (Assistant): search «Lucia», open her. Expected: the
   logo under the back arrow; on the iPad, in the detail panel beside the
   search. Then «Ver historial completo»: the logo under «Historial de
   clases» and the «Viendo historial de» banner.
4. Reduce Motion on (Settings → Accessibility → Motion): the logo appears
   still at full strength after the same delay. The component's specs cover
   this case; check it by eye when you touch the component.

Verified on 2026-10-16: steps 1 and 3 on the Android emulator (Medium Phone,
API 36), steps 1, 2, and 3 on the iPhone 16 Pro, and steps 1 and 3 on the iPad
Pro 11; step 4 by the specs only.

## Test 55: install a staging build beside the store app

The `staging` EAS profile builds each app with its own ID
(`com.emmapilates.client.staging`, `com.emmapilates.staff.staging`), the name
«Staging Emma Pilates» or «Staging Emma Pilates Staff», an icon with a red
«STAGING» band, and the staging API (EXT-017). It uses one of the 15 free
Android builds a month, so build only when testing a release.

1. Check the variant without building (from the app's folder):

   ```sh
   APP_VARIANT=staging npx expo config --type public | grep -E "name:|package:|bundleIdentifier"
   ```

   shows the `.staging` IDs and the «Staging» name; without `APP_VARIANT`
   the store values.
2. Build and install on the Android emulator (or an Android phone):

   ```sh
   npx eas-cli build --platform android --profile staging
   ```

   then install the `.apk` from the build page. Expected: it installs next to
   the store or development app instead of replacing it, with the marked
   icon and name.
3. Resume staging if paused, open the staging app, and sign in with a
   staging Account: requests go to the staging API (its Northflank logs show
   them), never production.

## Test 56: real authentication email on production

Production sends through Resend once the worker has `RESEND_API_KEY`
(ADR-0094). Use an address outside the studio's domain that you can open,
ideally one at Gmail and one at Outlook or iCloud, and never the
fixture or owner addresses.

1. In the Client app on production (Test 48), register with that address.
   Expected: the «check your email» screen, and within a minute an email
   «from» `Emma Pilates Studio <no-responder@emmapilatesstudio.com>` in the
   **inbox**, not spam or Promotions.
2. Open the message's details (Gmail: ⋮ → «Show original»). Expected: SPF,
   DKIM, and DMARC all `PASS`, the DKIM domain `emmapilatesstudio.com`, and
   the link points straight at the link host, with no tracking redirect.
3. Reply to it. Expected: the reply goes to `soporte@emmapilatesstudio.com`
   and arrives in the owner's Gmail through Email Routing.
4. Open the link and finish verification, then log in. Expected: Home.
5. In Resend → Emails, the message shows `Delivered`. Northflank's `worker`
   logs show the job completed and never print the link or its token.

Verified on staging on 2026-10-19 (release `1fd89301`): step 1 (Gmail
Inbox, 1 s), step 2 (SPF, DKIM, DMARC PASS, no tracking redirect), and the
bounce check below with `bounced@resend.dev`. Production runs on Android and
iOS together during the Apple release (REL-010): until store builds with
LNK-001's intent filters reach Play, step 4's tap opens the browser page
«Abre este enlace en la app» instead of the app.

Without `RESEND_API_KEY` the worker logs `authentication_email_disabled` at
start and the jobs stay queued, as before EXT-001.

### Bounces and complaints

1. In Resend → Webhooks → the environment's webhook → **Send test event**
   (or register with `bounced@resend.dev`, Resend's address that always hard
   bounces). Expected: the delivery attempt shows `204`; for the
   `bounced@resend.dev` registration, a row in `system.email_suppressions`
   with `reason = 'hard_bounce'` and `provider = 'resend'`, and no raw
   address in it.
2. Ask for the verification email again for that address (Swagger or the
   app's «Reenviar»). Expected: the worker completes the job with
   `suppressed` and Resend shows no new message.
3. A `curl` without Resend's signature to the same endpoint answers `401`;
   with no `RESEND_WEBHOOK_SECRET` it answers `404`.

## Test 57: an email link opens the right app (LNK-001)

Every authentication email link is
`https://links.emmapilatesstudio.com/<client|staff>/authentication/<purpose>?token=…`
(staging: `links-staging.`; locally the capture shows
`links.emmapilates.test`). The prefix is the Account's: a Client's links
open the Client app and a Staff Member's the Staff app (ADR-0095).

### Locally, on the Android emulator

1. Build a development build with the intent filters:
   `ANDROID_HOME=~/Library/Android/sdk JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" env -u CI ./node_modules/.bin/expo run:android --no-bundler`
   from `apps/client-mobile` (or `apps/staff-mobile`).
2. A debug key can't pass Android's domain check, so approve the host by
   hand: `adb shell pm set-app-links-user-selection --user cur --package com.emmapilates.client true links.emmapilatesstudio.com`.
3. With the API, the worker, and Metro running on `pilates_dev_sim`, send
   `POST /api/v1/password-recovery-requests` for `lucia@example.com` and take
   the `token` from the newest `password_recovery` file in
   `apps/backend/.data/email-capture/`.
4. `adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'https://links.emmapilatesstudio.com/client/authentication/recover-password?token=<token>'`.
   Expected: the Client app opens on «Crea una contraseña nueva»; saving a
   new password signs Lucía in to Home.
5. The same command with `/staff/` instead of `/client/`. Expected: Chrome
   opens, not the Client app.

### In a browser

Open `http://localhost:3100/client/authentication/verify-email?token=x`.
Expected: «Abre este enlace en la app» with «Descargar en Google Play»
(the Client package), `Cache-Control: no-store` and
`Referrer-Policy: no-referrer`; the token is not on the page. For
`/staff/authentication/recover-password?token=x` the page also offers
«Continuar en el navegador» to the admin web's `/crear-contrasena?token=x`.
`/staff/authentication/verify-email` answers `404`.

### On staging or production

1. `curl -s https://links-staging.emmapilatesstudio.com/.well-known/assetlinks.json`
   lists each package with its signing certificates.
2. Install the staging build (Test 55), then
   `adb shell pm verify-app-links --re-verify com.emmapilates.client.staging`
   and `adb shell pm get-app-links com.emmapilates.client.staging`.
   Expected: `links-staging.emmapilatesstudio.com: verified`.
3. Register with a real address, tap «Confirmar mi correo» in the email on
   the phone. Expected: the staging app opens on the verification screen,
   not a browser.

Verified on 2026-10-19: step 1, and step 2 for both staging apps (EAS
staging builds from `4b825e85`) on the Android emulator. Step 3 and the
production tap run with REL-010.

## Test 58: the public privacy, support, and account-deletion pages (WEB-021)

The stores link to three static Spanish pages in `apps/public-site/`,
published by Cloudflare Pages on every merge to `main` that touches that
folder (ADR-0096):

- `https://app.emmapilatesstudio.com/privacidad`
- `https://app.emmapilatesstudio.com/soporte`
- `https://app.emmapilatesstudio.com/eliminar-cuenta`

### Locally

1. `python3 -m http.server 4380 --directory apps/public-site`, then open
   `http://localhost:4380/privacidad/`, `/soporte/`, and `/eliminar-cuenta/`.
2. Check at 1440 px and at 420 px. Expected: no horizontal scroll, the menu
   at the top marks the current page, and the `soporte@` button opens a new
   email (with the subject «Eliminar mi cuenta» on the deletion page).
3. The local server does not apply `_headers`; check those on production.
4. Promotions (WEB-033): on `/privacidad/`, «Con quién compartimos tus datos»
   lists WhatsApp (Meta) and says the administration may export the
   promotions contacts to a spreadsheet; `/soporte/` answers «Quiero dejar de
   recibir promociones» (the Perfil switch, or an email to `soporte@`).

### On production

1. `curl -sI https://app.emmapilatesstudio.com/privacidad/`. Expected: `200`
   with `content-security-policy: default-src 'none'; style-src 'self'; …`,
   `referrer-policy: no-referrer`, and `x-content-type-options: nosniff`.
   `/privacidad` without the slash answers `308` to the slashed path, and an
   unknown path `404` with «No encontramos esta página».
2. Open each page in a browser. Expected: no console errors, and the support
   address shows as `soporte@emmapilatesstudio.com`, not «[email protected]».
   Any `cloudflareinsights` or `email-decode` script means a Cloudflare zone
   feature was switched back on (Speed → Real user monitoring, or the
   `email_off` markers were removed); see infrastructure.md.
3. When the policy changes, update the «Última actualización» date on
   `/privacidad` in the same pull request, and check REL-004's Data safety
   answers still match.

## Test 59: the Promotion Contacts on AW35 (BE-022)

A Client who closes her own Account with «Quiero seguir recibiendo
promociones de Emma Pilates» ticked leaves a Promotion Contact (Test 35,
ADR-0097). An Administrator sees, exports, and erases them on AW35.

1. Use a copy of the fixtures database, because erasing is permanent:
   `createdb pilates_test_contacts`, then `db:migrate:deploy` and
   `db:fixtures` on it, and run the API and the admin web against it (Test 23;
   `ADMIN_API_PROXY_TARGET` points the dev server at another API port).
2. Make contacts: close a fixture Client from the Client app with the box
   ticked (Test 35), or insert rows into `booking.promotion_contacts` with
   `psql`.
3. Log in as `paola.mendoza@example.com`, open Promociones, and press
   «Contactos para promociones». Expected: AW35 with «← Promociones», the
   sidebar still marking Promociones, newest consent first, «—» for a contact
   without a phone, and «Aceptó el» as the Bolivia date (a consent at 23:30 in
   Bolivia keeps that day).
4. Search by a name without its accent, an email fragment, or phone digits.
   Expected: only the matching rows, and «No se encontró ningún contacto.»
   when none match (`GET /api/v1/administrator/promotion-contacts?q=…`;
   the export below is `GET …/promotion-contacts/export`, a CSV body).
5. Press «Exportar CSV». Expected: `contactos-promociones-aaaa-mm-dd.csv` with
   every contact (not only the page), columns Nombre, Tipo, Correo, Teléfono,
   Aceptó el (Tipo since BE-023), accents intact in a spreadsheet, and a
   `promotion_contact.exported` audit record with `contactCount`.
6. Press «Dejar de enviar» on a row, then «Borrar contacto». Expected:
   «Borramos el contacto de …», the row gone, and in `psql` the row kept with
   «Contacto retirado», a `retirado-<id>@contactos-retirados.invalid` email,
   no phone, `withdrawn_at` set, and a `promotion_contact.withdrawn` audit
   record. Calling `POST
   /api/v1/administrator/promotion-contacts/{id}/withdrawal` again answers
   `404` `promotion_contact_not_found`.
7. With more than 20 contacts (insert them with `psql`), a screen reader
   names each row's button «Dejar de enviar a …» with the contact's name
   (WEB-031). Open page 2, leave it with one contact, and press «Dejar de
   enviar» on it. Expected: the list goes back to page 1 with the success line
   still shown, never an empty page with a non-zero count. Then type a search
   or change the page. Expected: the success line goes away.
8. Check at 1440 px and 420 px, then drop the copy:
   `dropdb pilates_test_contacts`.

## Test 60: a live Client's promotions consent (BE-023)

A Client with an open Account agrees to promotions, or stops, from Perfil
(follow-up 103, ADR-0098). AW35 lists her as «Activa» beside the former
Clients («Cuenta cerrada»), and closing her Account ends the consent.

1. Use a copy of the fixtures as in Test 59 (`createdb pilates_test_be023`,
   `db:migrate:deploy`, `db:fixtures`), run the API on it, the Client app
   (`EXPO_PUBLIC_API_URL=http://127.0.0.1:<port>/api/v1 expo start
   --dev-client`), and the admin web (`ADMIN_API_PROXY_TARGET`; a dev server on
   another port needs that origin in `ADMIN_WEB_TRUSTED_ORIGINS`).
2. Log in to the Client app as `lucia@example.com` and open Perfil. Expected:
   a «Recibir promociones de Emma Pilates» card between the menu and «Cerrar
   sesión», with its helper and the switch off. The Maestro flow
   `.maestro/promotions-consent.yaml` turns it on and off again.
3. Turn it on. Expected: the switch turns Palo de rosa, and `GET
   /api/v1/clients/current/promotions-consent` (the switch sends
   `PUT …/promotions-consent` `{ "consented": true }`) answers `consented: true` with
   the time. Each period is its own row in
   `booking.client_promotions_consents`; turning it on again while it is on
   keeps the first time, and a Staff token answers `403`
   `booking_access_denied`.
4. In the admin web, open AW35. Expected: Lucía with an «Activa» pill, the
   former Clients with «Cuenta cerrada», and the CSV's Tipo column.
5. Press «Dejar de enviar» on Lucía. Expected: «¿Dejar de enviar promociones a
   Lucía Fernández?» with «Su cuenta no cambia…», no «no se puede deshacer»
   line, the button «Dejar de enviar», then «Lucía Fernández ya no recibirá
   promociones.»; her consent row gets `withdrawn_at`, her Account and name stay,
   and a `promotions_consent.withdrawn` audit record carries her `clientId`. In
   the app her switch is off again.
6. Turn the switch on for `sofia@example.com`, then close her Account from the
   app with «Quiero seguir recibiendo promociones de Emma Pilates» ticked (Test
   35). Expected: the new Promotion Contact keeps the time she turned the switch
   on, her consent row has `withdrawn_at` and `deleted_at` set to the closure
   time, and `account.closed` records `endedPromotionsConsent: true`. Without
   the box, the consent ends the same way and no contact is kept.
7. Drop the copy: `dropdb pilates_test_be023`.

## Test 61: broken booking rules answer a problem code, not 500 (BE-024)

A rule a Client or Staff Member can break answers a stable problem code. None
of these may answer `500` or reach error reporting. On a copy of the fixtures
(`createdb pilates_test_rules`, `db:migrate:deploy`, `db:fixtures`, the API on
another port), log in with `POST /api/v1/authentication-sessions`:

1. As `lucia@example.com`, book a Session more than 2 h 30 away
   (`POST /sessions/{id}/bookings` with an `idempotency-key`), then
   `POST /bookings/{id}/reschedule` to another Session that day. Expected:
   `409` `reschedule_outside_window`. A target on another day or already
   started answers `409` `reschedule_target_ineligible`, and a Booking
   rescheduled or cancelled meanwhile `409` `booking_not_reschedulable`.
2. As `emma.vargas@example.com`, `GET /bookings/history`. Expected: `403`
   `booking_access_denied` (class history is the Client's).
3. As the same Trainer, `POST /sessions/{id}/attendance` for a Session that
   has not ended, or one led by another Trainer. Expected: `403`
   `booking_access_denied`. A roster that misses or repeats a Booking answers
   `409` `attendance_roster_incomplete`.
4. Opening an activation or recovery link twice at once (two submissions
   before either finishes) answers `expired` to the second one, like any used
   link.
5. Drop the copy: `dropdb pilates_test_rules`.

## Test 62: the admin web's security headers (WEB-030)

The admin web sends a Content-Security-Policy (no framing, scripts and API
calls only from its own origin, fonts from Google Fonts) and the usual
hardening headers on every path. The list lives in
`apps/admin-web/security-headers.ts`; `vercel.json` must match it (a Jest
spec checks), and `vite preview` sends it so the Playwright journeys run under
the deployed policy.

1. Locally: `pnpm test:admin-e2e`. Expected: «serves the security headers and
   stays within its policy» passes, so no page logged «Refused to …», and
   the overlays it opens (Isabel's «Revisar pago» panel, the enlarged
   receipt, the confirmation) locked the page behind them (WEB-037).
2. After a release: `curl -sI https://emma-pilates-admin.vercel.app/` and the
   staging host. Expected: `content-security-policy` ending in
   `frame-ancestors 'none'`, `x-frame-options: DENY`,
   `x-content-type-options: nosniff`, `referrer-policy:
   strict-origin-when-cross-origin`, and `strict-transport-security`.
3. Open the admin web, sign in, and walk a few pages with the browser's
   console open. Expected: no «Content Security Policy» errors; fonts are Lora
   and Work Sans.
4. **The overlays (WEB-037).** Still with the console open, open «Nuevo gasto»
   on a Gastos list long enough to scroll, a transfer on Pagos with
   «Ver en grande», then «Confirmar pago» and «Volver»; in a window
   narrower than 1024 px, the «Abrir menú» drawer and the Branch bottom
   sheet. Expected: no «Refused to apply inline style» line (Radix's own
   scroll lock injected one until WEB-037); while any of them is open the
   page behind does not scroll with the wheel or the scrollbar, nothing
   shifts sideways when it opens or closes, and the page scrolls again
   once the last one is closed (the enlarged receipt or the confirmation
   closing over the panel keeps the lock).
5. The public site also sends `strict-transport-security` now
   (`curl -sI https://app.emmapilatesstudio.com/privacidad/`).
6. The API itself sends no policy of its own: it answers JSON to the apps
   and the proxy, so a `curl -sI` against the API shows only
   `X-Content-Type-Options: nosniff` on the image routes (receipts, photos,
   Promotion images), never a Content-Security-Policy.


## Test 63: Swagger off in production and the general request limit (BE-025)

Every request counts against its network address (1,200 a minute) and, when
it carries a credential, against that credential (600 a minute). A full lane
answers `429` with the problem code `rate_limit_exceeded` and `Retry-After` in
seconds until the minute ends (ADR-0099). `/health/*` and Resend's webhook are
never limited. Use a copy of the fixtures (`createdb pilates_test_be025`,
`db:migrate:deploy`, `db:fixtures`) and run the API on another port (3110
here):

1. Swagger locally: open http://localhost:3110/docs. Expected: Swagger loads,
   and `/openapi.json` answers 200.
2. Production mode: stop the API and start it again with `NODE_ENV=production`
   and the production settings it insists on (any test values) but no
   `ERROR_REPORTING_ENVIRONMENT`. Expected: `/docs` and `/openapi.json` answer
   `404` `resource_not_found`, `/health/live` still `200`. Add
   `ERROR_REPORTING_ENVIRONMENT=staging` and restart. Expected: both are
   served again.
3. Log in as `lucia@example.com` (`POST /api/v1/authentication-sessions`) and
   send 601 `GET /api/v1/clients/current/subscription` with her credential
   inside one minute:

   ```sh
   for i in $(seq 601); do curl -s -o /dev/null -w '%{http_code}\n' \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:3110/api/v1/clients/current/subscription; done | sort | uniq -c
   ```

   Expected: 600 answers `200` and the last `429`; `curl -i` once more shows
   `retry-after` and `"code":"rate_limit_exceeded"`. Another Account's
   credential still gets `200` from the same address, and `/health/live`
   answers `200`.
4. Anonymous requests: 1,201 `GET /api/v1/rate-limit-probe` (any unknown
   path) without a credential. Expected: 1,200 `404` and then `429`, which
   also turns away every credentialed request from that address until the
   minute ends.
5. Drop the copy: `dropdb pilates_test_be025`.

## Test 64: a page crash recovers inside the admin shell (WEB-032)

A defect that throws while a page draws no longer lands on the startup page
«No pudimos conectar con el servidor»: the sidebar and the top bar stay, and
the content area shows the recovery state of design follow-up 105. Nothing in
the fixtures crashes on purpose, so force one on `pnpm dev:admin` (Test 23),
signed in as `paola.mendoza@example.com`:

1. Open Planes. In `apps/admin-web/src/schedule/schedule-route.tsx`, add
   `throw new Error("forced");` as the first line of `ScheduleRoute` (do not
   commit it); Vite picks it up. Click **Horario** in the sidebar. Expected:
   the sidebar, the top bar with the Branch selector, and the account cell
   stay; the main area shows «Algo salió mal» (Lora), the note «No pudimos
   mostrar esta página. Inténtalo de nuevo; si vuelve a pasar, recarga la
   página.», and a 220 px-wide «Reintentar» primary button, directly on the
   cream surface with no card and no icon. The console logs the error;
   nothing covers the page.
2. Click **Reintentar**. Expected: the page is drawn again and, as the cause
   is still there, the same state returns at once. Click **Planes** in the
   sidebar. Expected: Planes shows its list; the state is gone.
3. Remove the line. Open Horario again, or click **Reintentar** if the state
   is showing. Expected: the week grid is back.
4. At 420 px (Test 23's narrow drawer), repeat steps 1 to 3 through the
   **Abrir menú** drawer. Expected: the same state, the note wrapped, the
   button at its full width, nothing scrolling sideways.
5. With a local DSN (Test 44 step 5), the crash arrives at the receiver as
   one `Error` event through React's root error handler, and a read that
   fails after the API is stopped (open a page you have not visited, such as
   Clientes, which shows «No pudimos cargar las clientas.») arrives as one
   `ApiError` event with the mechanism `tanstack_query`, even though the
   request was retried once. A 4xx answer, such as Login's wrong password,
   still sends nothing.

Verified on 2026-10-21 (WEB-032) in the in-app browser: every step above at
1440 px and 420 px, 2 events in all (one `Error`, one `ApiError`), none
with a message or a URL.

## Test 65: the launch screen on a cold start (MOB-068)

From the tap on the icon until the first screen is ready, both apps show the
Emma logo centred on the icons' blush background `#F3E9E7` (design follow-up
106): 240 pt wide on iOS (phone and iPad alike), 160 dp on Android, where
Android 12 and newer draw it inside the system's icon circle (invisible on
the same background). Nothing else is on it, and it fades out over 300 ms
once Login or the saved session's first screen has drawn; the breathing logo
of Test 54 then takes over inside that screen's content area when it loads
data. The screen is native: Expo Go cannot show it, and a store build only
carries it from the builds made after MOB-068 (REL-009's next round).

Build a **Release** app locally, which embeds the JavaScript and needs no
Metro, so the cold start is the store build's (the development builds of
Test 45 show the splash too, before the development launcher):

- iOS, from the app folder:
  `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 SENTRY_DISABLE_AUTO_UPLOAD=true EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1`
  then `env -u CI npx expo run:ios --configuration Release --device 49C1E5FE-BDBD-4404-AF4F-F0AF0BB078B0 --no-bundler`
  (CocoaPods and Xcode, about ten minutes the first time). It installs and
  opens the app on the iPhone 16 Pro; install the same `.app` on the iPad
  Pro 11 with `xcrun simctl install 57B2FBC4-2D73-4063-B00D-5D882C233AA2 ios/build/Build/Products/Release-iphonesimulator/<EmmaPilates or EmmaPilatesStaff>.app`.
- Android, from the app folder, with
  `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`:
  `npx expo prebuild --clean -p android --no-install`, then in `android/`
  `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -x lintVitalAnalyzeRelease -x lintVitalRelease`
  and `./gradlew --stop`. The APK is debug-signed, so
  `adb uninstall com.emmapilates.client` (or `.staff`) first, then
  `adb install app/build/outputs/apk/release/app-release.apk`.

Then, on each device and for each app:

1. Quit the app if it is open (`xcrun simctl terminate <udid> com.emmapilates.client`
   or `adb shell am force-stop com.emmapilates.client`) and open it again
   from the home screen or the launcher (`xcrun simctl launch <udid> <id>`,
   `adb shell monkey -p <id> 1`). Expected: at once, the blush screen with
   the logo and nothing else; a screenshot in the first second catches it.
   On Android 12+ the logo is smaller than on iOS and sits in the system's
   circle; no white screen appears before it.
2. Expected: the logo fades out as the Login screen (or the saved session's
   first screen) appears under it; no white gap between the two. Since
   MOB-069 a credential restore that fails (a keychain the build cannot
   read) lands on Login too instead of holding the logo forever.
3. Open the other app and repeat.

Verified on 2026-10-21 (MOB-068): see the backlog row's Evidence.

## Test 66: the loading states of the admin web (WEB-035)

The admin web no longer shows a blank page while it loads, nor an unchanged
page while a slow sidebar page arrives: both moments show only the Emma
logo, breathing calmly as the mobile apps' loading state does (design
follow-up 107). On a fast computer against a local backend neither lasts
long enough to see, so slow the browser down: in Chrome's developer tools,
open the **Network** panel and choose **Slow 4G** (or a custom profile) in
the throttling menu, and tick **Disable cache**. Use the development server
(`pnpm dev:admin`, Test 23) or the built app (`preview`, Test 23); the
built app also runs under the Content-Security-Policy (Test 62), which
must stay silent.

1. **First load.** Signed in or not, open
   [http://localhost:5173/catalogo/planes](http://localhost:5173/catalogo/planes)
   with the throttle on. Expected: from the first paint the whole window
   is the cream background with only the Emma logo centred in it, 300 px
   wide (240 px in a window narrower than 1024 px), fading in and then
   breathing (opacity between 0.55 and 1, about one breath every three
   seconds); no wordmark, no text, no spinner. It stays, without a blink,
   until Planes (or Login) is drawn, and that page replaces it at once.
   The browser's console shows no «Refused to» line.
2. **Page switch.** Signed in, with the throttle still on and the cache
   disabled, click a sidebar entry you have not opened since the page
   loaded, such as **Gastos**, and do not hover it first (the sidebar
   preloads a page you point at). Expected: for the first 400 ms nothing
   changes; then the content area shows only the logo on the cream surface,
   centred between the top bar and the bottom of the window, while the
   sidebar, the top bar, and the Branch selector stay usable (you may click
   another entry). The logo stays at least half a second, then Gastos
   replaces it at once. Without the throttle, or on an entry you hovered
   first, the page appears with no logo in between.
3. **Narrow window.** At 420 px (Test 23's narrow drawer) repeat steps 1
   and 2 through **Abrir menú**. Expected: the same two states with the
   logo 240 px wide, nothing scrolling sideways.
4. **Reduce Motion.** With the system's reduce-motion setting on (macOS:
   System Settings → Accessibility → Display → Reduce motion), repeat step
   1. Expected: the logo appears still, at full opacity, with no fade and no
   breath.
5. **Screen reader.** VoiceOver reads the first load as «Cargando la
   administración» and the page switch as «Cargando la página»; the image
   itself is not read.

The in-page «Cargando …» notices a page shows while its own data loads
(the white card, Tests 25 to 30) are unchanged.

## Test 67: see the Staff app as a Staff Member (FUT-001)

An Administrator signed in to the Staff app may see and act in it as one
active Trainer, Assistant, or Nutritionist for 30 minutes
([ADR-0100](./adr/0100-impersonate-a-staff-member-from-the-staff-app.md)).

### A. In the Staff app

Start the API and the Staff app as Test 1 and Test 2 describe and log in as
`paola.mendoza@example.com` on the iPhone, the iPad, or the Android emulator.

1. Tap the «Tu cuenta» avatar on Pagos pendientes. Perfil shows a third row,
   «Ver la app como…», that only an Administrator has.
2. The row opens «Ver la app como…»: the intro line, then the active Staff
   Members grouped as **Entrenadoras**, **Asistentes**, and
   **Nutricionistas**, each with their initials, name, and Branches. Paola
   herself and pending or deactivated members never appear. With nobody
   active (deactivate every other member in Personal on a copy of the
   fixtures, Test 26) the screen centres «Nadie a quien ver todavía» over
   «Cuando actives a una entrenadora, asistente o nutricionista, aparecerá
   aquí.»; with the API down it shows «No pudimos cargar al personal.» with
   **Reintentar** (Test 71), and a start the API refuses reads «No pudimos
   empezar a ver la app como esa persona. Inténtalo de nuevo.».
3. Tap Emma Vargas. A bottom sheet (S24's, UX-002) names her («¿Ver la app
   como Emma Vargas?» in Lora) and states the 30 minutes and that everything
   is recorded in your name; the quiet «Cancelar» link leaves everything as
   it is, the solid Palo de rosa «Ver como Emma» spins while the start runs.
4. The app re-draws as Emma: her «Mi agenda» root under a fixed Palo de rosa
   profundo strip reading «Viendo como Emma Vargas» over «Entrenadora ·
   Quedan 29 min», with «Salir» at its right. The strip stays over every
   screen, the avatar shows her initials, and Perfil shows her read-only data
   without the «Ver la app como…» row. No notification permission is offered
   and this phone is not registered as her push device.
5. Tap «Salir»: you are back on Pagos pendientes with the notice «Dejaste de
   ver la app como Emma Vargas.» for a few seconds, and the strip is gone.
   Let the 30 minutes run out instead and the app returns on its own with
   «Terminó el tiempo para ver la app como Emma Vargas.»

The committed Maestro journey `administrator-view-as.yaml` does steps 1 to 5
(Test 19 shows how to run the suite).

### B. Through the API

With Swagger or curl against the fixtures (Test 2 and Test 3 show how to
start the API and log in):

1. Log in as `paola.mendoza@example.com` and read the active Staff Members
   with `GET /api/v1/administrator/staff-members?status=active&pageSize=100`.
   Keep Emma Vargas's `id`.
2. `POST /api/v1/impersonations` with `{ "staffMemberId": "<Emma's id>" }`
   answers `201` with the Impersonation (`staffMemberName`, `role`, and
   `expiresAt` 30 minutes ahead) and `Cache-Control: no-store`. Paola's own
   id answers `409 staff_member_not_impersonable` (so does a pending or
   deactivated member), an unknown id `404 staff_member_not_found`, and a
   Trainer calling it `403 staff_access_denied`. The admin web's cookie
   session answers `403 impersonation_surface`.
3. With the **same** bearer credential, `GET /api/v1/authentication-sessions/current`
   now returns Emma's identity (`role: trainer`, her Branches) plus an
   `impersonation` object with her name and the expiry. Every other request
   behaves as Emma: `GET /api/v1/trainer/sessions?…` lists her Sessions, the
   notification inbox and unread count are hers, and an Administrator route
   such as `GET /api/v1/administrator/staff-members` answers `403`. A second
   `POST /api/v1/impersonations` answers `403 staff_access_denied` too: while
   it lasts, the session is not an Administrator's.
4. The commands kept from an impersonating session answer
   `403 impersonation_forbidden`: `PATCH /api/v1/accounts/current/password`,
   the three `/api/v1/accounts/current/email-change` commands,
   `PUT /api/v1/notifications/devices/current` and its `deactivate`, and
   `POST /api/v1/notifications/read-all` or `…/{id}/read`. Reading the inbox
   stays allowed.
5. `DELETE /api/v1/impersonations/current` answers `204`; a second call
   `404 impersonation_not_active`, and `…/current` is Paola again. Logging
   out while impersonating ends it too, and so do the 30 minutes (the next
   request after `expiresAt` resolves Paola and ends the row as `expired`).
6. In the database, `system.impersonation_sessions` holds the row with
   `end_reason` (`exited`, `expired`, `logged_out`, or `revoked`), and
   `system.audit_records` holds `impersonation.started` and
   `impersonation.ended` with Paola as actor (the system for an expiry or a
   revocation). A cash Payment, an Evaluation cancellation, or a Client
   invitation made meanwhile is audited to Paola with `actor_role =
   administrator` and `impersonation_id` set.

## Test 68: watch the worker's other housekeeping sweeps

Besides the sweeps of Tests 13 and 16, the worker runs four more
housekeeping sweeps once at start and then on their interval
(`apps/backend/src/worker.ts`; a failure logs `<job>_failed` and reports
to Better Stack, Test 44). Nothing is physically deleted
([ADR-0086](./adr/0086-soft-delete-every-database-row.md)): rows get
`deleted_at` or an end state, and only object bytes leave the store. Use a
copy of the fixtures (`createdb -T pilates_dev_sim pilates_test_sweeps`),
start the API and the worker on it, and back-date one row per sweep with
`psql -d pilates_test_sweeps`; the next run (at most an hour away, or at once
when you restart the worker) does the rest. Two things no sweep touches: pg-boss's own
`pgboss.job` rows, which keep a failed job's sanitized record for 30 days
([ADR-0065](./adr/0065-retain-failed-jobs-for-thirty-days.md)) before pg-boss
removes it, and a pg-boss runtime error, which the worker only logs as
`pg_boss_error`.

1. **`pending_account_cleanup` (hourly).** A registration nobody verified
   for 7 days, or a Staff-made invitation nobody activated for 30 days, is
   removed: register from the Client app (Test 4) and invite a Client as
   Camila (Test 11 E), then
   `update system.accounts set pending_expires_at = now() - interval '1 day' where email in ('<registered>', '<invited>')`.
   After the sweep both rows carry `deleted_at`, the Assistant's search no
   longer finds the invited Client, her invitation link answers `removed` to
   `POST /api/v1/authentication-links/inspection` (Test 6 A), and the
   registered address can register again.
2. **`image_upload_cleanup` (hourly).** Three kinds of bytes go: an upload
   declared but never finalized, 3 days later
   ([ADR-0089](./adr/0089-delete-abandoned-uploads-after-three-days.md));
   the variants of a replaced or removed profile photo and of a deleted
   Promotion, at once
   ([ADR-0076](./adr/0076-delete-detached-profile-and-promotion-images.md),
   Tests 9 A and 32 C); and a transfer receipt 45 days after it was
   finalized or 7 days after the Payment was decided, whichever is later
   ([ADR-0075](./adr/0075-delete-receipt-images-after-forty-five-days.md)).
   Confirm or reject a transfer (Test 10 C), then
   `update system.image_assets set deletion_due_at = now() - interval '1 minute' where purpose = 'transfer_receipt' and deletion_due_at is not null`.
   After the sweep the `readable` and `thumbnail` files are gone from
   `apps/backend/.data/uploads/private/transfer_receipt/<id>/` (or from the
   bucket, Test 42), `system.image_assets` keeps the row with `deleted_at`
   and its sizes, the Payment row still names the asset, and
   `GET /api/v1/administrator/payments/{id}/receipt` answers
   `409 payment_receipt_not_ready` («Receipt is no longer available»).
   A declaration sets `deletion_due_at` three days ahead, so
   `POST /api/v1/uploads` without the `PUT` and `finalize`, then the same
   `update` for `state = 'pending'`, shows the abandoned case: the
   `pending/` file disappears and the row is marked removed.
3. **`purchase_intent_expiry` (every 5 minutes).** Open an Intent as
   `mariana@example.com` (Test 7, «Buying a Plan through Swagger», steps
   1–3; attach no receipt), then
   `update booking.purchase_intents set expires_at = now() - interval '1 minute' where state = 'open'`.
   Within five minutes `GET /api/v1/purchase-intents/current` answers
   `404 purchase_intent_not_found`, the row reads `state = 'expired'`,
   `GET /api/v1/clients/current/credit` shows any reserved Credit back in
   `availableCentavos`, and `POST …/{id}/submit` answers
   `409 purchase_intent_not_open` (before the sweep passes, the same call
   on the back-dated row answers `409 purchase_intent_expired`). A new
   Intent can be opened at once.
4. **`subscription_reminders` (hourly)** records «Plan por vencer» / «Tu
   plan vence en 3 días.» once per Subscription that ends in three days
   (Valeria's fixture, Test 7); a second run adds nothing.

Drop the copy afterwards: `dropdb pilates_test_sweeps`.

## Test 69: the notifications a studio change sends

Three inbox types are only reached when administration changes a class
that is already booked. Each is an entry with sound on the Android
`actionable` channel (Test 46 B) that opens Mis reservas or Mi agenda from
Perfil → Notificaciones (Test 18). Start the API, the worker, both apps, and
the admin web on `pilates_dev_sim` with the fixtures (Tests 5 A and 24).

1. **A seat frees for a waitlisted Client.** Seed a one-seat class the way
   the Maestro flow does (`waitlist-join-and-leave.yaml`: tomorrow at 05:00
   in Centro, filled by Valeria), or create a Session of capacity 1 in
   Horario (Test 25, step 2) and book it as `valeria@example.com`; join its
   Waitlist as `lucia@example.com` (**Unirme a la lista de espera**, Test
   5 B). Then cancel Valeria's Booking (her **Cancelar** in Mis reservas, or
   `DELETE /api/v1/bookings/{id}`). Lucía's Waitlist Entry closes as
   `promoted`, a Booking is created for her in the same transaction, and
   her inbox reads «Cupo liberado» / «¡Tienes un cupo! Te promovimos de la
   lista de espera para tu clase de Mat Pilates.» (the Class Type varies);
   Mis reservas shows the class as a Booking and the Perfil badge counts
   one. A Client with no eligible Plan at that moment is skipped and the
   next entry is promoted.
2. **The studio moves a booked class.** In Horario, open a Session Lucía
   has booked and change its **Hora** with **Solo esta sesión** (Test 25,
   step 3; the API is `PATCH /api/v1/administrator/sessions/{id}`). Every
   booked Client receives «Tu clase cambió de horario» / «Tu clase de Mat
   Pilates cambió de horario: ahora es el sábado 26 de septiembre, 16:00.»
   (the day and time vary), and Mis reservas shows the new time. The empty-Session check of Test 13 starts
   over for the moved Session.
3. **The studio reassigns a Trainer.** In the same panel change the
   **Entrenadora** to Daniela Ortiz. Daniela's inbox (Staff app, Perfil →
   Notificaciones) reads «Nueva clase asignada» / «Se te asignó una clase:
   Mat Pilates, sábado 26 de septiembre, 16:00.» and opens her Mi agenda; the previous
   Trainer is not told. A weekly schedule's replacement (Test 21, step 2)
   sends the same notice.

Each of the three is one row per change: repeating the same edit sends
nothing new (the `business_event_key` carries the change's instant), and
all three are `delivered` through push on an Android development build
(Test 46), with the full copy on the lock screen (none of them is private).

## Test 70: the rule codes a journey can answer

Every rule a Client or Staff Member can break answers a stable problem code
(RFC 9457, Test 4), never `500` (Test 61). The codes below are the ones the
earlier tests never show; call the endpoints with Swagger or curl on a copy
of the fixtures (`createdb -T pilates_dev_sim pilates_test_codes`, the API
on it) as the Account named, with an `idempotency-key` UUID on every
command.

**Bookings** (`lucia@example.com`; Test 7 names the endpoints):

| Do this | Answer |
| --- | --- |
| Book a Session, then book the same Session again | `409 active_booking_exists` |
| Book a second Session that overlaps the first in time (no two fixture classes share an hour on the same day, so add a one-off Session at Equipetrol at a Centro class's time in Horario, Test 25 step 2) | `409 booking_overlap` |
| Book a full Session (`isabel@example.com` has no classes; fill a capacity-1 Session first) | `409 session_full` |
| Join the Waitlist of a Session that still has seats | `409 session_has_capacity` |
| Join a Waitlist twice | `409 active_waitlist_entry_exists` |
| Cancel a Booking less than 2 h 30 before its start (one the flow of Test 19 seeds «10 minutes away») | `409 booking_cancellation_window` |
| Cancel the same Booking twice, or a Booking of a cancelled Session | `409 booking_not_cancellable` |
| Leave a Waitlist Entry that was already closed (promoted, left, or its Session started) | `409 waitlist_entry_not_active` |
| Book as `mariana@example.com` (no Plan) or `sofia@example.com` (expired) | `409 no_eligible_subscription` |
| Reschedule outside the window, to another day, or a cancelled Booking | `409 reschedule_outside_window`, `reschedule_target_ineligible`, `booking_not_reschedulable` (Test 61) |

**Payments** (`mariana@example.com`; Test 7, «Buying a Plan through
Swagger», names the endpoints):

| Do this | Answer |
| --- | --- |
| Open an Intent for a Plan hidden with **Ocultar en la app** (Test 25, step 5) | `409 plan_not_purchasable` |
| Submit an Intent without a receipt | `409 payment_receipt_required` |
| Attach an upload that is still `processing` (stop the worker first) | `409 payment_receipt_not_ready` |
| Attach a receipt that another Account uploaded (Sofía's asset id) | `403 payment_receipt_invalid_owner` |
| Attach or submit after the Intent was submitted | `409 purchase_intent_not_open` |
| Attach or submit after the Intent expired (Test 68, step 3) | `409 purchase_intent_expired` |
| Open an Intent while a transfer is under review | `409 payment_pending_exists` |
| `POST /api/v1/credit-purchases` as `sofia@example.com` (Bs 60 of Credit) for a Plan that costs more | `409 credit_insufficient`; create a Plan priced under Bs 60 in Planes (Test 25, step 5) and the same call activates it at once, with `payment_confirmed` in her inbox and no QR (Test 10 E) |
| As Paola, confirm or reject a cash Payment's id, or a decided one again with the opposite decision | `409 payment_not_pending`, `409 payment_confirmation_conflict` (Test 7) |

**Uploads** (any Account; Test 32 A names the three calls; limits are 10 MB
for a receipt, 5 MB for a profile photo, 20 MB for a Promotion image, JPEG,
PNG, or WebP only):

| Do this | Answer |
| --- | --- |
| Declare `mediaType: image/gif` (or `application/pdf`) | `400 image_media_type_invalid` |
| Declare `byteSize: 0` or a negative size | `400 image_size_invalid` |
| Declare a checksum that is not a base64 SHA-256 | `400 image_checksum_invalid` |
| Declare a `byteSize` over the purpose's limit | `400 image_too_large` |
| `PUT` more than 25 MB of bytes | `413 payload_too_large` |
| `PUT` to an upload that was already finalized, or `finalize` one that is already `ready` or `failed` (a second `finalize` while it is `processing` is accepted and does nothing) | `409 upload_not_writable`, `409 upload_not_finalizable` |
| `PUT` or `finalize` another Account's upload | `403 upload_access_denied` |
| `GET /api/v1/uploads/{id}` with a made-up id, or another Account's | `404 upload_not_found` |

**Catalog and schedules** (`paola.mendoza@example.com`; Test 21 names the
endpoints):

| Do this | Answer |
| --- | --- |
| Create a Branch or Class Type with an empty name, or a Plan with a price or class count of 0 | `400 invalid_catalog_value` |
| Create a Class Type named «Mat Pilates» | `409 class_type_name_taken` |
| A weekly schedule or one-off Session with a capacity of 0, or a `startsAtLocal` such as `25:00` (a duration outside 5–240 minutes is refused earlier as `invalid_request`) | `400 invalid_schedule` |
| A schedule, replacement, or end whose `effectiveFrom` is in the past | `400 effective_date_invalid` |
| `PATCH` a Session that is cancelled or already started | `409 session_not_editable` |
| Send Branches for a new Administrator | `400 invalid_branch_assignment` (Test 17) |

**Identity** (Test 67 names the impersonation endpoints):

| Do this | Answer |
| --- | --- |
| `POST /api/v1/impersonations` twice in the same second from two terminals | `409 impersonation_active` for the loser of the race (the sequential case answers `403 staff_access_denied`) |
| `POST /api/v1/accounts/current/closure` with a Staff credential | `403 closure_access_denied` |
| `POST /api/v1/accounts/current/email-change` for an Account that is not active | `409 account_not_active` (only reachable through the automated tests: a pending Account cannot sign in) |
| Register with your own referral code | `400 referral_self_reference` (unreachable by hand: a code belongs to an existing Client; the unit tests cover it) |

The `*_not_found` family (`session_not_found`, `payment_not_found`,
`evaluation_not_found`, `supply_not_found`, `expense_not_found`,
`expense_category_not_found`, `salary_payment_not_found`,
`promotion_not_found`, `session_schedule_not_found`,
`availability_block_not_found`, `evaluation_slot_not_found`,
`notification_not_found`, `profile_photo_not_found`,
`promotion_image_not_found`) answers `404` to a made-up UUID on the matching
route; `profile_photo_not_ready` and `promotion_image_not_ready` answer
`409` to an asset the worker has not finished; `invalid_cursor` answers
`400` to a garbled `cursor` on `GET /api/v1/notifications`;
`expense_category_name_taken`,
`availability_block_ended`, `branch_archived`, `promotion_archived`, and
`staff_member_deactivated` answer `409` when the row named is already in
that state, and so do `evaluation_not_booked` and `evaluation_started` to
`DELETE /api/v1/administrator/evaluations/{id}` for a cancelled or started
Evaluation; `invalid_back_office_value` and `invalid_promotion_value` answer
`400` to a Back Office or Promotion body that fails a rule the DTO cannot
express (a negative quantity, an end date before the start). Drop the copy
afterwards: `dropdb pilates_test_codes`.

## Test 71: the mobile apps' load, error, offline, and link states

Every screen that reads data draws the same three states in both apps:
the breathing logo while it loads (Test 54), a load failure, and its own
content or empty state. The failure is a plain line under the header with a
**Reintentar** primary button (screen readers hear the line as an alert).
Run it on the iPhone 16 Pro, the iPad Pro 11, and the Android emulator, in
both apps, with the API on `pilates_dev_sim` and the fixtures.

1. **A load failure.** Sign in as `lucia@example.com`, then stop the API
   (Ctrl+C in its Terminal) and open a screen you have not visited: Perfil
   → **Notificaciones** reads «No pudimos cargar tus notificaciones.»,
   **Mis evaluaciones** «No pudimos cargar tus evaluaciones.», **Mi
   crédito** «No pudimos cargar tu crédito.», the **Reservar** tab «No
   pudimos cargar las clases.», a Plan «No pudimos cargar el plan.». A tab you
   had already opened shows the same line once its refresh fails. Start the
   API again and tap
   **Reintentar**: the screen loads. In the Staff app as
   `camila.rojas@example.com` the search result's overview reads «No
   pudimos cargar al cliente.» (on the iPad, inside the right panel), the
   Trainer's root «No pudimos cargar tu agenda.», the roster «No pudimos
   cargar la lista de asistencia.», the Administrator's root «No pudimos
   cargar los pagos pendientes.», and the Nutritionist's **Mi
   disponibilidad** «No pudimos cargar tus horarios.».
2. **An action failure.** With the API stopped, tap an action instead: a
   refused command shows its own line and keeps the form, in the pattern
   «No pudimos … Inténtalo de nuevo.» (Test 10 D's «No pudimos cancelar la
   sesión. Inténtalo de nuevo.», Test 67's «No pudimos empezar a ver la
   app como esa persona. Inténtalo de nuevo.»); the button spins while the
   request waits (Test 50) and nothing is sent twice.
3. **Offline.** Cut the device's network as Test 9 F describes: the banner
   «Sin conexión. Mostrando la última información guardada.» sits above
   every screen until the network is back, and the screens of step 1 that
   were already loaded keep their data.
4. **A render error.** Test 1 describes «Algo salió mal» with
   **Reintentar**; it needs a defect to appear (a temporary `throw` in a
   screen, never committed), so it is read there, not here.
5. **The link screens.** Open an authentication link on the Android
   emulator with a development build (Test 57): the app first shows
   **Comprobando enlace** under the Emma wordmark while it inspects the
   token (`POST /api/v1/authentication-links/inspection`, Test 6 A), then
   the password form («Crea una contraseña nueva» for a recovery; «Crea tu
   contraseña» under the eyebrow «Activar cuenta» for an invitation, which
   ends on «Tu cuenta está activa»; both fields carry the eye of Test 52). Open the same link a second time: **Este enlace ya no es válido**
   under the Palo de rosa clock of Test 1, with **Volver a iniciar
   sesión**. An activation link whose invitation the 30-day cleanup removed
   (Test 68, step 1) reads **Esta invitación ya no está activa**. The Staff
   app draws the same screens (S18, S19) for a Staff Member's recovery
   (`¿Olvidaste tu contraseña?` on its Login, Test 1 B) and for the
   activation link of a member invited in Test 26, whose `/staff/` link
   opens the Staff build.
6. **Empty states** are read where their screens are: Reservar and Mi
   plan (Test 5 B and Test 18), the Client's history and inbox (Tests 5 B
   and 9 B), the Assistant's reservations and history and «Sin plan
   activo» (Test 11 B), Pagos pendientes (Test 10 C), the roster (Test 12),
   Mis evaluaciones (Test 15), referrals and Credit (Test 10 A), and «Ver
   la app como…» (Test 67 A).

## Test 72: the admin web's empty, failed, refused, and lost states

Every list page draws one of four states inside its white card: its rows,
"Cargando …" while they arrive (Test 66 covers the logo before that), an
empty line, or a load failure with **Reintentar**. Check each at 1440 px
and 420 px in a real browser (Test 23).

1. **An empty studio.** Create an empty database and its first
   Administrator (Test 14 on `pilates_test_bootstrap`, activated through
   the captured link), start the API and the admin web on it, and sign in.
   The top bar's selector reads "Todavía no hay sucursales activas."
   instead of a Branch, and each page says what to do first:
   - **Horario**: "Todavía no hay sucursales activas. Crea una en
     Sucursales para armar su horario."; **Insumos**: "… para llevar sus
     insumos."; **Gastos**: "… para registrar sus gastos."; **Evaluaciones
     nutricionales**: "Todavía no hay sucursales activas. Las evaluaciones
     se ven por sucursal."; **Retiros e insumos consumidos**: the bare
     line.
   - **Clientes**: "Todavía no hay clientas."; **Pagos**: "Todavía no hay
     transferencias." under **Todos**, "Todavía no hay pagos confirmados."
     and "… rechazados." under those filters (Test 27); **Nómina**:
     "Todavía no hay pagos registrados." (with an **Empleado** chosen, "No
     hay pagos registrados para esta persona."); **Categorías de gasto**:
     "Todavía no hay categorías. Agrega la primera abajo."; **Referidos**:
     "Todavía no hay referidos." under the subtitle "Todavía no hay
     referidos en el estudio"; **Promociones**: "Todavía no hay
     promociones." (Test 33); **Contactos para promociones**: "Todavía no
     hay contactos." (Test 59); **Personal** lists the Administrator alone.
   - Create a Branch (Test 25, step 5): the selector and Horario wake up,
     and **Insumos** reads "Todavía no hay insumos en esta sucursal.",
     **Gastos** "Todavía no hay gastos en esta sucursal.", and **Nuevo
     gasto**'s category list "Todavía no hay categorías: crea la primera."
     until each gets its first row. Drop the database afterwards.
2. **A filter with no match.** On the fixtures, `?status=archived` on
   Sucursales says "No hay sucursales con este filtro.", the same address
   on Tipos de clase "No hay tipos de clase con este filtro.", and
   `?visibility=hidden` on Planes "No hay planes con este filtro." (archive
   or hide one to see the row instead). A searched list that finds nothing
   keeps its header and says so (Clientes, Referidos, and Contactos in Tests
   26, 29, and 59); the pagination footer of an empty table reads "Sin
   resultados" and a table with no copy of its own "No hay registros.".
3. **A load failure.** Signed in on the fixtures, stop the API and open a
   page you have not visited: its card reads "No pudimos cargar …" with
   the page's noun (Test 64 shows "No pudimos cargar las clientas.") and a
   small **Reintentar**; the sidebar, top bar, and selector stay. The
   selector itself, when its own read fails, reads "No pudimos cargar las
   sucursales. Inténtalo de nuevo."; inside a panel, a list that fails
   reads its own line ("No pudimos cargar las categorías." in Nuevo gasto,
   "No pudimos cargar al personal" in Registrar pago, "No pudimos cargar
   los insumos. Cierra el panel e inténtalo de nuevo." in Registrar
   retiro). Start the API and **Reintentar** fills the card. Each failure
   that TanStack gave up on is one `ApiError` event when a DSN is set (Test
   44, step 5).
4. **Lost at startup.** Stop the API and reload any address: the whole
   window shows "No pudimos conectar con el servidor. Revisa tu conexión e
   inténtalo de nuevo." with a large **Reintentar** on the Login layout
   (screen readers hear the heading "Sin conexión"); start the API and
   **Reintentar** continues to the page. Compare Test 64, where a page
   crash keeps the shell.
5. **Unknown address.** `/no-existe` shows "Página no encontrada" with
   **Volver al horario** inside the shell (Test 23, step 4).
6. **Refused.** The admin web maps a `403` from the API to a line of its
   own instead of a crash: "No tienes permiso para ver esta sección." in a
   list's card, and on a write "No tienes permiso para cambiar el
   horario." (Horario), "… el catálogo." (Tipos de clase), "… sucursales.",
   "… los planes.", "… al personal.", "… el Back Office.", "… las
   promociones.", and "No tienes permiso para decidir pagos." (Pagos).
   A signed-in Administrator cannot reach them by hand (the API accepts
   every one of her requests, and her own Role cannot be changed, Test 17),
   so the Jest suite covers each copy (Test 8); a tester sees them only
   after a defect.

## Test 73: CI's security jobs and the automated dependency updates

Besides the test chains of Test 8, [`ci.yml`](../.github/workflows/ci.yml)
runs four jobs that check the repository itself (EXT-019); none needs a
secret, and three of them can be run on the Mac:

1. **`audit`** runs `pnpm audit --audit-level high` on every pull request.
   Run it from the repository root: it prints the advisories and exits 0
   while none is high or critical outside the ignore list in
   `pnpm-workspace.yaml` (`auditConfig.ignoreGhsa`); a new high advisory
   fails the job until the dependency is updated or the advisory is
   ignored on purpose, with the reason beside it.
2. **`secrets`** runs gitleaks over the whole history
   (`gitleaks/gitleaks-action`, pinned version) and fails on anything that
   looks like a credential. It runs only in CI; to try it, push a branch
   with a fake token such as `AKIAIOSFODNN7EXAMPLE` in a scratch file and
   watch the job fail, then drop the commit (never merge it).
3. **`migrations`** proves that the committed migrations still produce the
   Prisma schema: `.github/scripts/check-migrations.sh` applies every
   migration to an empty database and diffs it against
   `apps/backend/prisma/models`. Run it locally against a throwaway
   database:

   ```sh
   createdb pilates_test_drift
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_test_drift" .github/scripts/check-migrations.sh
   dropdb pilates_test_drift
   ```

   It prints «the migrations produce the schema (only the known drift
   remains)»: the ten composite foreign keys that live only in migration
   SQL are listed in `apps/backend/prisma/known-drift.sql`, and any other
   statement fails the check.
4. **`public-site`** runs `node .github/scripts/check-public-site.mjs`
   when `apps/public-site/**` changes: the `_headers` file is present and
   complete, every page is whole, and every link resolves. Run the same
   command from the root; it exits 0 and prints nothing to fix.

On a pull request the `changes` job starts only the jobs whose paths
changed (Test 8), and a push to `main` is never cancelled by a later one.
[`dependabot.yml`](../.github/dependabot.yml) opens one grouped pull request
a week per ecosystem for **security** updates only (version updates stay
off); it shows up as a pull request by `dependabot[bot]` that CI checks
like any other, and the user merges it.

## Test 74: the operations runbooks, the monthly reminder, and the monitors

The runbooks under [`docs/runbooks/`](./runbooks/) are the procedures a
person follows outside the code. Each has a part you can rehearse without
touching production.

1. **Pause and resume staging** ([release
   runbook](./runbooks/production-release.md#pause-and-resume-staging)).
   Staging's team is Pay as you go (about $0.015 an hour for `api` and
   `worker` together). Before Test 40 or Test 55: Northflank, team
   `emma-pilates-staging` → Services → `api` → **Resume**, then `worker`,
   and wait for `curl -s https://p01--api--jmys6w5p8vlk.code.run/health/ready`
   to answer `ready` (a merge that landed while paused failed its release
   at readiness: `gh workflow run release-staging.yml` releases main's
   head). After testing: **Pause** both, in that order, and confirm the
   services read Paused. Team → Billing → Usage shows the hours; a $3
   billing alert emails the owner.
2. **Copy production into staging** (the same runbook, «last resort»,
   [ADR-0093](./adr/0093-copy-production-into-staging-as-a-last-resort.md)).
   Rehearse only the refusal: `gh workflow run copy-production-to-staging.yml -f confirm="no"`
   leaves its only job skipped and touches nothing, because the job runs
   only when the input is exactly `copy production to staging`. The real run restores
   production's newest daily dump as `emma_staging` and releases `main` to
   staging again; while a copy is loaded, the runbook's «do not» list
   applies (no recovery, resend, invitation, email change, or closure for a
   real address; no `EXPO_ACCESS_TOKEN` on staging; no bulk email tests),
   and a fresh staging reset follows the fix.
3. **A personal data request**
   ([runbook](./runbooks/personal-data-requests.md)). Rehearse it on
   `pilates_dev_sim` for a fixture Client: verify the requester (only from
   the Account's address, or in person with an ID), add the row to the
   request log with the 15-business-day deadline, run the queries of
   [`personal-data-request.sql`](./runbooks/personal-data-request.sql) with
   `psql` to collect her data, and read the «Deletion requests» and «Stop
   promotions» sections, which point at the closure of Test 35 and the
   AW35 actions of Tests 59 and 60.
4. **An incident** ([runbook](./runbooks/incident-response.md)). Rehearse
   the first two steps without an incident: pick the severity from the
   table, open a row in the incident log, and freeze deploys with
   `gh workflow disable "Release Production" --repo DaleneyRuben/emma-pilates`
   (`gh workflow list` shows it disabled; `gh workflow enable` puts it
   back). The runbook then says what to contain, which secrets to rotate
   (its table), when to restore from a backup (Test 43 B), whom to tell,
   and to save Northflank's logs the same day, because they are kept 30
   days ([infrastructure, «Logs and
   retention»](./architecture/infrastructure.md#logs-and-retention)).
5. **Secrets rotation** ([runbook](./runbooks/secrets-rotation.md)). Read
   the inventory (which secret lives in which store, who issues it) and
   the calendar: the deploy tokens on 2027-09-14 and 2027-09-17, every
   never-expiring credential in the same September sitting, the restore
   drill every quarter from January 2027, and the free-plan usage check
   every month. A rotation ends with a row in the rotation log and the
   calendar line moved a year forward in the runbook **and** in the
   workflow below.
6. **The monthly reminder**
   ([`operations-reminders.yml`](../.github/workflows/operations-reminders.yml)).
   On the first of every month at 09:00 La Paz it opens one GitHub issue
   per task that falls due in the coming month (`[ops] <task> (due
   <date>)`, `[ops] Restore drill <year> Q<n>`, `[ops] Free-plan usage check
   <year>-<month>`), skipping any whose issue is still open. Run it by hand
   with `gh workflow run operations-reminders.yml`: the run's log lists
   each task as opened or «still open», and `gh issue list` (or the
   repository's Issues tab) shows the usage-check issue for the month.
   Close the issue with the month's numbers from the consoles listed under
   [«Free-plan limits that can be exceeded
   silently»](./architecture/infrastructure.md#free-plan-limits-that-can-be-exceeded-silently)
   (EAS builds, Resend, R2, Vercel, Northflank, Aiven, Better Stack,
   Actions minutes, Pages builds). GitHub disables the schedule after 60
   days without a push; its email is the cue to run it by hand and
   re-enable it.
7. **The restore drill** ([backups
   runbook](./runbooks/backups-and-restore-drills.md#restore-drill)) is
   Test 43 B; each quarter's run adds a row to the runbook's «Drill log»
   (the reminder issue asks for it), and the weekly bucket check is
   `pnpm backup:check` (Test 43 A).
8. **The three newer uptime monitors**
   ([runbook](./runbooks/uptime-monitors.md)) check
   `https://emma-pilates-admin.vercel.app/`,
   `https://app.emmapilatesstudio.com/`, and
   `https://links.emmapilatesstudio.com/.well-known/assetlinks.json` every
   3 minutes with the API monitor's settings (Test 37). To prove one
   fires without breaking anything, open **Production admin web** →
   Configure, point it at `https://emma-pilates-admin.vercel.app/api/v1/does-not-exist`
   (the proxy answers 404), save, and wait about 6 minutes for «New
   incident started»; put the URL back and «Incident resolved» follows.
   Record the two times in the infrastructure page, as the API monitor's
   were. The runbook's last table says where to look first when each one
   alerts (Vercel's deployments, Cloudflare Pages, the `links.` DNS record
   and Northflank's certificate).
9. **The mobile release** ([runbook](./runbooks/mobile-release.md)) is
   rehearsed through Tests 19, 45, 46, 48, and 55; the runbook adds the
   EAS Update path for a JavaScript-only fix and the «confirm a Client's
   email by hand» command of Test 48 C.

## Test 75: recompute the studio facts

Studio Management keeps one fact row per Session and one per Client per
month, recomputed from what Booking already recorded. Nothing here is a
screen: the Administrator triggers it from Swagger, and the worker repeats
the current month every night. Use a disposable database, never
`pilates_dev_sim`.

1. **On demand.** Log in as `paola.mendoza@example.com` (Test 3) and
   `POST /api/v1/administrator/studio-facts/recompute` with
   `{"month":"2026-10"}`. The answer names the month and the counts of
   session and client-month rows written. Run it again: the counts stay
   the same, and the rows' `updated_at` does not move when nothing
   changed. An Assistant (`camila.rojas@example.com`) gets
   `403 studio_access_denied`. A month that is not `YYYY-MM` gets
   `400 invalid_request`.
2. **The nightly pass.** Start the worker against the same database
   (`pnpm --filter @pilates/backend start:worker`). It recomputes the
   current Bolivia month once at startup and then every 24 hours; the log
   names a failure `studio_facts_failed` and the worker keeps running.
3. **What a row holds.** `studio.session_facts` has the Session's date,
   Branch, Class Type, Trainer, capacity, bookings still booked, attended,
   and no-shows. A Session with no Bookings still has a row, with zeros.
   `studio.client_month_facts` has the Client, the month, the plan days
   overlapping that month, classes booked, classes attended, and whether
   she renewed. Cancelled Bookings are not counted. Store-review rows are
   not marked yet (REL-016), so this pass excludes nothing.

## Test 76: read accrued revenue beside cash

Reporte shows the month's cash, the revenue accrued by validity days, and
the cash not yet accrued, plus the classes still owed today. A Payment of
Bs 300 valid from 20 October 2026 to 19 November 2026 accrues Bs 120 in
October (12 of 30 days) and Bs 180 in November; the last month absorbs the
remainder, so the two months sum to Bs 300. Use a disposable database.

1. **The figures.** Log in as `paola.mendoza@example.com` (Test 3) and open
   Reporte. Under «Ingreso devengado» the month stepper starts on the
   current Bolivia month. The three figures are Caja (confirmed Payments
   decided in the month), Devengado (the part of each confirmed Payment
   that falls in the month), and Diferido (cash not yet accrued through
   today, the same number whichever month is selected). «Clases pendientes
   de dar hoy» is the remaining class allowance of Subscriptions covering
   today. Extra classes are not counted (BKM-008).
2. **The worked example.** Confirm a Payment of Bs 300 whose Subscription
   runs from 2026-10-20 to 2026-11-19. October shows Caja Bs 300,00 and
   Devengado Bs 120,00. November shows Caja Bs 0,00 and Devengado
   Bs 180,00. On 23 October, Diferido is Bs 270,00: today is exclusive, so
   3 of 30 days have accrued.
3. **Who may read it.** An Assistant (`camila.rojas@example.com`) and a
   Coordinator get `403 studio_access_denied` from
   `GET /api/v1/administrator/reports/revenue?month=YYYY-MM`. A month that
   is not `YYYY-MM` gets `400 invalid_request`. The Coordinator role is not
   on this branch (IDN-009), so the refusal is the e2e suite's.
   [Pull request #195](https://github.com/DaleneyRuben/emma-pilates/pull/195).

## Test 77: read the month's indicators

Indicadores sits in the sidebar after Reporte. It shows the month's
occupancy, students per class, active clients, and renewal, plus a bar of
classes held for that month and the two before it. The Administrator also
sees the three money figures from Test 76. The Coordinator sees the counts
and never an amount. Use a disposable database.

1. **The counts.** Log in as `paola.mendoza@example.com` (Test 3) and open
   Indicadores. The month stepper starts on the current Bolivia month. The
   four tiles are Ocupación, Alumnas por clase, Clientas activas, and
   Renovación. The chart is «Clases dictadas». A month with no held classes
   says «Sin clases dictadas en este mes.» and draws no chart. A failed
   read says «No pudimos cargar los indicadores.» with «Reintentar».
2. **The worked example.** Two held sessions, capacities 12 and 10,
   bookings at window close 8 and 5, attended 7 and 4, no-shows 1 and 1.
   Ocupación is 59 %. Alumnas por clase is 6,5. The no-show percent, which
   the page does not tile, is 15. Two client-month rows with plan days, one
   of them renewed, give Clientas activas 2 and Renovación 50 %. A client
   is new only when no earlier month had plan days.
3. **Who may read it.**
   `GET /api/v1/administrator/reports/kpis?month=YYYY-MM` returns the counts
   and `cashCentavos`, `accruedCentavos`, `deferredCentavos`, and
   `classesStillOwed` for the Administrator. A Coordinator gets the counts
   only: the JSON has no `*Centavos` key. An Assistant and a Trainer get
   `403 studio_access_denied`. A month that is not `YYYY-MM` gets
   `400 invalid_request`. The Coordinator role is not on this branch
   (IDN-009), so the counts-only response is the e2e suite's cast, and the
   page hides «Bs» when the payload has no centavo keys.
4. **Renewal.** The diagnosis divides by plans that expired this month. The
   fact table cannot see that, so v1 divides by active clients. That
   denominator is an open question; do not treat 50 % as the coordinator's
   bonus base.
