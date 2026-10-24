# Follow-up — Invita a una amiga

Targets: **16 (Mis referidos)**. Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by BKM-014 on 2026-10-23 from decisions §5.3 and booking ADR-0009.
The Bs 60 credit is retired. Screen `16` stops being «Mis referidos» and
becomes «Invita a una amiga»: the host's code, and each invitation's status.
PAY-005's placeholder «Pronto podrás invitar a una amiga a una clase gratis»
is what this replaces. No export exists for this item, so the Client app is
built to this text and this follow-up stays pending.

## `16` — the invitation

Rename the top bar from «Mis referidos» to «Invita a una amiga» in every
frame, phone and tablet.

Keep the code card: «Tu código», the code, and «Compartir». Replace the
explanation under it with:

«Comparte tu código. Tu amiga recibe una clase gratis, una sola vez. Cuando
compre su primer plan, tú ganas una clase.»

Remove the «Tu crédito» row and every credit amount. The credit screen is
removed when PAY-005 (#157) merges; this screen no longer links to it.

Each invitation row keeps the initials, the abbreviated name, and the date.
Replace the badge:

- registered, class not taken: «Registrada»
- class booked: «Clase reservada»
- she bought her first Plan: «Compró su plan»

The empty state reads «Aún no has invitado a nadie. ¡Comparte tu código!».

## Leave untouched

The code card's shape, the share action, the row layout, and every other
screen. Screen `17` (Mi crédito) stays until PAY-005 removes it.
