# Follow-up — the gift class on Mi plan

Targets: **12 (Mi plan)**. Send [30](./30-invariants-checklist.md) alongside
this follow-up.

---

Written by BKM-008 on 2026-10-23 from decisions §5.2 and booking ADR-0006.
The first real Payment of a Client's life grants one extra class. Mi plan
already shows the Plan's own remaining classes; it does not say the extra
class exists or where it came from. The Client app now shows the line the
API returns.

## `12` — the extra-class line

On the phone and tablet frames that already show an active Plan (the
«Activa» and «Por vencer» frames), add one line directly under the remaining
classes, in the body text of the plan card:

«Clases extra: 1 · Regalo de bienvenida»

The same line, and nothing else, when the origin is another grant: «Clases
extra: 2 · Campaña», «Clases extra: 1 · Invitación», «Clases extra: 1 ·
Cortesía», «Clases extra: 1 · Clase devuelta». Draw only the gift line; the
others are the same shape. When no extra class remains, the line is absent.

## Leave untouched

The remaining-classes count, the dates, «Vence el», the expired frame, and
every other screen. A founder does not receive the gift, so no founder frame
is added here.
