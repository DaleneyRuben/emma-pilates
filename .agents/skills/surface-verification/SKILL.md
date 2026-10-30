---
name: surface-verification
description: How to run the coding standards' surface verification fast on the iPhone 16 Pro and iPad Pro 11 Simulators, the Android emulator, and the admin web at 1440 and 420 px. Read before starting an API, Metro, a Simulator, the emulator, Maestro, or Playwright for a walk, and before writing walk evidence.
---

# Surface verification

The coding standards (`«Surface verification»`) say **what** to verify: every changed journey on the iPhone 16 Pro, the iPad Pro 11-inch (M4), and the Android emulator for each app touched, and the admin web at 1440 and 420 px. This skill says **how** to do it without losing hours to the environment. The step-by-step reference stays in `docs/testing-guide.md`:
- Test 5A: fixtures
- Test 19: Maestro suites
- Test 31: Playwright
- Test 45: development builds
- Test 46: the worker and ports

Three rules make walks fast:

1. **Write the code first, verify in one batch.** Finish every fix with its red/green tests, lint and typecheck. Then run one verification batch for the whole branch or stack. Do not interleave coding and device walks.
2. **Automate the walk.** A Maestro flow or a Playwright script runs the same steps on every device and again after every fix. Driving a device by hand is the slowest and least reliable option here.
3. **Seed through the API, never by hand.** Use the fixture Accounts and the seed scripts. Never create Accounts by tapping and never write rows into the database to fake a state.

**If one environment problem blocks you for more than 15 minutes, stop and report it** with what you tried. Do not keep retrying silently.

## 1. Databases

PostgreSQL 18 runs on **port 5433** (Homebrew `postgresql@18`). Port 5432 is PostgreSQL 14 and belongs to other projects: never touch it. Every `DATABASE_URL` carries the user (`postgresql://$USER@localhost:5433/<db>`); without it, `prisma migrate deploy` fails with P1010.

**One golden database per day, then copies.** Migrating and loading the fixtures takes minutes; a copy takes about a second.

```sh
# once, from an up-to-date main (rebuild it each morning: fixture Sessions start the day they are loaded)
createdb -h localhost -p 5433 pilates_golden
DATABASE_URL=postgresql://$USER@localhost:5433/pilates_golden pnpm --filter @pilates/backend exec prisma migrate deploy
DATABASE_URL=postgresql://$USER@localhost:5433/pilates_golden pnpm --filter @pilates/backend db:fixtures

# per branch walked, a disposable copy named after the item
dropdb --if-exists -h localhost -p 5433 pilates_fix001_dev
createdb -h localhost -p 5433 -T pilates_golden pilates_fix001_dev
DATABASE_URL=postgresql://$USER@localhost:5433/pilates_fix001_dev pnpm --filter @pilates/backend exec prisma migrate deploy   # only if the branch adds migrations
```

- `createdb -T` is refused while anything is connected to the template. Nothing may hold a connection to `pilates_golden`; never point an API at it.
- Each walk mutates its copy: it marks notifications read, uses classes, and closes Accounts. For a clean rerun, make a fresh copy instead of repairing rows.
- Integration tests are separate. They need `TEST_DATABASE_URL` on 5433, and the harness requires the `pilates_test_` prefix. Keep `pilates_test_fixtures`. Drop your own test databases when done.
- `pilates_dev_sim` is the shared development database. Do not walk destructive journeys on it, such as closing an Account, a Cash Close, or erasing a contact.

## 2. Servers: your own ports, started once

Sibling sessions use 3100/3101, 5173 and 8081–8085. Pick your own ports for the batch, record every PID, and keep the processes up until the batch ends.

| Process | Command (from the branch's worktree) |
| --- | --- |
| API | `pnpm --filter @pilates/backend build`, then from `apps/backend`: `PORT=3130 DATABASE_URL=… ADMIN_WEB_TRUSTED_ORIGINS=http://localhost:5174 node --env-file=.env dist/src/main.js` |
| Worker | from `apps/backend`: `DATABASE_URL=… node --env-file=.env dist/src/worker-main.js` |
| Client Metro | from `apps/client-mobile`: `EXPO_PUBLIC_API_URL=http://127.0.0.1:3130/api/v1 ./node_modules/.bin/expo start --dev-client --port 8186 < /dev/null` |
| Staff Metro | the same from `apps/staff-mobile`, port 8187 |
| Admin web | `ADMIN_API_PROXY_TARGET=http://127.0.0.1:3130 pnpm --filter @pilates/admin-web dev --port 5174` |

- **The worker is required** for anything with an image or a receipt (uploads stay processing without it), captured emails and tokens (`apps/backend/.data/email-capture/`), expiry sweeps, reminders, and Session extension. It also cancels any Session with fewer than 2 Bookings three hours before it starts, so book every near-term Session you seed.
- **Never start Metro with `CI=1`.** It disables reloads, so every run after the first tests stale code. If the bundle looks stale, restart with `--clear`; the first bundle then takes about 2 minutes, so run the flow twice.
- Start the two Metro servers a few seconds apart. Starting them together races on Expo's code-signing settings file (HTTP 500 ENOENT).
- **To walk another branch,** switch the database copy and restart only the API and the worker from that branch's worktree. Metro reloads JavaScript by itself; the apps need no new build.
- **Stop only your own processes, by PID.** Never use `pkill -f`, `killall` or `pgrep … | xargs kill`: sibling sessions run the same commands. Before a batch, list leftovers from an earlier session of yours (`ps -Eww -o pid,etime,command= -p <pid>`) and stop them.
- Run servers from the branch's own worktree, never from the shared checkout: another session can switch its branch under a running server.
- API logs are JSON. When a seed call fails, read `res.statusCode` and the problem code there.

## 3. Devices: boot once, install once

| Device | Id |
| --- | --- |
| iPhone 16 Pro (iOS 18.2) | `49C1E5FE-…`, never a 17 Pro or 17 Pro Max |
| iPad Pro 11-inch (M4) | `57B2FBC4-2D73-4063-B00D-5D882C233AA2` |
| Android | AVD `Medium_Phone_API_36.1`, `emulator-5554` |

**The lock.** The Simulators and the emulator are shared. Take the lock once for the whole batch, not once per PR:

```sh
mkdir /private/tmp/pilates-sim.lock && echo "<item or stack id>" > /private/tmp/pilates-sim.lock/owner
# … the whole batch …
rm -rf /private/tmp/pilates-sim.lock
```

If the lock exists, retry every 2 minutes. A lock older than 2 hours whose owner is not running may be removed. Before driving a device, check that no sibling Maestro uses it (`pgrep -fl maestro.cli.AppKt` shows the `--udid`).

**Boot.**
- iOS: `xcrun simctl boot <udid>`, then `xcrun simctl bootstatus <udid> -b`. If SpringBoard crashes ("The system shell probably crashed", `openurl` times out), run `shutdown`, then `boot` + `bootstatus -b` again. `open -a Simulator` does not work on this Mac, but headless Simulators are fine.
- The iPad sometimes hangs at «Waiting on Data Migration». Run `shutdown`, then a plain `boot`, and wait for a bright screenshot (`xcrun simctl io <udid> screenshot`).
- Android: `~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot`. With the hardware GPU it can hang on a black screen after «Enabling Vulkan». Record the PID. A wedged emulator (ANR dialogs, «Service package: not found») needs `adb emu kill` and a fresh boot.
- Android ports: `adb reverse tcp:3130 tcp:3130`, plus one `adb reverse` per Metro port.
- macOS has no `timeout`. Wrap `simctl` calls that can hang (`openurl` right after a boot) in a bounded call, and kill hung `simctl` processes you started.

**Builds.** The Test 45 **development builds** are already installed: `com.emmapilates.client` and `com.emmapilates.staff`, each with `EXDevLauncher`. They load JavaScript from your Metro, so **a JavaScript change never needs a new build.** Build only after a native change (a new native module, plugin, or permission): each EAS build spends one of the month's 15 per platform.
- Before a run, check that a sibling session did not install a store build over a development build: `ls <app container> | grep EXDevLauncher` on iOS, `dumpsys package … | grep devlauncher` on Android.
- Cached copies of the development builds live in `/private/tmp/claude-501/builds/`.

**Device settings.**
- Before a run, set the text size to the default: `xcrun simctl ui <udid> content_size large`.
- Never write UIKit preferences by hand. A misspelt content-size category makes the app show a red warning over Login.
- Never use Maestro `clearState` on a development build: it removed the app binary from the Simulator.
- To relaunch while keeping the session, use `stopApp` + `launchApp` + the open link.

## 4. Maestro

**Setup.**
- Maestro needs Java. The Mac has none on `PATH`, so first run:
  `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
  Without it the run exits 1 in under a second with «Unable to locate a Java Runtime».
- After a Simulator reboot, set `MAESTRO_DRIVER_STARTUP_TIMEOUT=300000` (400000 for the iPad).

**Flows that already exist.**
- `apps/client-mobile/.maestro/` and `apps/staff-mobile/.maestro/` hold the critical journeys.
- Their `subflows/` handle login, iOS's «Open in …?» prompt, the developer-menu intro, the notification sheet, a photo pick, and the developer gear (`park-dev-gear.yaml`).
- Reuse them with `runFlow`. A scratch flow outside the app folder can `runFlow` them by absolute path.

**One flow, three devices.**

```sh
cd apps/client-mobile
run() { maestro "$@" test -e APP_ID=com.emmapilates.client -e PASSWORD=emma-local-2026 \
  -e API_URL=http://127.0.0.1:3130 \
  -e "APP_LINK=emmapilates-client://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8186" \
  .maestro/<flow>.yaml; }
run --udid 49C1E5FE-…        # iPhone 16 Pro
run --udid 57B2FBC4-…        # iPad Pro 11
run --device emulator-5554   # Android
```

- zsh does not word-split a `$VAR` holding flags, so keep the repeated command in a function.
- A flow's `env:` default wins over `-e`: put the Account in the flow, not on the command line.
- For a folder run, `config.yaml` pins `flowsOrder`, because Maestro's own order is not the file order.

**Order the batch for speed.** Run every changed flow on the iPhone first, and fix whatever it finds. Then run the same files, unchanged, on the iPad and on Android.

**Seed in the flow, through the API.**
- `apps/client-mobile/.maestro/scripts/seed.js` (Maestro `runScript`, GraalJS: `http.request`, `json()`, `output.x`) already seeds a full Session and a Session about to start. Add a mode there for your state, for example a founder cash sale, an expired intent, a paid Evaluation, or a guest pass.
- `apps/staff-mobile/.maestro/seed.mjs` (Node) covers what GraalJS cannot do, such as a binary receipt upload.
- Fixture Accounts (password `emma-local-2026`), from Test 5A:
  - Lucía: active Plan, 5 of 8 classes left.
  - Valeria: Plan ends in 3 days.
  - Isabel: active Plan with 0 classes.
  - Sofía: expired Plan.
  - Mariana: never bought a Plan.
  - Staff: Camila (Assistant), Paola (Administrator), Carolina (Coordinator), Emma Vargas (Trainer), Gabriela (Nutritionist).
- Booking calls need `Idempotency-Key: <uuid4>`.
- `POST /administrator/sessions` (5–240 minutes) gives a class that ends within minutes. Centro holds one Session at a time, and cancelled Sessions still block the slot.

**Selectors that work here.**
- Text inside a `Pressable` or card that has an `accessibilityLabel` is invisible to Maestro: assert or tap the label. A heading with a label shows only the label.
- Selectors are case-insensitive regexes. Escape `?` and `(`, or use `.*` (`«¿Olvidaste tu contraseña.*»`).
- For a value inside a composed label, such as a price, use a regex: `assertVisible: ".*476.*"`. If even that fails, the value is not exposed to VoiceOver or TalkBack either. Keep a screenshot as evidence and report the accessibility gap.
- A placeholder stays in the hierarchy after typing, so target a field by its placeholder only once.
- Below the fold, Maestro reports elements as visible and taps nothing. Run `swipe` `50%,70%` → `50%,30%` first. `scrollUntilVisible` can tap the tab bar instead.
- Eight-second notices («Reserva confirmada») can expire behind the notification sheet. Assert the lasting result instead, such as the booking card.
- iOS «Save Password?»: add an optional `tapOn: "Not Now"`. The next tap after it is often swallowed.
- iPad: never type through the Simulator control tool, because it drops characters. Log in with the Maestro `subflows/login.yaml`. Use `tapOn: "Hide keyboard"` to close the keyboard (`hideKeyboard` can tap the wrong thing).
- Android:
  - The dev launcher can ignore the first open link while it starts. Send it again after 8 s, and accept an optional `tapOn: "http://.*:81.."`.
  - `clearKeychain` does not sign out on Android. If a session is already open, run `adb shell pm clear <appId>` before the flow, or sign out from the profile screen first.
  - If `inputText` fails with «Maestro IME is not active», use `adb shell input text` (ASCII only).
  - If Maestro's driver will not start, run `adb kill-server && adb start-server` once.
  - Photo picker: tap «Photo taken on.*», then «Done».
- The developer gear covers the top-right control. Park it with `park-dev-gear.yaml` (the `gearshape.fill` element swipe). On the Android Staff app, open «Tools», then the «Tools button» toggle, then «Close».
- Photo flows need a photo in the library: `xcrun simctl addmedia <udid> photo.jpg`, or `adb push` on Android.

**When the iOS driver hangs.** If status checks fail for minutes, kill the `xcodebuild` you started and run `xcrun simctl uninstall <udid> dev.mobile.maestro-driver-iosUITests.xctrunner` and `dev.mobile.maestro-driver-ios`, then rerun. Maestro reinstalls the driver in about a minute.

**Screenshots.**
- `takeScreenshot: <item>-<step>` takes only a relative name. Run Maestro from the folder where the shots should land, or find them under `~/.maestro/tests/<run>/<flow>/`.
- Progress for a background run is in `~/.maestro/tests/<run>/maestro.log`.

**Commit the flows that prove a critical journey.** Add or extend a flow under the app's `.maestro/` in the same PR, and register it in `config.yaml` `flowsOrder`. One-off checks stay in a scratch folder and are never committed.

## 5. Admin web

- `pnpm test:admin-e2e` builds the backend and the admin web, then runs the Playwright journeys against a disposable database. Run it once per head you report.
- Playwright's `getByLabel` matches substrings, so a new `aria-label` that contains an existing field label breaks every journey. Run the suite before pushing any admin UI change.
- For the changed page, write a **scratch** Playwright script that is never committed:
  - log in as Paola;
  - open the page at a 1440 px viewport, do the action, and take a screenshot;
  - repeat at 420 px, opening the drawer with «Abrir menú».
  It is faster than driving a browser by hand, and you can rerun it after every fix.
- The admin typecheck is `pnpm --filter @pilates/admin-web typecheck` (`tsc -b`). `tsc --noEmit -p .` misses errors that break the e2e build.

## 6. Backend-only changes

Exercise the API journey with curl or Swagger against your copy. If a screen shows the result (an amount, a list, an error code), walk that screen too. Check how a new problem code reads in the apps already installed in the stores (ADR-0016): an unknown code shows the generic retry message.

## 7. Evidence

A walk proves something only when the state the change is about is on the screen. A walk on an empty list, or on a screen the change does not touch, proves nothing: seed the state, and show the screen before and after the action.

In the PR body (and the backlog Evidence column), give:
- the **head SHA** walked, which must be a commit on the pushed branch, not a pre-rebase hash;
- the commands run and their results: tests, lint, typecheck, `pnpm check:api`, the migration check, and `pnpm test:admin-e2e`;
- per app and per device or width: the flow file, its exit status, and what it showed;
- the screenshot paths, named `<item>-<step>`;
- what was not verified and why. «Not verified» is not acceptable for a surface the change touches: keep the PR a draft until it is done.

## 8. Clean up

At the end of the batch, and before reporting:
- stop your processes by their PIDs;
- release the lock;
- drop your `pilates_<item>_dev` copies and `pilates_test_<item>` databases;
- leave the devices booted, unless you booted them and nobody else uses them;
- revert any temporary change that is not part of the PR, such as a debug line or a log toggle, and confirm with `git status` that only the PR's files changed.
