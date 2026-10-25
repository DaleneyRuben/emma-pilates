# Follow-up — the gift class on the Client summary

Targets: **S06 (Resumen del cliente · Asistente)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-008 on 2026-10-23 from decisions §5.2 and booking ADR-0006.
The Assistant reads the same extra class the Client sees on Mi plan. `S06`
shows the remaining classes of the Plan and does not say an extra class is
there. The Staff app now shows the line the API returns.

## `S06` — the extra-class line

On the phone frame that shows an active Plan, and on the tablet frame that
shows the same Plan, add one line directly under «N clases restantes», in
the body text of the plan card:

«Clases extra: 1 · Regalo de bienvenida»

The same line with another origin when the grant is not the gift: «Clases
extra: 1 · Invitación», «Clases extra: 2 · Campaña», «Clases extra: 1 ·
Cortesía», «Clases extra: 1 · Clase devuelta». Draw only the gift line. When
no extra class remains, the line is absent. The expired and no-plan frames
do not gain it.

## Leave untouched

The remaining-classes line, «Vence el», the cash-payment control and its
disabled note, the pending-invitation card, and every other screen.
