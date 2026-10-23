# Follow-up — every list refreshes on focus and on pull

Targets: **generated handoff `design/README.md`** (one new bullet in «Loading
state (Client and Staff)», under «Design tokens»). No numbered screen
changes and no design-system change: nothing new is drawn, the control is
the platform's own. Send [30](./30-invariants-checklist.md) alongside this
follow-up.

---

Written by UX-004 on 2026-10-22. The UI/UX audit (UX-001, finding C1) found
that the Client app's tab screens fetched once when the tab first mounted
and never again while the app ran: a booking made at the front desk, or a
payment confirmed by the Administrator, stayed invisible on Mis reservas and
Mi plan until the app restarted, and only Inicio offered pull to refresh. The
Home prompt (`02`) specifies pull to refresh; no other prompt says how a list
keeps itself current, so the design gains the rule here. The apps are built
from the sentence below; the export is a handoff-accuracy change only.

## 1. The rule

Every list in both apps (Inicio, Reservar, Mis reservas, Historial, Mi plan,
Mis evaluaciones, Mis referidos, Mi crédito, Notificaciones, and the Staff
roots: Mi agenda, Buscar cliente's results, Pagos pendientes, the
Nutritionist's agenda and Mi disponibilidad):

- **refreshes when it regains focus**: coming back to a tab, or returning
  from a screen it opened, refetches its data in the background. What is on
  screen stays until the fresh answer replaces it; the logo of the loading
  state is for the first load only, never for a refresh.
- **refreshes on pull**: the platform's own pull-to-refresh control, tinted
  **Palo de rosa `#B78380`** on iOS and Android, on white on Android. It
  spins only while the list refetches; the list stays in place under it.

## 2. README

In «Loading state (Client and Staff)», after the bullet «Not for busy
buttons, pull-to-refresh, …», add:

> - Every list refreshes in the background when it regains focus (a tab
>   comes back, a screen it opened closes) and on pull, with the native
>   pull-to-refresh control in Palo de rosa; what is on screen stays until
>   the fresh answer replaces it.

## What must remain untouched

Every numbered screen and `Sistema de Diseño`; every other bullet of
«Loading state (Client and Staff)» and every other README section.
