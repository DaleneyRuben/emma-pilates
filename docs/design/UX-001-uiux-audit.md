# UX-001 · UI/UX audit of the three surfaces

Date: 2026-10-22. Scope: the Client app, the Staff app, and the admin web as they ship on `main` (b5ef0af6), walked as a real user against a fresh copy of the development fixtures (`pilates_ux001`, API and worker on port 3140), on the iPhone 16 Pro and the iPad Pro 11 Simulators (Expo Go), the Android emulator (local development builds), and Chromium at 1440, 1024, and 420 px (Vite dev server on port 5180). The bar is the user's: the product should look very professional, polished, and smooth before real Clients see it.

Screenshots live in the session scratchpad (`shots/`); each finding names its file. The ones that matter most are attached to the session report.

## Executive summary

**Verdict:** the product is close. Visual consistency is strong: every screen on the three surfaces draws the palette, the two typefaces, the card, the pills, the chevrons, and the empty states the design system specifies, on the phone, the tablet, and Android alike. The weak spots are not visual, they are behavioural: a few flows let the user walk into a refusal that the app already knew about, native platform dialogs break the palette on Android, data goes stale between tabs, and the Spanish register drifts between surfaces (gender of nouns, formats). None of them is large; together they are what separates "built" from "polished".

The ten changes with the most impact, in order:

1. **Replace the two native `Alert.alert` dialogs with the design's confirmation sheet** (Staff «Ver la app como…» confirmation, and «Cerrar sesión» in both apps). On Android they render as a Material dialog with teal buttons, the only off-palette element in the product. (UX-002)
2. **Refuse early, not late, in the Assistant flows.** The Assistant can open a Session the Client already booked and only learns it after tapping «Reservar»; «Registrar pago en efectivo» opens the plan picker and the cash confirmation for a Client whose Plan is active and refuses on the last tap. The overview already knows both facts. (UX-003)
3. **Refresh Client tab screens on focus and add pull to refresh to every list.** Mis reservas and Mi plan keep the data of the first visit until the app restarts; a booking made at the front desk never appears. Only Home offers pull to refresh. (UX-004)
4. **Settle the Spanish register once and apply it everywhere.** The Staff app says «El cliente ya tiene un plan activo» and «1 cliente afectado» while the same app says «La clienta verá este mensaje» and «Las clientas eligen…»; the admin web labels the Role «Entrenador» and «Administrador» while every other surface says «Entrenadora» and «Administración»; Mis referidos says «un amigo» under a Home tile that says «amigas». (UX-005, with a design follow-up for AW23/AW24)
5. **Draw the payment status with a line icon, not an emoji.** «Tu pago está en revisión» shows the ⌛ emoji on an Advertencia disc; the system allows only stroked line icons. (UX-006)
6. **Give the Trainer agenda its role eyebrow and weekday names.** `S02` draws «Entrenadora» over «Hola, Camila» and «Mié 12» day chips; the app draws neither, while the Nutritionist root draws its eyebrow. (UX-007)
7. **Own the date and time formats on the admin web.** The native date and time inputs follow the browser's OS locale (`mm/dd/yyyy`, `09:00 AM` in the walk) while the design, the tables, and the subtitles write `dd/mm/aaaa` and 24-hour times. (UX-008)
8. **Disable «Guardar asistencia» when there is nothing to save** and show the empty roster as the plain empty state. (UX-009)
9. **One money format across surfaces.** The apps write «Bs 500» and «Bs 0»; the admin web writes «Bs 500,00»; the design says `Bs 1.200,00`. (UX-010)
10. **Tidy the 1024 px admin layout:** the week grid truncates every Session block to «Refo…» and the report's month table wraps month names in two lines. (UX-011)

Severity counts: 3 high, 7 medium, 9 low. Nothing blocks the Play Store round; UX-002 to UX-004 should land before real Clients and the front desk use the apps daily.

## Method and coverage

| Surface | Devices and widths | Roles and flows walked |
|---|---|---|
| Client app | iPhone 16 Pro (iOS 18.2, Expo Go), iPad Pro 11 M4 (Expo Go), Android emulator (local development build) | Login, registration form, recovery; Home with and without a Plan; Reservar, Session detail, booking, Mis reservas with the confirmation notice, the cancellation sheet, a booking inside the window with «Reprogramar», Reprogramar; Historial; Elige tu plan, plan detail, Pago with the QR and a receipt from the photo library, Estado del pago, Home and the catalogue with a payment in review; Evaluación nutricional, Confirmar, Mis evaluaciones with the notice and the cancel sheet; Mis referidos, Mi crédito, Notificaciones; Perfil, Editar perfil (email change section), Cambiar contraseña, Cerrar mi cuenta, logout sheet |
| Staff app | the same three devices | Trainer agenda, attendance list (upcoming and past Session), Perfil, Notificaciones; Assistant search, result rows, client overview, booking list and detail, plan picker, cash confirmation, Nuevo cliente; Administrator pending payments, review with the receipt, the reject form, Cancelar una clase, Cancelar sesión and its result, Perfil, Notificaciones, «Ver la app como…», the confirmation, the banner, «Salir»; Nutritionist agenda, the selected card, Mi disponibilidad, Nuevo horario, the time picker |
| Admin web | Chromium 1440 × 900, 1024 × 900, 420 × 860 | Login; every page AW02–AW35; the create panel of every list; the edit panel of a Session (one-off and the weekly form), a Staff Member, and the Client detail with its closure dialog; the payment review with the reject form; the withdrawal panel; the promotion form; the user menu, the Branch selector, the narrow drawer |

Not covered: push notifications and the permission sheet (need a device), the email-link screens (21, 22's confirmation, S19, AW32), the throttled states, the QR full-screen view's «Guardar QR», the admin recovery and loading states (WEB-032 and WEB-035 verified them two days ago), and dynamic type and screen readers (noted as a follow-up, not audited).

## Findings

Severity: **high** blocks or misleads a user in a daily flow; **medium** is visible on every use and contradicts the design or the bar; **low** is a detail a careful eye catches.

### Client app

| # | Screen | Devices | Finding | Design says | Severity | Screenshot |
|---|---|---|---|---|---|---|
| C1 | 05 Mis reservas, 12 Mi plan, 03 Reservar | all three | The tab screens fetch once when the tab first mounts and never again while the app runs: after a booking was created for Lucía through the API, Mis reservas kept showing one card across tab switches and a pull gesture (there is no refresh control outside Home), and only showed both after a new login. A Client who books at the front desk, or whose payment is confirmed, sees nothing until she restarts the app. | Home's prompt specifies pull to refresh; the other roots say nothing, so the design should gain the rule: every list refreshes on focus and on pull. | high | `c-05-reservas-window-iphone.png` (stale, one card) vs the same file after re-login (two cards) |
| C2 | 11 Estado del pago | all three | The pending state draws the ⌛ emoji on an Advertencia disc. It is the only emoji in the product; it renders differently per platform and does not match the 26 px stroked icons used by every other state. | «Icons: thin, single-weight line icons only, inline SVG… No filled glyphs.» | medium | `c-11-estado-ipad.png` |
| C3 | 16 Mis referidos | all three | «Cuando un amigo se registre y haga su primer pago, ganas crédito.» under a Home tile that reads «2 amigas invitadas» and a design that says «Invita amigas y gana crédito». | Feminine register throughout (checklist 30 §7, follow-up 47). | medium | `c-16-referidos-ipad.png` |
| C4 | 04 Detalle de sesión | all three | The Trainer line shows initials and the name only; the design adds «Entrenadora certificada». Minor, but the row looks unfinished with a 44 px avatar beside a single short line. | `04`: «Emma Vargas · Entrenadora certificada». | low | `c-04-detalle-iphone.png` |
| C5 | 02 Inicio (no Plan) | iPad | The «Elige tu plan y vuelve al mat» card stretches to the full 1,340 px width in solid Palo de rosa; at that width it reads as a banner, not a card. The tablet variant of `02` caps the carousel at 720 px; the plan card should take the same cap. | `02` tablet frame: «La tarjeta se detiene en 720 px … el resto sigue en una columna». | low | `c-02-home-sofia-ipad.png` |
| C6 | 05 cancel sheet | iPhone | The sheet's note reads «…y el cupo se libera; volver a reservar depende de que siga habiendo lugar.» The design's sentence is clearer: «el lugar queda libre para otra clienta. Para volver a reservarlo tendrá que seguir habiendo cupo.» The semicolon construction is unusual in app copy. | `05` «Confirmar cancelación» frame. | low | `c-05-cancel-sheet-iphone.png` |
| C7 | money everywhere | all three | Amounts print without centavos («Bs 560», «Bs 0», «Bs 500» on S11/S12) while the admin web prints «Bs 500,00» and the design writes `Bs 1.200,00`. Both are readable; the product should pick one. Recommendation: keep the integers in the apps (prices are whole bolivianos) and make the design say so, keep centavos on the admin web where the report reconciles. | README: «Currency is the boliviano, written Bs 1.200,00». | low | `c-09-plan-ipad.png`, `aw29-review-1440.png` |

What passed on the Client app, so nobody re-audits it: Login and registration on the three platforms, including the password eye and the referral code disclosure; Home with the plan card, the disabled shortcut and the lock; the Reservar chips, the Branch pill and sheet, the seat pills; the booking notice; the «No cancelable» pill and Reprogramar; the plain empty states of Historial and Notificaciones; the evaluation flow end to end with its month rule; the QR card, the picker, the attached receipt, the busy button, the status screen, and the catalogue hiding the purchase while a payment is in review; Perfil, the promotions switch, the close-account consequences; the iPad two-column grids and centred forms.

### Staff app

| # | Screen | Devices | Finding | Design says | Severity | Screenshot |
|---|---|---|---|---|---|---|
| S1 | S24 confirmation, S23 «Cerrar sesión» (both apps) | Android (also iOS) | The confirmation before impersonating and the logout confirmation are native `Alert.alert` dialogs (`view-as-screen.tsx`, `mobile-core/account/logout-confirmation.ts`). On Android that is a Material dialog with uppercase teal buttons, a square white sheet, and Roboto, over the warm Superficie. On iOS it is the system alert, neutral but still outside the design's sheet. | Every other confirmation in the product is a bottom sheet with a Lora title, a note, the outlined primary and «Volver» (`05`, `14`, `S14`, `S15`, `S17`); S24's prompt draws a sheet. | high | `s24-confirm-android.png` |
| S2 | S07 / S08 (Assistant booking) | iPad | The Session the Client is already booked into appears in the list like any other («11 cupos»), opens, and «Reservar» is enabled; the refusal «El cliente ya tiene una reserva a esa hora.» arrives only after the tap. The overview (S06) already shows «Próxima reserva» for that Session. | `S07`'s rules: the list should mark the Client's own booking («Ya reservada») and S08 should show it instead of the button. Not drawn today: needs a follow-up. | high | `s08-detalle-ipad.png` (refusal under the fold) |
| S3 | S06 → S09 → S10 (cash payment) | iPad | «Registrar pago en efectivo» is enabled for a Client with an active Plan; the Assistant picks a plan, reaches the confirmation, taps, and reads «El cliente ya tiene un plan activo.» Three screens for a dead end. | `12`'s rule: «no se puede comprar otro mientras el plan siga vigente». S06 should disable the action with the note, or S09 should say it before the list. | high | `s10-efectivo-result-ipad.png` |
| S4 | copy, several screens | all three | Masculine and feminine registers alternate: «El cliente ya tiene un plan activo», «El cliente no…», «1 cliente afectado», «Se notificó al cliente afectado», «Se reembolsó una clase a cada cliente» versus «La clienta verá este mensaje», «Las clientas eligen cupos», «Reservas de la clienta», «Historial de la clienta». | The glossaries and the design use «clienta» for a Client in prose (checklist 30 §6 lists «Reservas de la clienta»). The screen titles «Buscar cliente» and «Nuevo cliente» stay neutral by design. | medium | `s14-cancelar-sesion-android.png`, `s11-after-cancel-android.png`, `s12-reject-bottom-android.png` |
| S5 | S02 Mi agenda | all three | The header shows «Hola, Emma» with no role eyebrow and the day strip shows bare numbers «20 21 22…». The Nutritionist root shows «NUTRICIONISTA» over the greeting; the Assistant's booking list shows «JUE 22». A Trainer glancing at the strip cannot tell which day is Saturday. | `S02`: «Entrenadora» eyebrow, chips «Mié 12 · Jue 13 …». | medium | `s-root-iphone.png` |
| S6 | S03 Lista de asistentes | iPhone | A past Session with no bookings shows «No hay reservas para esta sesión.» as a plain line and keeps the solid «Guardar asistencia» enabled with nothing to save; the upcoming Session shows the roster with the note pinned at the bottom, which is right. | `S03`'s empty state is the plain empty state (icon, Lora title, note) and the button follows the roster. | low | `s03-asistentes-past-iphone.png`, `s03-asistentes-iphone.png` |
| S7 | S13 session rows | Android | Rows read «Sucursal Centro» while S02, S07 and the Client app read «Centro» for the same Branch, and the pill above already says «Sucursal: Centro». | `S13`'s prompt writes the bare Branch name. | low | `s13-cancelar-android.png` |
| S8 | S14 warning box | Android | The warning copy uses two em dashes («… afectado — incluso si ya no podía cancelar por su cuenta — y se le notificará.»); no other screen does. | `S14` prompt copy has none. | low | `s14-cancelar-sesion-android.png` |
| S9 | S12 Revisar pago | Android | The receipt box is a fixed square with the portrait receipt letter-boxed on white; «Ampliar» exists but the thumbnail wastes half its area. Fitting the image's own ratio (as `10`'s QR does since MOB-062) would show the amount on the receipt without opening it. | `S12`: «comprobante grande». | low | `s12-review-android.png` |

What passed: the search rows and the tablet split view with its empty right panel; the client overview with the plan card and the history card; the plan grid; the pending-payments inbox, the review summary, the reject form with its disabled confirm; Cancelar una clase and Cancelar sesión's result screen; the impersonation picker, banner, countdown and «Salir» notice; the availability list, the schedule form and the time sheet; Perfil, the unread badge and dot; Notificaciones.

### Admin web

| # | Screen | Widths | Finding | Design says | Severity | Screenshot |
|---|---|---|---|---|---|---|
| A1 | AW23 Personal, AW24 Formulario de personal | all | The Role tag and the role grid read «Entrenador» and «Administrador» while AW03's field says «Entrenadora», AW33's menu says «Administración», and the Staff app says «Entrenadora», «ENTRENADORAS», «Administración». | The design itself draws «Entrenador» and «Administrador» on AW23/AW24 (six occurrences), so **the design is what should change** here: follow-up 59 §5 already flagged «Entrenador beside feminine copy» and only part of it landed. | medium | `aw23-personal-1440.png`, `aw24-edit-1440.png` |
| A2 | AW03, AW12, AW14, AW16, AW18 (native date and time inputs) | all | The `input type="date"` and `type="time"` controls render in the browser's OS locale: `mm/dd/yyyy` and `09:00 AM` in the walk, `dd/mm/aaaa` and `09:00` on a Spanish Mac. The page's own text beside them is always `22/10/2026 · 12:17`. A studio laptop set to English shows two formats on one panel. | «Dates are dd/mm/aaaa, times are 24-hour.» | medium | `aw03-edit-1440.png`, `aw16-reporte-1440.png` |
| A3 | AW02 Horario at 1024 px | 1024 | Every Session block truncates to «Refo… 0/12 · 07:00 – 07:…»; the grid keeps seven equal columns and the 236 px sidebar. A two-line block (type on one line, time on the next) or a narrower sidebar at this breakpoint would keep the week readable on a 13-inch laptop. | The design draws 1440 and 420 only. | low | `aw02-horario-1024.png` |
| A4 | AW16 Reporte at 1024 px | 1024 | «Totales por mes» wraps «mayo de 2026» and «Bs 780,00» onto two lines; the three tiles squeeze their captions. | — | low | `aw16-reporte-1024.png` |
| A5 | AW21 Clientes | 1440 | The Plan column reads «Sin plan activo» for Sofía (expired Plan) and Mariana (never bought); the design distinguishes «Sin plan» (never bought, neutral pill) from an expired Plan. | AW21 row (follow-up 54). | low | `aw21-clientes-1440.png` |

What passed: the shell at the three widths including the drawer, the Branch popover and the user menu; every list, its empty state, filter and pagination; the side panels and their helpers; the dialogs (closure, reject); the week grid with the create-from-slot affordance; the report's tiles, chart and tables; the stacked cards at 420 px; the login card.

### Cross-cutting

| # | Finding | Severity |
|---|---|---|
| X1 | Register: «clienta» vs «cliente», «Entrenadora» vs «Entrenador», «amigas» vs «amigo» (C3, S4, A1). One decision, applied to the three surfaces and the four design files. | medium |
| X2 | Money: «Bs 560» (apps) vs «Bs 560,00» (admin web) (C7). | low |
| X3 | Accessibility was not audited in depth: dynamic type, VoiceOver and TalkBack order, and Reduce Motion deserve one session on their own once the items above land. | — |

## Prioritised plan

Each item fits one session. «Design follow-up» names the prompt delta it needs before the code changes (written and exported in the same branch, as the design workflow asks).

| ID | Item | Findings | Design follow-up |
|---|---|---|---|
| UX-002 | Replace the native alerts with the design's confirmation sheet: «¿Ver la app como…?» in the Staff app and «¿Cerrar sesión?» in both apps, through one shared `ConfirmationSheet` in mobile-core (the one `05`, `15`, `S14`, `S15` and `S17` already draw) | S1 | None: `S24` and `18`/`S23` already draw sheets; verify the exported frames match |
| UX-003 | Refuse early in the Assistant flows: mark the Client's own booking in S07 and show S08 without the button; disable «Registrar pago en efectivo» on S06 while the Plan is active with the note «Podrá comprar otro plan cuando este termine» | S2, S3 | 109: S07 «Ya reservada» row and S08 booked frame; S06 disabled cash action |
| UX-004 | Refetch the Client tab screens on focus (`useFocusEffect` + `refetchOnWindowFocus` through react-navigation's focus) and add the refresh control to Reservar, Mis reservas, Mi plan, Mis evaluaciones, Notificaciones, and the Staff roots | C1 | None (behaviour), README «Loading state» gains one line on pull to refresh |
| UX-005 | Settle the register: «clienta» in prose on every surface, «Entrenadora» / «Administración» for the Roles everywhere, «amigas» on Mis referidos; sweep the three apps' copy | C3, S4, A1, X1 | 110: AW23's tag and AW24's grid read «Entrenadora», «Asistente», «Administración», «Nutricionista»; the S14 and S12 notes in the feminine |
| UX-006 | Draw the payment status icons as line icons (hourglass, check, cross) on the semantic disc | C2 | 111: `11`'s three frames with the stroked glyphs; design-system icon row |
| UX-007 | Trainer agenda header: «Entrenadora» eyebrow, weekday names in the day strip («Mié 21»), consistent with S07 | S5 | None: `S02` already draws both |
| UX-008 | Own the admin date and time formats: a formatted date field (dd/mm/aaaa, es-BO) and a 24-hour time field in the shared form primitives, used by the Session, payroll, expense, promotion and report forms | A2 | None: the design already draws dd/mm/aaaa and 24-hour values |
| UX-009 | Attendance list: plain empty state for a Session without bookings and «Guardar asistencia» disabled while the roster is empty | S6 | 112: `S03` empty frame |
| UX-010 | One money format per surface, documented: whole bolivianos in the apps (prices are whole), centavos on the admin web; README «Currency» line updated | C7, X2 | 113: README line only |
| UX-011 | 1024 px admin pass: two-line Session blocks on the week grid, no-wrap month names and amounts in the report tables, tile captions | A3, A4 | None: a width the design does not draw; record the breakpoint rules in the README |
| UX-012 | Small copy and layout leftovers: «Entrenadora certificada» line on 04, the 720 px cap for the no-plan card on the tablet, the cancel sheet's sentence, «Sucursal » prefix on S13 rows, the em dashes on S14, S12's receipt at its own ratio, AW21's «Sin plan» vs «Vencido» | C4, C5, C6, S7, S8, S9, A5 | 114: `02` tablet no-plan frame, `S13` rows, `S14` copy |
| UX-013 | Accessibility audit: dynamic type at the largest setting, VoiceOver and TalkBack reading order on the roots and the booking flow, Reduce Motion on the loading states | X3 | Written after the audit |

Recommended order: UX-002, UX-003, UX-004 before the store round reaches real users; UX-005 to UX-008 right after; the rest as polish sessions.

## Where the design should change, not the code

- AW23 / AW24: the masculine Role labels (A1). The design is the odd one out; follow-up 110 fixes it.
- `02` tablet: the no-plan card has no tablet frame; follow-up 114 draws it at the 720 px cap.
- `S07` / `S08`: the Client's existing booking is not drawn; follow-up 109 adds the row state and the detail frame.
- README «Currency»: once UX-010 settles the per-surface format, the sentence changes.

## Environment notes for the next sessions

- Audit database `pilates_ux001`, API and worker on 3140, admin dev server on 5180 with `ADMIN_WEB_TRUSTED_ORIGINS` including it, Metro 8085 (client) and 8086 (staff), all stopped and dropped at the end of UX-001.
- The Android Client dev build was rebuilt locally (`expo run:android --no-bundler` with `ANDROID_HOME` set; the worktree had no `local.properties`) and is now installed on the emulator in place of the Release build.
- The admin screenshots came from a small Playwright script (chromium 1228 already cached by WEB-010); the mobile ones from `simctl io screenshot` and `adb exec-out screencap`.
