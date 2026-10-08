# Beginner testing guide

This guide explains what you can test in the Pilates project today. It assumes
you are starting with no project knowledge.

## What is ready to test?

| Area                         | What you can test now                                                                                                           | Current limit                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client mobile app            | Use the real email-only Login, registration, pending-email, recovery-request, verification, activation, and password-recovery screens in the iOS Simulator, then Home, class browsing and booking, Mis reservas, history, Plans and transfer payment, Mi plan, referrals and Credit, Perfil with the profile photo, the inbox, and password change with the fixture Accounts (Tests 5, 9, 10); change the login email from Editar perfil and confirm it from the captured link (Test 34); the Promotions carousel on Inicio once the admin web publishes a Promotion (Test 18) | Push notifications are not built yet; Evaluations are reached from Perfil and Home (Tests 15, 18) |
| Staff mobile app             | Open the separate Staff Login app in the iOS Simulator, log in with a fixture Staff Account, and verify that Client registration is unavailable; review transfers and cancel a Session as the Administrator (Test 10); search, invite, book, and take cash for a Client as the Assistant (Test 11); see the agenda and record attendance as a Trainer (Test 12) | — the Nutritionist agenda and Mi disponibilidad work too (Test 15) |
| Nutritionist Evaluations (API) | Publish, replace, and end Availability Blocks as the fixture Nutritionist; browse slots, book, list, and cancel Evaluations as a Client; see the agenda and cancel as staff through Swagger or curl (Test 7) | The same journeys work in both apps (Test 15); reminders need the worker and real time to pass |
| Local development fixtures   | Load deterministic Branches, Plans, Class Types, Sessions, Subscription states, referrals, the Nutritionist's Availability Blocks, and active Client and Staff Accounts with one command | Sessions beyond the fixtures' first 30 days appear only while the worker runs (it extends Session Schedules hourly); the fixtures ship no Promotion or receipt image (create them in the admin web, Test 33, or through Swagger, Test 32) |
| Backend health               | Confirm that the API is alive, ready (PostgreSQL reachable and every migration applied), and passing the read-only smoke checks; read its JSON request logs | The worker is checked only through its heartbeat log; email, push, and object storage are not part of readiness |
| API documentation            | Open Swagger and inspect or send requests to every current endpoint                                                             | Swagger does not make unfinished journeys complete                                                                                                            |
| Client registration          | Register from the mobile app or Swagger and use change-email, resend, and cancellation actions; in the app «Revisa tu correo» survives a restart until you verify, cancel, or log in (Test 5) | The worker writes every captured email under `apps/backend/.data/email-capture/` (Test 34); the link opens nothing on the Simulator until LNK-001 wires universal links, so paste its token into Swagger |
| Pending registration actions | Correct the email, request another verification email, or cancel using the continuation returned by registration                | Resend deliberately gives the same neutral response whether it sends or suppresses an email                                                                   |
| Email verification           | Confirm that an unknown token returns `invalid`; complete a real verification with the token from `.data/email-capture` (Test 34) | The link is a URL the Simulator cannot open yet (LNK-001)                                                                                                    |
| Login and logout             | Log in from the mobile app, restore the protected credential at startup, inspect identity in Swagger, and revoke it             | Log out from Perfil with a confirmation in both apps (Test 9)                                                                                                  |
| Login throttling             | Confirm repeated failures temporarily stop password checks and return `Retry-After`                                             | Use a made-up email so you do not throttle an Account you need                                                                                                |
| Email request limits         | Fill the device or network budget for registration, resend, email correction, and recovery: the API answers `429` `authentication_email_throttled` with `Retry-After`, and the apps and admin web show «Demasiadas solicitudes…» with the wait (Test 5 G) | Every admitted request counts, even one for an unknown address or a suppressed email; reset by marking your local `email_requested` rows deleted |
| Account security             | Request recovery from mobile, reject expired links before password entry, and complete activation and recovery with the token captured under `.data/email-capture` (Test 34) | The link screens themselves still open only through automated tests until LNK-001                                                        |
| Automated checks             | Run mobile identity, backend, API-contract, type, lint, and build checks                                                        | Database integration tests require Docker Desktop or an explicitly disposable PostgreSQL test database                                                        |
| Admin web                    | Log in as the fixture Administrator, see the neutral rejection and the throttling countdown, request recovery, use the user menu, change the password, and log out (Test 24); then open the admin shell: the sidebar sections, the top bar, the Branch selector, and the narrow-browser drawer (Test 23); build the week in Horario (one-off Sessions, weekly schedules from a date, Trainer swaps, last-resort cancellation) and manage Sucursales, Tipos de clase, and Planes (Test 25); look up Clients and create, change, and deactivate Staff Members, and correct, resend, reopen, or cancel a pending invitation (Test 26); review, confirm, and reject transfer Payments with the enlarged receipt (Test 27); run Supplies, Withdrawals, payroll, Expenses, and Expense Categories (Test 28); read the Evaluation, Referral, and Credit lists (Test 29); read the income and expense report for every Branch or one (Test 30); run the Playwright critical journeys against the built app and a disposable database (Test 31); create, publish, reorder, unpublish, and delete Promotions with their images (Test 33) | Activation and recovery links are read from `.data/email-capture` (Test 34), not from a mailbox; the Playwright journeys run in Chromium only |

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

Both app suites fail a spec on any React `act()` warning (MOB-054): each
`jest.setup.ts` declares the act environment, delivers TanStack Query's
notifications synchronously so a query settles inside the awaited call that
produced it, and collects every «not wrapped in act», «not configured to
support act», and «overlapping act» line from `console.error`, which the
`afterEach` and `afterAll` hooks expect to be empty. A spec that lets one
through fails with the warning printed above it; the fix is always to `await`
the RNTL 14 call that is still in flight (`render`, `fireEvent.*`, `cleanup`,
`rerender`, `unmount` are asynchronous) or to `waitFor` the state the screen
is still loading. All three mobile suites exit on their own; the `--forceExit`
that CI passes is harmless and no longer needed.

Both app suites run against a frozen clock (MOB-051): their Jest config fakes
`Date` only, at 2026-10-08 14:00 UTC (10:00 in Bolivia), so a spec that
builds a Session «in one hour» or an Evaluation «today at 23:00» means the
same thing whenever you run it; timers, `waitFor`, and the other
asynchronous APIs stay real. Specs that need a particular instant still set
it explicitly in their fixtures.

The same three packages are linted and format-checked (MOB-050):

```sh
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
format` rewrites the files. Jest never runs ESLint, so a lint error does not
fail the tests; the project commit skill lints every staged TypeScript file,
and CI's quality-mobile job runs both checks before the suites.

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
TEST_DATABASE_URL="postgresql://$USER@localhost:5432/pilates_test_admin" \
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
(EXT-004). It checks; it deploys nothing, and it needs no secret. Seven jobs
run as three independent chains, one per surface, each job on a fresh Ubuntu
runner after the shared setup in `.github/actions/setup/action.yml` (Node from
`.nvmrc`, pnpm from the root `packageManager` field, cached pnpm store,
`pnpm install --frozen-lockfile`, `prisma generate`):

- **quality-api** (backend lint, typecheck, and build; api-contracts typecheck
  and build) → **contracts** (`check:api`, `check:api-compat`) → **api** (the
  backend unit, e2e, and integration suites against a `postgres:17-alpine`
  service container; the integration suite runs through `TEST_DATABASE_URL`
  on a `pilates_test_ci` admin database that lives and dies with the runner);
- **quality-web** (admin-web lint, `format:check`, typecheck, build) →
  **web** (the admin-web Jest suite);
- **quality-mobile** (lint, `format:check`, and typecheck of mobile-core,
  client-mobile, and staff-mobile) → **mobile** (their three Jest suites).

A job runs only when the job before it in its chain passed, so a lint or type
error costs one two-minute job and the tests never start; a stale contract
stops the api chain before the database run. On a pull request a first
`changes` job also reads the pull request's whole list of changed files and
starts only the chains of the surfaces it touches: `apps/backend/**` for api,
`apps/admin-web/**` for web, the three mobile packages for mobile,
`packages/tooling/**` for mobile (its only consumers today),
`packages/api-contracts/**` for all three (every contract change touches the
committed generated client), and the shared files (`package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, `.github/**`) for all
three. A docs-only pull request therefore runs nothing, and a backend fix that
does not change the contract runs the api chain alone. A push to `main`
always runs everything. Jobs that never started show as skipped. A clean run
of all three chains takes about nine minutes of wall clock, set by the api
chain.

The Jest steps run with `--ci --forceExit`: every one of these suites passes
and then lingers on an open handle on Linux, the admin web for good and each
mobile package for about five minutes, so Jest is told to exit once the tests
are done. The integration step raises Node's heap
(`NODE_OPTIONS=--max-old-space-size=4096`) because the in-band ESM run grows
past the runner's default limit; the backend scripts keep the shell's
`NODE_OPTIONS` next to their own `--experimental-vm-modules` for that reason.

A newer push to the same branch cancels the run in progress. To read a failed
run, open the pull request's "Checks" tab or run
`gh run list --branch <branch>` and `gh run view <run-id> --log-failed`: the
failing job names the script that failed, and the log of that step is the same
output you would see locally from the commands in the subsections above. Each
job has a timeout (15 minutes, 20 for api), so a hung step fails instead of
waiting forever.

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

Tap **Cerrar sesión**. The app asks "¿Cerrar sesión?" first; **Cancelar** keeps
you signed in and **Cerrar sesión** returns to Login.

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

### E. Cancel a Session as the Administrator

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
that already started (a Client cannot be booked into one, MOB-044). Tap a Session: the detail shows Trainer, Branch, date, time, duration,
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
from there goes back to **Buscar cliente**. A Client with an active Plan
answers "El cliente ya tiene un plan activo."

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

The admin web now does all of this on the Personal page (Test 26); to try
the API directly, use Swagger or curl as `paola.mendoza@example.com` (Test 3
shows how to log in and authorize):

1. `GET /api/v1/administrator/staff-members` lists every Staff Member with
   `page`, `pageSize` (up to 100), and optional `role`, `branchId`, and
   `status` (`pending`, `active`, `deactivated`) filters.
2. `POST /api/v1/administrator/staff-members` with a name, email, Role, and
   Branches creates a pending Staff Member and queues the Activation Link
   email. An Administrator is created without Branches (they hold every
   Branch); every other Role needs at least one active Branch.
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
   "Venció el …", and **Comprar un plan**.
3. In **Perfil → Notificaciones**, tapping an Evaluation notice opens Mis
   evaluaciones, a class-cancelled notice opens Mis reservas, a payment notice
   opens the payment status, and a Plan notice opens Mi plan.

In the Staff app, a Trainer's "Tu clase … se canceló" notice and a
Nutritionist's Evaluation notices open **Mi agenda**.

## Test 19: run the mobile critical journeys and the release smoke check

With fixtures freshly applied (Test 5A), the two Promotions of Test 33
published (the Home flow asserts «Nueva sala de Reformer en Urubó» and «Clases
de Barre los sábados»; pass `-e PROMOTION_1=… -e PROMOTION_2=…` for other
headlines), the backend running, and both apps served (client Metro on any
free port, staff on 8082), run the committed Maestro journeys from each app
folder:

```sh
cd apps/client-mobile
maestro test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8081 \
  -e PASSWORD=emma-local-2026 .maestro
cd ../staff-mobile
maestro test -e APP_ID=host.exp.Exponent -e APP_LINK=exp://127.0.0.1:8082 \
  -e PASSWORD=emma-local-2026 .maestro
```

The Client suite books and cancels a class, walks Home with its carousel, Mi
plan, and the notification destinations, and books and cancels an Evaluation. The Staff suite
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
Google Fonts; before you sign in it reads "Iniciar sesión · Emma").
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
DATABASE_URL="postgresql://$USER@localhost:5432/pilates_dev_sim" ADMIN_WEB_TRUSTED_ORIGINS="http://localhost:5173,http://localhost:4173" pnpm dev:backend
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
   "¿Cerrar sesión?" with **Cancelar**, which has focus (press Enter to keep
   your session). Confirm, and you are back on Login;
   the session cookie is gone and going back to a page asks you to log in.
6. **Throttling.** On Login, submit a made-up email such as
   `nobody.admin-login@example.com` with any password six times. The seventh
   try shows "Demasiados intentos. Intenta de nuevo en un momento." with a
   countdown from the server (0:30 at first) and a disabled button.
7. **Recovery.** **¿Olvidaste tu contraseña?** opens **Recuperar contraseña**.
   Any email gives the same "Revisa tu correo" state ("El enlace vence en 30
   minutos.") whether or not it belongs to an Account. Once the device or
   network budget is full (Test 5 G), a note with a clock above the field
   reads "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya
   recibiste un enlace, sigue sirviendo." with "Podrás pedirlo en m:ss." and
   **Enviar enlace** stays disabled.
8. **Links.** Open
   [http://localhost:5173/crear-contrasena?token=not-a-real-link-secret](http://localhost:5173/crear-contrasena?token=not-a-real-link-secret):
   "Este enlace no es válido". With the worker running, real links are in
   `apps/backend/.data/email-capture/` (Test 34): paste a captured activation
   or recovery link's `token` after `?token=` to see the form, or a used or
   superseded one for "Este enlace ya no es válido". An activation link whose
   invitation the 30-day cleanup removed (to fake one locally, set that
   pending Account's `pending_expires_at` to the past in `pilates_dev_sim`)
   shows "Esta invitación ya no está activa" with **Volver a iniciar
   sesión**.
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
   grid for it without leaving the page: "Cargando el horario…" first, then
   that Branch's Sessions, never the previous Branch's under the new name.
2. **Nueva sesión.** **+ Nueva sesión** opens the 408 px side panel. **Una sola
   vez** asks for Tipo de clase, Entrenadora (only Trainers assigned to the
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
   deactivated account does not offer.
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
paste its `token` into the admin web's link page (Test 24, step 8) to activate
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
   (`?status=all`). Each row shows the Client, the Plan, the amount she
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
`playwright test` in `apps/admin-web`. Its global setup prints the two
process ids, the ports, and the `pilates_test_*` database name it made, and
its teardown stops both servers and drops that database. The ten journeys
take about twenty seconds:

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

To run one file or watch the browser, use Playwright directly from
`apps/admin-web`, for example
`pnpm exec playwright test e2e/session.spec.ts --headed`. A failed journey
leaves a screenshot and a trace under `apps/admin-web/test-results/`
(`pnpm exec playwright show-trace <file>` opens it). The two servers'
stderr goes to `apps/admin-web/test-results/e2e-backend.stderr.log` and
`e2e-preview.stderr.log`, so a backend that crashed at startup ("The backend
did not answer…") can be read there; `E2E_DEBUG=1 pnpm test:admin-e2e`
prints it in the terminal instead. If a run is killed
before its teardown, stop the servers it left (`lsof -ti tcp:3101`,
`lsof -ti tcp:4173`) and drop its database (the name is in the run's first
line; `psql -l | grep pilates_test_` lists them). The teardown itself waits
at most five seconds for each server before killing it.

Set `TEST_DATABASE_URL` to another `pilates_test_*` admin database, or
`E2E_API_PORT` and `E2E_WEB_PORT` to other ports, when the defaults collide
with something on your machine.

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
the 24-hour cleanup (Test 13's worker) removes them.

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
worker refused waits under `pending/` for the 24-hour cleanup (Test 13).

## What you cannot test yet

The following are not ready for manual product testing:

- opening an emailed link in the mobile apps: the captured links under
  `apps/backend/.data/email-capture/` (Test 34) work through Swagger and the
  admin web's link page (Test 24), but the Simulator cannot open them until
  LNK-001, so the mobile link pages (activation, recovery, and their
  expired and removed states) are covered by the automated tests;
- «El registro venció» on a device, which needs seven days to pass after the
  registration (the automated tests show it);
- enforcing a SecureStore Face ID prompt in Expo Go or the iOS Simulator;
- opening a production Universal Link or Android App Link before the public
  mobile-link domain and native association files are configured;
- push notifications (the in-app inbox works, see Test 9; buying a Plan
  works, see Test 10; the Promotion API works through Swagger, see Test 32,
  the admin web manages Promotions, see Test 33, and the Client app shows
  them, see Test 18);
- the admin web on a real Vercel preview or production origin, so the proxy,
  cookies, and trusted origins of ADR-0084 are only proven locally (EXT-003);
- the Playwright journeys in Firefox or WebKit (only Chromium is installed);
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
the link) and `email_change_notice` to the current one (no link).

### B. Confirm the change

The Simulator cannot open the link yet (LNK-001). Copy the `token` from the
`email_change` file's `link` and send it to `POST /api/v1/email-changes` as
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
(Test 24, step 8). The directory is ignored by Git and
safe to delete.

Since EML-001 each file is the real message: `subject`, `text` (plain text),
and `html` (a simple card in the design palette with the link as a Palo de
rosa button and as a bare URL). The subjects are «Confirma tu correo para
activar tu cuenta» (24 horas), «Activa tu cuenta en Emma Pilates Studio»
(7 días), «Crea una contraseña nueva» (30 minutos), «Confirma tu correo
nuevo» (24 horas), and, for the current address of an email change, «Alguien
pidió cambiar el correo de tu cuenta» (no link). Links start with
`AUTHENTICATION_LINK_BASE_URL` (`https://links.emmapilates.test` locally; the
real domain comes with LNK-001). Open the `html` value in a browser to see
the card; the copy comes from design follow-ups 33–38 and the IDN-008 rule.

## Test 35: close a Client Account

BE-007 lets a Client close their own Account (Perfil → «Cerrar mi cuenta»,
screen 24) and an Administrator close a Client's (AW22 → «Cerrar cuenta»).
Closing is permanent, so use a disposable database, not the one you keep:

```sh
createdb -T pilates_dev_sim pilates_test_closure
DATABASE_URL="postgresql://$USER@localhost:5432/pilates_test_closure" \
  pnpm --filter @pilates/backend start
```

1. Log in as `sofia@example.com` (Test 3 shows how) and read
   `GET /api/v1/clients/current/credit`: Bs 60 available.
2. `POST /api/v1/accounts/current/closure` with `{"password": "wrong"}` returns
   `400` `current_password_incorrect`; with `{}` it returns `400`
   `invalid_request`.
3. Repeat with the fixture password. It returns `200` with the counts:
   `forfeitedCreditCentavos: 6000` and the classes left on the ended Plan.
4. The old credential now returns `401`, and logging in again with the same
   email and password returns `401`.
5. Log in as `paola.mendoza@example.com` and
   `POST /api/v1/administrator/clients/{id}/closure` for `lucia@example.com`'s
   Client id (`GET /api/v1/administrator/clients?q=lucia` before closing). A
   second call returns `404` `client_not_found`, and Lucía no longer appears in
   the Clientes list.
6. In `psql`, see the two `account.closed` audit records (actor role empty for
   Sofía's own closure, `administrator` for Lucía's) and Sofía's
   `account_closure` ledger entry of 6000.
7. A Client with a transfer Payment awaiting review gets `409`
   `closure_payment_pending` and nothing changes; confirm or reject the Payment
   in Pagos first (Test 27).

In the Client app (API on the copy, `EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1`),
log in as `sofia@example.com`, open Perfil, scroll to the Error-tone
«Cerrar mi cuenta» link under «Cerrar sesión», read the consequences (her
plan ends and her Bs 60 of Credit is forfeited), type the password, and
confirm: the app returns to Iniciar sesión with «Cerramos tu cuenta. Gracias
por entrenar con nosotras.». The Maestro flow `.maestro/close-account.yaml`
does the same.

In the admin web, open a Client in Clientes and press «Cerrar cuenta» at the
foot of the panel: the dialog lists what applies to her, and after
confirming the list reloads without her under «Cuenta de … cerrada.». For
`isabel@example.com`, whose transfer awaits review, the dialog refuses at
once and links to Pagos.

Drop the copy afterwards: `dropdb pilates_test_closure`.
