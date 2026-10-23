# Follow-up — the gift class on the admin Client detail

Targets: **AW22 (Detalle de cliente)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-008 on 2026-10-23 from decisions §5.2 and booking ADR-0006.
The Administrator reads the same extra class on the Client detail. `AW22`
shows «Clases disponibles» and does not say an extra class is there. The
admin web now shows the line the API returns, as its own sentence, not as a
second «Clases extra» label.

## `AW22` — the extra-class line

On the desktop side panel and the narrow frame that show an active Plan, add
one line inside the Plan block, under «Clases disponibles», in the note text
of the panel:

«Clases extra: 1 · Regalo de bienvenida»

The same sentence with another origin when the grant is not the gift:
«Clases extra: 1 · Invitación», «Clases extra: 2 · Campaña», «Clases extra: 1
· Cortesía», «Clases extra: 1 · Clase devuelta». Draw only the gift line.
When no extra class remains, the line is absent. The expired and no-plan
frames do not gain it. Do not add a form for courtesy or a class return;
that form is PAY-006.

## Leave untouched

«Clases disponibles», the contact block, Credit, referrals, «Cerrar cuenta»,
and every other screen.
