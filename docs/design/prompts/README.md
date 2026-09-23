# Design prompts index

Prompts fed to the design-generation tool to produce the screens in `../../../design/`. Start with [`00-design-system.md`](./00-design-system.md) — every other prompt references it by name.

For fixes to **already-generated** screens, use [`followups/`](./followups/) instead of editing the original screen prompt — each follow-up is a short delta meant to be sent as the next message in the existing design session, so only the affected screen(s) regenerate. Only write/edit a full prompt file directly for a screen that hasn't been generated yet.

## Client app (`client/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| 01 | Iniciar sesión / Registrarse | `01` | ✅ |
| 02 | Inicio | `02` | ✅ |
| 03 | Reservar | `03` | ✅ |
| 04 | Detalle de sesión | `04` | ✅ |
| 05 | Mis reservas | `05` | ✅ |
| 06 | Reprogramar | `06` | ✅ |
| 07 | Historial de clases | `07` | ✅ |
| 08 | Elige tu plan | `08` | ✅ |
| 09 | Detalle del plan | `09` | ✅ |
| 10 | Pago | `10` | ✅ |
| 11 | Estado del pago | `11` | ✅ |
| 12 | Mi plan | `12` | ✅ |
| 13 | Evaluación nutricional | `13` | ✅ |
| 14 | Confirmar evaluación | `14` | ✅ |
| 15 | Mis evaluaciones | `15` | ✅ |
| 16 | Mis referidos | `16` | ✅ |
| 17 | Mi crédito | `17` | ✅ |
| 18 | Perfil | `18` | ✅ |
| 19 | Notificaciones | `19` | ✅ |
| [20](./client/20-recover-password.md) | Recuperar contraseña | `20` | ✅ |
| [21](./client/21-change-password.md) | Crea tu contraseña | `21` | ✅ |
| [22](./client/22-edit-profile.md) | Editar perfil | `22` | ✅ |
| [23](./client/23-change-password-signed-in.md) | Cambiar contraseña (sesión iniciada) | `23` | ✅ |

## Staff app (`staff/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| S01 | Iniciar sesión | `S01` | ✅ |
| S02 | Mi agenda (Entrenadora) | `S02` | ✅ |
| S03 | Lista de asistentes (Entrenadora) | `S03` | ✅ |
| S04 | Buscar cliente (Asistente) | `S04` | ✅ |
| S05 | Nuevo cliente (Asistente) | `S05` | ✅ |
| S06 | Resumen del cliente (Asistente) | `S06` | ✅ |
| S07 | Reservar una clase (Asistente) | `S07` | ✅ |
| S08 | Detalle de sesión (Asistente) | `S08` | ✅ |
| S09 | Elegir plan (Asistente) | `S09` | ✅ |
| S10 | Confirmar pago en efectivo (Asistente) | `S10` | ✅ |
| S11 | Pagos pendientes (Administración) | `S11` | ✅ |
| S12 | Revisar pago (Administración) | `S12` | ✅ |
| S13 | Cancelar una clase (Administración) | `S13` | ✅ |
| S14 | Cancelar sesión (Administración) | `S14` | ✅ |
| S15 | Mi agenda (Nutricionista) | `S15` | ✅ |
| S16 | Mi disponibilidad (Nutricionista) | `S16` | ✅ |
| S17 | Formulario de horario (Nutricionista) | `S17` | ✅ |
| [S18](./staff/18-recover-password.md) | Recuperar contraseña | `S18` | ✅ |
| [S19](./staff/19-change-password.md) | Crea tu contraseña | `S19` | ✅ |
| [S20](./staff/20-notifications.md) | Notificaciones | `S20` | ✅ |
| [S21](./staff/21-assistant-manage-bookings.md) | Reservas de la clienta (Asistente) | `S21` | ✅ |
| [S22](./staff/22-assistant-client-history.md) | Historial de la clienta (Asistente) | `S22` | ✅ |
| [S23](./staff/23-staff-profile.md) | Perfil (todos los roles) | `S23` | ✅ |

## Admin web (`admin-web/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| 00 | Design System | `Sistema de Diseño` | ✅ |
| AW01 | Iniciar sesión | `AW01` | ✅ |
| AW02 | Horario | `AW02` | ✅ |
| AW03 | Formulario de sesión | `AW03` | ✅ |
| AW04 | Planes | `AW04` | ✅ |
| AW05 | Formulario de plan | `AW05` | ✅ |
| AW06 | Tipos de clase | `AW06` | ✅ |
| AW07 | Formulario de tipo de clase | `AW07` | ✅ |
| AW08 | Insumos | `AW08` | ✅ |
| AW09 | Formulario de insumo | `AW09` | ✅ |
| AW10 | Registrar retiro | `AW10` | ✅ |
| AW11 | Nómina | `AW11` | ✅ |
| AW12 | Formulario de pago de sueldo | `AW12` | ✅ |
| AW13 | Gastos | `AW13` | ✅ |
| AW14 | Formulario de gasto | `AW14` | ✅ |
| AW15 | Categorías de gasto | `AW15` | ✅ |
| AW16 | Reporte de ingresos y gastos | `AW16` | ✅ |
| AW17 | Promociones | `AW17` | ✅ |
| AW18 | Formulario de promoción | `AW18` | ✅ |
| AW19 | Sucursales | `AW19` | ✅ |
| AW20 | Formulario de sucursal | `AW20` | ✅ |
| AW21 | Clientes | `AW21` | ✅ |
| AW22 | Detalle de cliente | `AW22` | ✅ |
| AW23 | Personal | `AW23` | ✅ |
| AW24 | Formulario de personal | `AW24` | ✅ |
| AW25 | Evaluaciones nutricionales | `AW25` | ✅ |
| AW26 | Referidos | `AW26` | ✅ |
| AW27 | Créditos | `AW27` | ✅ |
| AW28 | Pagos | `AW28` | ✅ |
| AW29 | Revisar pago | `AW29` | ✅ |
| [AW30](./admin-web/30-recover-password.md) | Recuperar contraseña | `AW30` | ✅ |
| [AW31](./admin-web/31-retiros-consumo.md) | Retiros e insumos consumidos | `AW31` | ✅ |
| [AW32](./admin-web/32-create-password.md) | Crear contraseña | `AW32` | ✅ |
| [AW33](./admin-web/33-user-menu.md) | Menú de usuario y cambiar contraseña | `AW33` | ✅ |
| [AW34](./admin-web/34-branch-selector.md) | Selector de sucursal | `AW34` | ✅ |

## Follow-ups (`followups/`)

Each of these was sent as the next message in the existing design session for the surface it targets. Status is verified against the built files in `../../../design/`, and **re-verified after every export** — a ✅ is only true of the current bundle.

[30](./followups/30-invariants-checklist.md) is different from the rest: it is a standing checklist, sent alongside every other follow-up, and never gets marked applied.

| Follow-up | Fixes | Status |
|---|---|---|
| [01](./followups/01-sidebar-remove-descuentos.md) | Drops "Descuentos" and makes the sidebar identical on every admin screen ([ADR-0007](../adr/0007-drop-descuentos-from-admin-web.md)) | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
| [02](./followups/02-plan-catalog-no-unlimited.md) | Removes unlimited plans / 15-day pass from AW04, 08, S09 | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
| [03](./followups/03-referral-reward-copy.md) | Fixes the referral-reward copy on `01` | ✅ applied |
| [04](./followups/04-payment-rejected-notification.md) | Adds the missing payment-rejected notification type to `19` | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
| [05](./followups/05-waitlist-visibility-for-staff.md) | Surfaces the Waitlist on `S03`/`AW03`, fixes cancel-session copy on `AW03`/`S14` | ✅ applied |
| [06](./followups/06-client-overview-add-bookings-entry.md) | Adds the entry point for `S21` to `S06` | ✅ applied |
| [07](./followups/07-insumos-add-withdrawal-history-link.md) | Adds the entry point for `AW31` to `AW08` | ✅ applied |
| [08](./followups/08-remove-referral-reward-label.md) | Removes the referral-reward helper text from `01` | ✅ applied |
| [09](./followups/09-trainer-remove-waitlist-visibility.md) | Removes the Waitlist section from `S03` (Trainer) | ✅ applied |
| [10](./followups/10-client-overview-wire-history-link.md) | Wires `S06`'s "ver todo"/"Ver historial completo" links to new screen `S22` | ✅ applied |
| [11](./followups/11-remove-remaining-unlimited-plans.md) | Removes the unlimited plans follow-up 02 missed, on `AW05`, `AW22`, `S11`, `S12` (also "sesiones" → "clases") | ✅ applied (finished by [31](./followups/31-plan-naming-leftovers.md)) |
| [12](./followups/12-cancellation-window-copy.md) | Fixes the 6 h cancellation window on `Sistema de Diseño` and `S14` — it is 2 h 30 | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
| [13](./followups/13-plan-detail-validity-and-payment-methods.md) | Fixes when the plan's date range starts, and the payment-method note, on `09` | ✅ applied |
| [14](./followups/14-design-system-navigation-drift.md) | Resyncs `Sistema de Diseño`'s navigation section with the built apps | ✅ applied (was reverted once; restored by [32](./followups/32-design-system-navigation-drift-again.md)) |
| [15](./followups/15-trainer-session-cancelled-notification.md) | Adds the session-cancelled notification for the Trainer to `S20` | ✅ applied |
| [16](./followups/16-profile-add-change-password.md) | Adds the "Cambiar contraseña" row to `18`, the entry point for new screen `23` | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
| [17](./followups/17-handoff-readme-inventory.md) | Resyncs the exported `design/README.md` — Descuentos back out, `AW30`/`AW31`, `20`–`22`, `S18`–`S22`, mobile navigation | ✅ applied |
| [18](./followups/18-staff-account-avatar.md) | Makes the account avatar a real control on `S02`/`S04` and adds it to `S11`/`S15`, the two roots that had no way into `S23` | ⚠️ partly applied (`S15` only) — remainder superseded by [27](./followups/27-staff-account-avatar-remaining-roots.md), do not re-send |
| [19](./followups/19-client-account-avatar.md) | Wires the inert avatar on `02` to the Perfil tab (`18`) | ✅ applied |
| [20](./followups/20-design-system-account-avatar.md) | Documents the account avatar in `Sistema de Diseño`'s navigation section | ✅ applied |
| [21](./followups/21-admin-receipt-fullscreen.md) | Draws the enlarged receipt behind `AW29`'s "Ver en grande", which led nowhere | ✅ applied |
| [22](./followups/22-staff-receipt-fullscreen.md) | Draws the full-screen receipt `S12`'s notes already promise behind "Ampliar" | ✅ applied |
| [23](./followups/23-client-cancel-confirmation.md) | Adds the confirmation sheet `05`'s own notes specify, and the same on `15` | ✅ applied |
| [24](./followups/24-booking-confirmed-notice.md) | Acknowledges a new booking on `05` and a new evaluation on `15` | ✅ applied |
| [25](./followups/25-admin-clients-no-results.md) | Adds the no-results state to `AW21`, whose only filter is search | ✅ applied |
| [26](./followups/26-nutritionist-agenda-caption.md) | Fixes `S15`'s "toca para abrirla" caption — selection highlights, opens nothing | ✅ applied |
| [27](./followups/27-staff-account-avatar-remaining-roots.md) | Carries `S15`'s account avatar into `S02`/`S04`/`S11` — replaces the unapplied part of 18 | ✅ applied |
| [28](./followups/28-clientes-counter-consistency.md) | Makes `AW21`'s two footer counters agree, and `AW22`'s subtitle with them | ✅ applied |
| [29](./followups/29-restore-reverted-followups.md) | Restores 01/02/04/05/11/12/16, reverted by the export that applied 19–22 and 27–28, and finishes 27 on `S11` | ✅ applied |
| [30](./followups/30-invariants-checklist.md) | Standing checklist of settled facts — send it alongside every future follow-up | ♾️ standing, never "applied" |
| [31](./followups/31-plan-naming-leftovers.md) | `Sistema de Diseño`'s "sesiones usadas" and `AW34`'s invented plan; amends 30 §8 (six notification types, not seven) and §1 (no invented plans) | ✅ applied |
| [32](./followups/32-design-system-navigation-drift-again.md) | `Sistema de Diseño`'s navigation section, drifted again — tab bar labels, the missing Nutricionista role, an invented admin sidebar, abbreviated plan names; amends 30 §5 (Reporte) and §1 (full plan names) | ✅ applied |
| [33](./followups/33-email-only-authentication.md) | Makes email the only login and recovery identifier on client, staff, and admin account forms; keeps phone as optional contact data (ADR-0029) | 🕓 pending |
| [34](./followups/34-client-email-verification.md) | Adds `01`'s post-registration **Revisa tu correo** state and blocks normal access until the email link is opened (ADR-0029) | 🕓 pending |
| [35](./followups/35-email-activation-instead-of-temporary-passwords.md) | Replaces temporary passwords with emailed activation links for staff-created Client and Staff Member Accounts (ADR-0029) | 🕓 pending |
| [36](./followups/36-email-password-recovery-destinations.md) | Completes email password recovery across all surfaces and distinguishes its replacement session from activation (ADR-0029, ADR-0030) | 🕓 pending |
| [37](./followups/37-progressive-login-throttling.md) | Adds a neutral temporary-throttling state to client, staff, and admin Login without hard-locking the Account or adding CAPTCHA (ADR-0029) | 🕓 pending |
| [38](./followups/38-authentication-email-throttling.md) | Throttles verification, activation, and recovery email across recipients and origins without revealing Accounts or invalidating an existing link (ADR-0029) | 🕓 pending |
| [39](./followups/39-align-booking-membership-schema.md) | Adds weekly Session Schedule controls, Class Type descriptions, Promotion publication, and corrects contradictory Booking & Membership sample copy | 🕓 pending |
| [40](./followups/40-cancellation-window-wording.md) | Corrects checklist 30: same-day Reschedule applies inside the Cancellation Window; outside it, use free Cancel plus a new Booking | 🕓 pending |
| [41](./followups/41-availability-form-effective-date-and-branch.md) | Adds `S17`'s «A partir del» date, a Branch picker for multi-Branch Nutritionists, and the «ya reservadas se mantienen» confirmation (NUT-001 D3, D6) | 🕓 pending |
| [42](./followups/42-availability-list-dates-and-branch.md) | Shows «Desde» / «Hasta» dates and the Branch on `S16`'s block cards (NUT-001 D3, D6) | 🕓 pending |
| [43](./followups/43-evaluation-availability-months-and-branch.md) | Makes `13`'s monthly rule per appointment month, shows the Branch per turno, closes turnos 3 h before start, and adds the no-plan state (NUT-001 D8, D11) | 🕓 pending |
| [44](./followups/44-my-evaluations-two-upcoming-and-cancel-window.md) | Allows two upcoming cards on `15`, says a cancellation frees the month, and replaces Cancelar inside 3 h (NUT-001 D8, D9, D12) | 🕓 pending |
| [45](./followups/45-nutritionist-agenda-cancel-evaluation.md) | Adds «Cancelar evaluación» on `S15`'s selected card with an `S14`-style sheet; amends 26's «Sin detalle» note (NUT-001 D14) | 🕓 pending |
| [46](./followups/46-evaluation-cancellation-notices.md) | Adds the studio-cancelled Evaluation notice to `19` and the Client-cancelled notice to `S20` | 🕓 pending |
| [47](./followups/47-home-referral-shortcut-credit.md) | Replaces `02`'s «Invita y gana clases» with «Invita amigas y gana crédito» and the Evaluation shortcut's «Agenda tu primera cita» with «Agenda tu cita del mes» | 🕓 pending |

## Status

Every prompt in this index has a generated screen in `../../../design/`.

**A follow-up landing is not permanent, and this has now happened twice.** The first export of 2026-08-17 applied 19–22, 28 and most of 27, and in the same pass reverted 01, 02, 04, 05, 11, 12 and 16. 29 restored all seven and finished 27 — and that export, in turn, reverted 05 (on `AW03`), 06, 07, 11 (on `Sistema de Diseño` and the admin web) and 13. Each round fixes what it was asked to fix and silently drops settled decisions elsewhere; 11 came back as "Mensual libre" rather than "ilimitado", so it survived a text search for the old wording.

Restoring items one at a time was not converging. [30](./followups/30-invariants-checklist.md) is the response: a standing checklist of every settled fact, sent alongside every future follow-up, so the conversation is re-grounded each time instead of being told to fix one symptom. Treat every export as needing a full re-verify against it.

**It worked.** The third export restored all five items the second one had dropped — the `S06` and `AW08` entry points, `AW03`'s waitlist copy, `09`'s validity and payment-method lines, and every trace of "Mensual libre" — and reverted nothing. Two leftovers remained, both from the same invariant about plans, and [31](./followups/31-plan-naming-leftovers.md) closed them. 31 also amends the checklist itself: §8 claimed `19` has seven notification types when it has six, and §1 needed an explicit "don't invent plan names for sample data". A sent follow-up is never edited in place — corrections to it are carried by the next one.

The fourth export — the one committed here — is the strongest yet. 31 landed on both targets, `19` now says "los seis tipos", and the plan catalogue finally holds across the staff app too: `S11`, `S12`, `AW21`, `AW28` and `AW29` lost every "Mensual libre", "Mensual ilimitado", "Semestral libre", "Anual libre" and "Paquete de 4 clases", with the amounts realigned to the six-plan table. Every other point of the checklist re-verified clean: the sidebar, the 2 h 30 window, the payment methods, the waitlist counts, the five account avatars, the six entry points, the feminine counters, the enlarged receipt on `AW29` and `S12`. One thing broke, and it is the section that had broken before: `Sistema de Diseño`'s Navegación drifted back to a client tab bar, a role list and an admin sidebar that no built screen has — the same regression [14](./followups/14-design-system-navigation-drift.md) already fixed once. [32](./followups/32-design-system-navigation-drift-again.md) restores it and adds two things the checklist was missing: the standalone **Reporte** sidebar item (point 5 never named it, though it has always been built) and a rule that plan names are written in full, never abbreviated to "Paquete 8". Section 06 of the design system is now the one place that drifts on its own, so re-verify it against the built apps before any export is accepted.

The fifth export is the first clean one. It touched a single file — `Sistema de Diseño` — and applied all four points of 32: the tab bar reads Inicio · Reservar · Mis Reservas · Perfil again, Nutricionista is back as the third of four roles, the web sample is the real 236 px sidebar (abbreviated to "Personal, Nómina…", which 32 allowed), and the three sample clients carry full plan names from the catalogue. Nothing else in the file moved — the plan card, the 2 h 30 window and the Avatar de cuenta section are intact — and no other screen was regenerated at all. Sending the checklist alongside a follow-up scoped to one section is what kept the blast radius to that section.

The five newest generated screens close gaps found by auditing the built screens against `booking/CONTEXT.md` and `back-office/CONTEXT.md`:

- `23` / `S23` / `AW33` — no surface had a signed-in way to change a password, and neither the staff app nor the admin web had a designed way to log out at all, even though `S02` and the admin shell both drew the control that should open it.
- `AW32` — `AW30` requests a reset link but the screen that link opens was never designed, so the admin web's recovery flow dead-ended. The client (`21`) and staff (`S19`) apps both have their equivalent.
- `S22` — the full attended-class record behind `S06`'s history card.

Follow-ups 11–15 fixed contradictions between built screens and the glossaries (unlimited plans, the cancellation window, when a Subscription's date range starts, the design system's navigation, the Trainer's session-cancelled notification); 16 wired up the entry point for `23`; 17 resynced the exported handoff README.

Follow-ups 18–20 close the entry point for `S23` and `18`. `S23` says it is reached "from the avatar on each role's root", but on `S02`/`S04` that avatar is a decorative `div` (and shows one initial instead of two), and on `S11`/`S15` there is no avatar at all — the top-right slot holds the role's action icon. Since no staff role has a tab bar, Administración and Nutrición had no designed way to reach their profile, change their password, or log out. 18 puts the avatar last on the right of all four roots, with the action icon to its left; 19 does the same wiring for the client's `02`; 20 writes the pattern into the design system so it stops drifting. Only `S15` picked 18 up — it was sent in the nutritionist's conversation. 27 carries that same header into `S02`, `S04` and `S11`, pointing at `S15` as the built reference; 18 is not re-sent, since it would ask for the change again on a screen that already has it. 28 cleans up after 25: the no-results footer it added counts "clientas" while the frame beside it counts "clientes".

Follow-ups 21–26 and `AW34` come from a second audit, this one looking for controls the screens draw but never resolve. Three are promises the design files make in their own copy or notes and don't keep: `AW29`'s "Ver en grande" and `S12`'s "Ampliar" open no enlarged receipt, even though checking a transfer screenshot against the bank is the entire purpose of both screens; `05`'s notes specify "«Cancelar», con confirmación previa" and no confirmation exists, on `05` or on `15`. `AW34` is the same class of gap as `AW33` — the other cell of the same top bar, drawn on every page, opened by none, while `AW19` calls itself the list that feeds it. The last three are smaller: `05` and `15` complete a booking in silence while every comparable moment in the product acknowledges itself (`11`, `S10`, `S12`, `S14`); `AW21` is search-only and has no no-results state, though `S04` and `AW25`/`AW31` all have theirs; and `S15` is captioned "toca una tarjeta para abrirla" when tapping only moves a border — the caption is wrong, not the behaviour, since an Evaluation records the appointment and not its contents.

Everything under `../../../design/` — the screens, `Sistema de Diseño`, and `README.md` — is **generated output and is never edited by hand**. Anything wrong in there is fixed by writing a follow-up here and re-sending it in that surface's design session, so the next export keeps the fix instead of overwriting it.
