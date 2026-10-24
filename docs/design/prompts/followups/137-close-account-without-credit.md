# Follow-up — Cerrar mi cuenta without a Credit line

Targets: **24 (Cerrar mi cuenta)** and the **generated handoff
`design/README.md`** (the `24` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-005 on 2026-10-23. Credit is retired (booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md)),
so closing an Account forfeits no Credit and the consequences never mention
it.

## Changes

- Remove the line **«Pierdes tu crédito de Bs 120,00.»** from every frame
  that draws it (three places). The lines above and below close the gap.
- The first frame's caption «iOS · Con plan, reservas y crédito» becomes
  **«iOS · Con plan y reservas»**; the empty-state caption «Sin plan,
  reservas ni crédito: …» becomes **«Sin plan ni reservas: …»** with the rest
  of the sentence unchanged.
- The description above the frames ends «…qué pasa con sus reservas y su
  plan» instead of «…su plan y su crédito».

## Handoff README

`24`'s row drops «credit forfeited» from the list of consequences.

## Leave untouched

Every other consequence line, the password field, the promotions checkbox,
the confirmation button, and the success state.
