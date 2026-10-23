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
| [24](./client/24-close-account.md) | Cerrar mi cuenta | `24` | ✅ |

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
| [S24](./staff/24-administrator-view-as.md) | Ver la app como… (Administración) | `S24` | ✅ (Claude Design canvas, 2026-10-22, `e81417e9`; the app side is stage 3 of FUT-001) |
| [S26](./staff/26-trainer-report-fault.md) | Reportar una falla (Entrenadora) | `S26` | ✅ applied (Claude Design canvas, 2026-10-23, `db041514`; the canvas could not be deleted from the agent session, see BKO-004) |

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
| [AW35](./admin-web/35-contactos-promociones.md) | Contactos para promociones | `AW35` | ✅ |
| [AW37](./admin-web/37-equipos.md) | Equipos | `AW37` | ✅ applied (Claude Design canvas, 2026-10-23, `db041514`; the canvas could not be deleted from the agent session, see BKO-004) |

## Follow-ups (`followups/`)

Each of these was sent as the next message in the existing design session for the surface it targets. Status is verified against the built files in `../../../design/`, and **re-verified after every export** — a ✅ is only true of the current bundle.

[30](./followups/30-invariants-checklist.md) is different from the rest: it is a standing checklist, sent alongside every other follow-up, and never gets marked applied.

| Follow-up | Fixes | Status |
|---|---|---|
| [01](./followups/01-sidebar-remove-descuentos.md) | Drops "Descuentos" and makes the sidebar identical on every admin screen ([ADR-0007](../../adr/0007-drop-descuentos-from-admin-web.md)) | ✅ applied (was reverted once; restored by [29](./followups/29-restore-reverted-followups.md)) |
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
| [33](./followups/33-email-only-authentication.md) | Makes email the only login and recovery identifier on client, staff, and admin account forms; keeps phone as optional contact data (ADR-0029) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [34](./followups/34-client-email-verification.md) | Adds `01`'s post-registration **Revisa tu correo** state and blocks normal access until the email link is opened (ADR-0029) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [35](./followups/35-email-activation-instead-of-temporary-passwords.md) | Replaces temporary passwords with emailed activation links for staff-created Client and Staff Member Accounts (ADR-0029) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [36](./followups/36-email-password-recovery-destinations.md) | Completes email password recovery across all surfaces and distinguishes its replacement session from activation (ADR-0029, ADR-0030) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [37](./followups/37-progressive-login-throttling.md) | Adds a neutral temporary-throttling state to client, staff, and admin Login without hard-locking the Account or adding CAPTCHA (ADR-0029) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [38](./followups/38-authentication-email-throttling.md) | Throttles verification, activation, and recovery email across recipients and origins without revealing Accounts or invalidating an existing link (ADR-0029) | ✅ applied (Claude Design export 2026-09-29, `4ba4eeb`) |
| [39](./followups/39-align-booking-membership-schema.md) | Adds weekly Session Schedule controls, Class Type descriptions, Promotion publication, and corrects contradictory Booking & Membership sample copy | ✅ applied (Claude Design export 2026-09-30, `76a6f95`) |
| [40](./followups/40-cancellation-window-wording.md) | Corrects checklist 30: same-day Reschedule applies inside the Cancellation Window; outside it, use free Cancel plus a new Booking | ✅ applied (Claude Design export 2026-09-30, `0c37e5f`: only the handoff README contradicted it; `05`, `06`, `09`, `S14`, `S21` already matched) |
| [41](./followups/41-availability-form-effective-date-and-branch.md) | Adds `S17`'s «A partir del» date, a Branch picker for multi-Branch Nutritionists, and the «ya reservadas se mantienen» confirmation (NUT-001 D3, D6) | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [42](./followups/42-availability-list-dates-and-branch.md) | Shows «Desde» / «Hasta» dates and the Branch on `S16`'s block cards (NUT-001 D3, D6) | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [43](./followups/43-evaluation-availability-months-and-branch.md) | Makes `13`'s monthly rule per appointment month, shows the Branch per turno, closes turnos 3 h before start, and adds the no-plan state (NUT-001 D8, D11) | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [44](./followups/44-my-evaluations-two-upcoming-and-cancel-window.md) | Allows two upcoming cards on `15`, says a cancellation frees the month, and replaces Cancelar inside 3 h (NUT-001 D8, D9, D12) | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [45](./followups/45-nutritionist-agenda-cancel-evaluation.md) | Adds «Cancelar evaluación» on `S15`'s selected card with an `S14`-style sheet; amends 26's «Sin detalle» note (NUT-001 D14) | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [46](./followups/46-evaluation-cancellation-notices.md) | Adds the studio-cancelled Evaluation notice to `19` and the Client-cancelled notice to `S20` | ✅ applied (Claude Design export 2026-09-30, `7a7f59b`) |
| [47](./followups/47-home-referral-shortcut-credit.md) | Replaces `02`'s «Invita y gana clases» with «Invita amigas y gana crédito» and the Evaluation shortcut's «Agenda tu primera cita» with «Agenda tu cita del mes» | ✅ applied (Claude Design export 2026-09-30, `cb36c70`; its referral line had already landed with 39) |
| [48](./followups/48-insumos-record-restock.md) | Adds «Registrar reposición» to `AW08` and its `AW10`-style panel, amending 30 §6 to four header actions (BKO-001 D5) | ✅ applied (Claude Design export 2026-09-30, `43fd815`) |
| [49](./followups/49-supply-form-archive.md) | Adds «Archivar insumo» with a confirmation to `AW09`'s edit frame (BKO-001 D9) | ✅ applied (Claude Design export 2026-09-30, `43fd815`) |
| [50](./followups/50-record-withdrawal-stock-limit.md) | Adds the «Máximo» helper and the insufficient-stock error to `AW10` (BKO-001 D4) | ✅ applied (Claude Design export 2026-09-30, `43fd815`) |
| [51](./followups/51-report-salary-all-branches.md) | Shows «Nómina» only in `AW16`'s «Todas las sucursales» view, with a single-Branch frame and caption (BKO-001 Q3) | ✅ applied (Claude Design export 2026-09-30, `43fd815`; the caption sits above the figures, as 59 §7 settles and the app draws) |
| [52](./followups/52-admin-user-menu-role-label.md) | Labels the Role «Administración» (as `S23` does) instead of «Administradora» in `AW33`, and uses Hover de fila for its rows (WEB-002) | ✅ applied (Claude Design export 2026-09-30, `092c480`) |
| [53](./followups/53-booking-administration-controls.md) | `AW03` cancels only a booked Session, keeps the Class Type read-only on edit, and gains «Terminar la serie»; `AW02` result line; Plan order and visibility on `AW04`/`AW05`; archive actions and Estado filters on `AW06`/`AW07`/`AW19`/`AW20` (WEB-003) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [54](./followups/54-people-administration-controls.md) | «Sin plan» for a Client who never bought one on `AW21`, the pending-activation box on `AW22`, an Estado column and on-palette Role tag on `AW23`, and `AW24`'s read-only contact, resend, deactivation, and read-only own/deactivated states without «Restablecer contraseña» (WEB-004) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`; `AW24` keeps DES-001's pending frames) |
| [55](./followups/55-payment-review-controls.md) | The Credit line under `AW28`'s amount, its empty and no-results frames; `AW29`'s price and Credit rows, the confirmation before «Confirmar pago», the already-decided and receipt-unavailable states, and «tú» in both notes (WEB-005) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [56](./followups/56-back-office-controls.md) | Categorías de gasto studio-wide in the design system and `AW34`; `AW08`'s subtitle, Estado column, notices, and warning badge; `AW09`'s typed-once stock; the stock beside each Insumo in `AW10`/Registrar reposición; `AW31`'s month arrows and archived Supplies; the Empleado and Categoría filters on `AW11`/`AW13`; `AW12`'s deactivated Staff Members and date bound; `AW14`'s Branch line and inline category row; `AW15`'s «En uso» and delete confirmation (WEB-007) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`; samples adapted to Sucursal Equipetrol, `AW11`/`AW13` keep the month) |
| [57](./followups/57-oversight-list-controls.md) | `AW25` follows the Branch selector with Horario's week stepper, «Primera evaluación» / «Seguimiento», and one card per Evaluation at 420 px; `AW26`'s studio counts and no-results state; `AW27`'s four Credit movements, the total shown only without a search, and its empty states (WEB-008) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [58](./followups/58-report-controls.md) | `AW16`'s own Desde/Hasta and Sucursal controls (archived Branches included), the top-bar note, amounts with centavos and a signed net, the lines under each figure per scope, every month on a rounded scale with a legend and a hover popover, the empty state, «Nómina» first in the category table, and the new «Totales por mes» table (WEB-009) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [59](./followups/59-admin-review-design-findings.md) | Design findings of the 2026-09-24 admin review: the two quiet text tones and the focus ring on solid buttons fail contrast, «Pendiente» versus the glossary (open question), «sortable columns», `AW23`'s name search, checklist 30 §5's Reporte, «Entrenador» beside feminine copy, the single-Branch caption in 51 versus 58, 49's dialog buttons, `AW22`'s deactivated Account, and the 32 px figure (WEB-011) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`; §1 tones and focus ring applied to the design system and `AW03`/`AW16`/`AW22`/`AW23`/`AW28`/`AW29`, the rest of the sweep goes to 70; §2 keeps «Pendiente» and the booking glossary drops it from _Avoid_) |
| [60](./followups/60-image-crops-and-formats.md) | Client `22` previews the centre-cropped circular profile photo; `AW18` previews the 16:9 centre crop, accepts WEBP, and shows the too-small message (UPL-002) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [61](./followups/61-promotions-as-built.md) | `AW17`'s empty frame, result line, «Sin imagen» card, and narrow wrap; `AW18`'s footer by state, the image-change warning, «Eliminar promoción» with its dialog, the «Imagen actual» caption, and the crop and refusal copy (WEB-006) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [62](./followups/62-home-promotions-carousel-as-built.md) | Client `02`'s Promotions carousel as built: one 16:9 card per page with position dots, the loading placeholder, the section hidden when nothing is published, pull to refresh, and the 720 px tablet card (MOB-019) | ✅ applied (Claude Design export 2026-09-30, `c2990a2`) |
| [63](./followups/63-client-profile-photo-as-built.md) | Client `18`'s summary card and `22`'s Cambiar foto / Quitar foto with the photo inside the circular avatar as built, and the conflict between prompt 22, follow-up 60 §1, and invariant 9 (the avatar is «never a photo») for the design session to settle (MOB-020) | ✅ applied (Claude Design export 2026-09-30, `265d08c`; the initials sit on Palo de rosa tinte `#EFE0DC`/`#8A5D59` as the app draws them, and the summary card wraps a long email instead of truncating it) |
| [64](./followups/64-client-email-change-as-built.md) | Client `22`'s editable email, the «Revisa tu correo nuevo» pending card with Reenviar correo and Cancelar cambio, and the link's confirmation screen as built (IDN-008) | ✅ applied (Claude Design export 2026-09-30, `1100c97`) |
| [65](./followups/65-client-profile-close-account-row.md) | Client `18`'s quiet «Cerrar mi cuenta» link under «Cerrar sesión» and its new entry point into the new screen `24` (BE-007) | ✅ applied |
| [66](./followups/66-admin-close-client-account.md) | `AW22`'s footer «Cerrar cuenta» action, its consequences dialog, the refused-while-a-transfer-is-pending frame, and `AW21` after closing (BE-007) | ✅ applied |
| [67](./followups/67-settle-invariant-9-profile-photo.md) | Settles 63: the photo shows only on `18`/`22`, and checklist 30 §9 now reads «the header account avatar is never a photo» | ✅ applied (Claude Design export 2026-09-30, `265d08c`) |
| [68](./followups/68-assistant-pending-invitation-on-client-overview.md) | Moves the Assistant's pending-invitation box from `S05` to `S06`, as built; `S05` stays a form that opens `S06` | ✅ applied (Claude Design export 2026-09-30, `52ac0dd`) |
| [69](./followups/69-login-registration-copy-as-built.md) | `01` registration gains «Confirmar contraseña»; one incorrect-credentials message («El correo o la contraseña no son correctos.») on `01`/`S01`/`AW01` | ✅ applied (Claude Design export 2026-09-30, `2da21e3`) |
| [70](./followups/70-leftovers-of-the-2026-09-30-exports.md) | Leftovers of the 2026-09-30 exports: 59 §1's text tones on every remaining screen, `09`'s total from the Bs 560 price, `AW02`'s drawer «Administración», the sidebar hover on Hover de fila, `18`'s «Evaluación nutricional» row, and Client text links in Palo de rosa profundo | ✅ applied (Claude Design export 2026-09-30, `542f68f`) |
| [71](./followups/71-readme-aw24-password-reset-leftover.md) | `design/README.md`'s `AW24` flow bullet still offers «Restablecer contraseña», which 54 removed from the screen (checklist 30 §11, ADR-0029) | ✅ applied (Claude Design export 2026-09-30, `c0abb6d`) |
| [72](./followups/72-app-outlined-button-labels.md) | Finishes 70 §6: outlined-button labels on Client and Staff screens and the accent labels on `03`/`10` in Palo de rosa profundo, as the apps ship; README «Secondary» | ✅ applied (Claude Design export 2026-09-30, `785df78`) |
| [73](./followups/73-unread-notifications-badge.md) | Unread notifications (MOB-017 gap): a `#8A5D59` count badge on the Client Perfil tab and on the «Notificaciones» rows of `18`/`S23`, a dot on the Staff «Tu cuenta» avatar of `S02`/`S04`/`S11`/`S15` (amends checklist 30 §9: the dot is not a border), design system and README | ✅ applied (Claude Design export 2026-09-30, `c9bd14a`) |
| [74](./followups/74-picker-sheet-selected-row.md) | Picker sheets: the selected row's label in Palo de rosa profundo on `03`'s and `S13`'s «Elige una sucursal» and `S17`'s time sheet, the `#B78380` check kept; README «Picker sheets» | ✅ applied (Claude Design export 2026-09-30, `5ef85ae`) |
| [75](./followups/75-evaluation-month-copy-as-built.md) | Evaluation copy names its month (MOB-022 as built): `13`'s used-month title rule, `14` «desde Mis evaluaciones», `15`'s new «ya usada este mes» empty frame and the cancel sheet's month, `19`'s freed-month sentence; README rows | ✅ applied (Claude Design export 2026-10-01, `e51832f`; the apps already match, no app work) |
| [76](./followups/76-assistant-self-registered-pending-client.md) | `S06` for a pending Client who registered herself (MOB-027 as built): the verification card with `S05`'s copy and «Enviar enlace de verificación» in three phone frames (sent, limited) and a tablet frame, a notes card; `S05`'s «Ver cliente» caption; README | ✅ applied (Claude Design export 2026-10-01, `e85b1c1`; the limited state's clock notice is app work in MOB-037) |
| [77](./followups/77-registration-form-request-limit.md) | `01`'s registration form under the device or network request limit (BE-012): the neutral clock notice above the fields with the server wait and «Crear cuenta» disabled until it ends, instead of the generic failure; README | ✅ applied (Claude Design export 2026-10-01, `70038d3`; app gap in MOB-032) |
| [78](./followups/78-staff-account-email-limit.md) | The staff Account's email limit (BE-013): `S05`'s form, `S06`'s invitation card, and `AW24`'s pending and new-member panels under `staff_email_throttled`, with «Enviaste muchos correos en poco tiempo…» in the neutral clock notice | ✅ applied (Claude Design export 2026-10-01, `415f8cd`; app side built in BE-013) |
| [79](./followups/79-aw24-pending-card-slips.md) | `AW24`'s pending card (WEB-015 findings): the «Pendiente de activación» pill's text in Advertencia texto `#9A7434` instead of the off-palette `#8A6A30`, and the sample expiry as «El enlace vence el 06/10/2026.» per follow-up 54 | ✅ applied (Claude Design export 2026-10-06, `14a7d4fe`; the admin web already draws both, no app work) |
| [80](./followups/80-mobile-card-surface.md) | The mobile card as the frames draw it (MOB-039): the README names Borde fuerte, radius 16, and the soft shadow for Client and Staff cards and gains a «Cards (Client and Staff)» section with the empty states; the stray 14/18/20 px card radii on 14 screens and the 18 px empty-state titles of `03`, `16`, and `S04` become 16 and 19 | ✅ applied (Claude Design export 2026-10-06, `5f5bc0ae`; the apps already draw every card from `surfaces.card` since MOB-039, no app work) |
| [81](./followups/81-history-rows-between-rules.md) | The history rows between rules (MOB-040): the README gains Regla `#EFE7DE` and Icono tenue `#C4BAB6` in its colour table and a «Lists between rules (Client and Staff)» section with the bare empty state; `S22` loses «Se cargan más meses al desplazar.» and draws its tablet rows at the phone values; the «Contenido» notes of `07` and `S22` stop promising progressive loading | ✅ applied (Claude Design export 2026-10-06, `529d7496`; the apps draw the rows and the plain empty state since MOB-040, no further app work) |
| [82](./followups/82-row-chevron-tones.md) | The row chevrons (MOB-041): the README's «Icono tenue» row names only the Perfil menu chevrons of `18` and `S23` and `02`'s disabled lock as quiet, and a «Row chevrons (Client and Staff)» section records the 19px Palo de rosa chevron of every other tappable row and the 16px Texto tenue picker chevron; `02`'s 20px «Reservar una clase» chevron becomes 19 | ✅ applied (Claude Design export 2026-10-06, `9dd56a3a`; the apps draw every chevron from mobile-core's `Chevron` since MOB-041, no further app work) |
| [83](./followups/83-shortcut-tiles-and-picker-pill.md) | The Home shortcut tiles and the Branch picker pill (MOB-042): `02`'s disabled shortcut row takes the one card radius (16) and Arena `#F2ECE5` instead of radius 14 and the off-palette `#F5F1EC`, its note the enabled note's 13px `#766D69`, and its gap to the tile grid 12px; the three shortcuts of `02` and the result rows of `S04` take the README's `rgba(74,74,74,0.05)` card shadow; `S13`'s pill paints «Sucursal:» `#4A4A4A` like `03` and `S07`; `03`'s «Clase llena» full card ends in the chevron like every other Session row; the README gains «Home shortcuts (`02`)» and «Branch picker pill (`03`, `S07`, `S13`)» sections | ✅ applied |
| [84](./followups/84-seat-pills-and-palette-text-tones.md) | One seat-pill rule and the text tones outside the closed palette (MOB-045): every seat pill of `03`, `06`, `S02`, `S07`, `S08`, and `S13` draws seats remaining on Palo de rosa tinte `#EFE0DC` with `#7A4F4B` and a full class on `rgba(216,201,187,0.34)` with `#6E6663` (never red or green), replacing three different palettes; `#8A5F5C` (90 occurrences in 21 files plus `03`'s script) becomes `#8A5D59`; the remaining `#5E7256`, `#8A6428`, and `#8A4433` become the palette's `#5F7457`, `#9A7434`, and `#94493A`; the README gains a «Seat pills» section | ✅ applied |
| [85](./followups/85-s04-tablet-result-rows.md) | `S04`'s result rows on the tablet (MOB-046): the contact line of every result row stays on one line and is trimmed with an ellipsis, a «Tablet · Resultados» frame shows two phone-style result rows in the 392px left panel with a trimmed contact, and the README gains a «Search result rows (`S04`)» section | ✅ applied |
| [86](./followups/86-s13-started-sessions-note.md) | `S13`'s «Incluye clases llenas» note (MOB-044) says no Session is hidden; it now says no full class is hidden and that started Sessions, which can no longer be cancelled, do not appear | ✅ applied |
| [87](./followups/87-s08-capacity-box-on-blanco.md) | `S08`'s capacity summary box (MOB-048): the box behind «N de M cupos disponibles» and the seat pill loses its Éxito `rgba(124,148,115,0.10)` and Error `rgba(178,93,75,0.07)` tints for Blanco `#FFFFFF`, a flat card whose pill alone carries the state; the README's «Seat pills» section gains a bullet saying so | ✅ applied (Claude Design export 2026-10-06, `10c09e5a`; the app side is built in MOB-048) |
| [88](./followups/88-04-lleno-pill-and-bar-track.md) | `04`'s capacity block (MOB-049): the «Lleno» pill's `rgba(74,74,74,0.07)` becomes the seat-pill rule's `rgba(216,201,187,0.34)` and the bar's `#EFE4DC` track becomes Palo de rosa tinte `#EFE0DC`; the README's «Seat pills» heading and rule extend to `04` with a bullet for its bar | ✅ applied (Claude Design export 2026-10-07, `c1f23eb9`; the app side is built in MOB-049) |
| [89](./followups/89-recovery-screen.md) | The recovery screen for both apps (MOB-053): when a screen throws while drawing, an error boundary shows «Algo salió mal», the note «No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve a pasar, cierra la app y ábrela otra vez.», and «Reintentar» as the plain empty state with an action, replacing only the failed screen; one «Pantalla de recuperación» card in the design system and a README section | 🕓 pending |
| [90](./followups/90-payment-qr-only.md) | `10`'s QR card (PAY-003): the «Emma Pilates Studio S.R.L.» and «Banco Nacional · Cta. 4501 8823 01» lines under the QR are removed in both frames, so the studio QR is the only transfer instruction; the README's `10` inventory row says so | ✅ applied |
| [91](./followups/91-push-permission-sheet-and-settings-notice.md) | Push notifications (NOT-002): a design-system card for the «¿Te avisamos?» permission sheet in its Client and Staff copy, shown after a confirmed booking, a Waitlist join, or a confirmed Evaluation and on a Staff role's first home; a «Notificaciones desactivadas» frame on `19` and `S20` with the «Abrir Ajustes» notice; a README «Push notifications» section | 🕓 pending |
| [92](./followups/92-show-password-control.md) | The show/hide password control (MOB-059, WEB-022): every password input of `01`, `21`, `23`, `24`, `S01`, `S19`, `S23`, `AW01`, `AW32`, and `AW33` carries a 20 px outline eye inside its right end (44 px touch target on mobile, 40 px on the admin web), starting hidden; a tap shows the text with the eye-off and keeps the value and cursor, labelled «Mostrar contraseña» / «Ocultar contraseña»; a «Campo de contraseña» card in the design system's «Fundamentos» and a README «Inputs» bullet | ✅ applied (Claude Design export 2026-10-16, `7567c679`; the apps are built in MOB-059 and WEB-022) |
| [93](./followups/93-busy-buttons.md) | The busy state (MOB-060, WEB-023): from the tap until the request answers, the primary button and the Error-outline destructive button keep their fill, border, and size, a spinner replaces the label (native small indicator on mobile, a 16 px ring on the admin web; white on the primary, Error on the destructive), taps are ignored, and screen readers hear it busy; one «Ocupado» sample in the Primario row, one busy destructive sample, and a README «Buttons» bullet | ✅ applied (Claude Design export 2026-10-15, `1936d7e7`; the apps are built in MOB-060 and WEB-023) |
| [94](./followups/94-branded-loading-state.md) | The branded loading state (MOB-061): a screen's first load shows only the studio's logo (`emma-logo.png`, transparent), centred in the content area between the header and the tab bar, 240 px on phones and 300 px on tablets, after a 400 ms delay and a 300 ms fade, breathing every 2.8 s between opacity 0.55 / scale 0.96 and 1 / 1, still under Reduce Motion, announced with the screen's Spanish label; a new design-system section «08 · Carga», a README «Loading state» subsection and «Assets» line | ✅ applied (Claude Design export 2026-10-16, `8b29e95b`; the apps are built in MOB-061) |
| [95](./followups/95-payment-qr-expand-and-save.md) | `10`'s studio QR (MOB-062): drawn whole at its own proportions in a 190 px box and tappable, «Ampliar» and «Guardar QR» text actions under it, a new light full-screen «QR ampliado» frame with «Cerrar» and a «Guardar QR» primary button, the «QR guardado en tus fotos.» notice and the refusal line; the README's `10` row and one interactions bullet | ✅ applied (Claude Design export 2026-10-15, `b8959dce`; the app side is built in MOB-062) |
| [96](./followups/96-create-from-empty-slot.md) | A new Session from an empty slot (WEB-024): on `AW02`'s desktop grid an hour no Session fully covers shows, on hover and keyboard focus, a Hover de fila fill, a dashed Palo de rosa border, and «+ HH:00», and opens `AW03` in create mode with Fecha and Hora filled in (one slot drawn focused, Jue 13 10:00); a new `AW03` frame «Escritorio · Nueva sesión desde un espacio libre»; the README's `AW02` and `AW03` rows and one admin navigation bullet; the 420 px day list is unchanged | ✅ applied (Claude Design export 2026-10-15, `8667e7ed`; the admin web is built in WEB-024) |
| [97](./followups/97-weekly-multi-day.md) | «Cada semana» with several days (WEB-025): `AW03`'s weekly frame swaps «Día de la semana» + «Hora» for a «Días y horas» group (one row per day with Día, Hora, the Class Type's duration read-only and a remove button; «+ Agregar día» up to seven; Lunes 07:00, Miércoles 07:00, Viernes 18:30 drawn), a new «día repetido» frame with the row error «Ya está el lunes a las 07:00.», and the README's `AW03` row; every row saves together or none and stays its own schedule | ✅ applied (Claude Design export 2026-10-16, `1aa26ab4`; the admin web and backend are built in WEB-025) |
| [98](./followups/98-session-owned-duration.md) | A Session owns its duration (WEB-027, booking ADR-0004): `AW03`'s one-off create and edit frames and «Esta y las futuras» gain «Duración» (AW07's control moved here, 5–240, 60 to start), each «Cada semana» row swaps the read-only minutes for its own Duración box (Lunes 07:00 · 60, Miércoles 07:00 · 60, Viernes 18:30 · 90); `AW06` drops the Duración column and `AW07` drops the field, with a «Sin duración» note; the README's AW03, AW06, and AW07 rows | ✅ applied (Claude Design canvas, 2026-10-16) |
| [99](./followups/99-weekly-row-widths.md) | Weekly row widths (WEB-027): in `AW03`'s two «Cada semana» frames each «Días y horas» row becomes `minmax(0,1fr) 104px 88px 30px`, giving the native time control back its 104 px, and each row's Duración input is text with a numeric keyboard (no spinner) | ✅ applied (Claude Design canvas, 2026-10-16) |
| [100](./followups/100-close-account-promotions-consent.md) | Promotions box and erasure note on «Cerrar mi cuenta» (BE-021, ADR-0097): `24`'s note under the consequence card says the name, email, phone, and photo are erased and the payments and classes stay without them; an unticked «Quiero seguir recibiendo promociones de Emma Pilates» checkbox with its helper sits above «Contraseña» (ticked only in the Android frame); «Pago en revisión» and «Después de cerrar» untouched | ✅ applied (Claude Design canvas, 2026-10-19) |
| [101](./followups/101-admin-closure-erasure-line.md) | The erasure line in `AW22`'s «Cerrar cuenta» dialog (WEB-029, ADR-0097): the last consequence bullet «Su historial se conserva, pero deja de verse en la app y en las listas.» becomes «Se borran su nombre, correo, teléfono y foto. Sus pagos y clases se conservan sin sus datos, para la contabilidad del estudio.» in the three dialog frames; no promotions box for the Administrator | ✅ applied (Claude Design canvas, 2026-10-20, `5b5c4dd9`; the admin web is built in WEB-029) |
| [102](./followups/102-aw17-contacts-entry.md) | `AW17` opens the new `AW35` (BE-022, ADR-0097): a neutral outline «Contactos para promociones» button left of «Nueva promoción» in the three frames with a title row (full-width in the narrow one); the README gains the `AW35` row and the `AW17 ↔ AW35` navigation | ✅ applied (Claude Design canvas, 2026-10-20, `e103e4cc`, with `AW35` in `417f2b61`; the admin web is built in BE-022) |
| [103](./followups/103-profile-promotions-switch.md) | Perfil gains a promotions switch (BE-023, ADR-0098): `18`'s «Promociones» card between the menu and «Cerrar sesión», with «Recibir promociones de Emma Pilates», its helper, and a Palo de rosa switch (on with photo, off without); registration `01` does not ask | ✅ applied (Claude Design canvas, 2026-10-20, `95d4a7ea`; the Client app is built in BE-023) |
| [104](./followups/104-aw35-live-clients.md) | `AW35` lists live Clients too (BE-023, ADR-0098): the subtitle names both kinds, a «Tipo» column with «Activa» and «Cuenta cerrada» pills, a «Confirmación · Clienta activa» frame whose account stays, the empty note and notes card name Perfil's switch | ✅ applied (Claude Design canvas, 2026-10-20, `c2c4d1c0`; the admin web is built in BE-023) |
| [105](./followups/105-admin-recovery-state.md) | The recovery state for the admin web (WEB-032): when a page throws while drawing, the main area shows «Algo salió mal», the note «No pudimos mostrar esta página. Inténtalo de nuevo; si vuelve a pasar, recarga la página.», and a large «Reintentar» primary button as the plain empty state on Superficie, keeping the sidebar and the top bar; a «Recovery state» subsection in the README's shell section, no numbered screen changes | ✅ applied (Claude Design canvas, 2026-10-21, `a5b2bc78`; the admin web is built in WEB-032) |
| [106](./followups/106-launch-screen.md) | The launch screen (MOB-068): from the tap on the icon until the first screen is ready, both apps show `emma-logo.png` centred on `#F3E9E7` (the icons' blush edge tone), 240 pt wide on iOS and 160 dp on Android (inside Android 12's icon circle), then a 300 ms fade; a «Pantalla de inicio» card inside «08 · Carga» and a «Launch screen» README subsection, no numbered screen changes | ✅ applied (Claude Design canvas, 2026-10-21, `38985f82`; the apps are built in MOB-068) |
| [107](./followups/107-admin-loading-state.md) | The loading states of the admin web (WEB-035): only the logo, as follow-up 94's mobile state, centred on Crema for the whole viewport on the first load (no delay) and in the main area on Superficie after 400 ms on a page switch, keeping the sidebar and the top bar; a second card «En la web de administración» in section 08 of the design system and a «Loading states» subsection in the README's shell section, no numbered screen changes | ✅ applied (Claude Design canvas, 2026-10-21, `7f49aa06` as follow-up 106; renumbered 107 and exported again on a second canvas over `main`'s launch-screen card when the branch merged `main`; the admin web is built in WEB-035) |
| [108](./followups/108-impersonation-entry-and-banner.md) | The «Ver la app como…» row on `S23`'s Administrator frame (opens the new `S24`), the fixed Palo de rosa profundo impersonation banner («Viendo como {name}» over «{role} · Quedan {n} min», «Salir») in one new frame each on `S02`/`S04`/`S15`, a «Franja de suplantación» card in the design system's section 06, and the README (`S24` row, «Impersonation banner (Staff)», navigation) (FUT-001, ADR-0100) | ✅ applied (Claude Design canvas, 2026-10-22, `e81417e9`: the two-line banner settled before sending, `85f89753`; the app side is stage 3 of FUT-001) |
| [109](./followups/109-assistant-refuse-early.md) | The Assistant's flows refuse early (UX-003, UX-001 findings S2 and S3): `S07`'s phone and tablet frames mark the Session the Client already booked with the neutral «Ya reservada» pill, `S08` gains a fourth phone frame «Ya reservada» whose action zone holds only «La clienta ya tiene esta clase reservada.», `S06`'s active phone frame and a new «Tablet · Plan activo» frame disable «Registrar pago en efectivo» with «Podrá comprar otro plan cuando este termine.», and the README's `S06`/`S07`/`S08` rows and seat-pill rules say so | ✅ applied (Claude Design canvas, 2026-10-22, `58d20bd9`; the Staff app is built in UX-003) |
| [115](./followups/115-lists-refresh-on-focus-and-pull.md) | Every list refreshes when it regains focus and on pull (UX-004, UX-001 finding C1): one bullet in the README's «Loading state (Client and Staff)» naming the background refetch and the native pull-to-refresh control in Palo de rosa; no numbered screen changes (109–114 are reserved by UX-003, UX-005, UX-006, UX-009, UX-010 and UX-012) | ✅ applied (Claude Design canvas, 2026-10-22, `7b761df1`; the apps are built in UX-004) |
| [170](./followups/170-aw02-equipment-flags.md) | `AW02` flags a future Session with more places than working Equipment of its kind (warning triangle, Advertencia border, «Faltan equipos») with a notice above the week linking to the new `AW37`, and the sidebar gains «Equipos» after «Insumos» (BKO-004, ADR-0106) | ✅ applied (Claude Design canvas, 2026-10-23, `db041514`; the canvas could not be deleted from the agent session, see BKO-004) |
| [171](./followups/171-s03-report-fault-entry.md) | `S03` gains the quiet «Reportar una falla» action under the Session line, opening the new `S26` (BKO-004, ADR-0106) | ✅ applied (Claude Design canvas, 2026-10-23, `db041514`; the canvas could not be deleted from the agent session, see BKO-004) |

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
