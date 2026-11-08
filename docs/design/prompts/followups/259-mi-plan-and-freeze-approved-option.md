# Follow-up — Verification findings 51 and 54: the owner's choice

Targets: the same screens as [258](./258-mi-plan-hierarchy-and-freeze-proposals.md).
A decision record over the export in `design/v2/propuestas-congelar/`; no
board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-08 for DES-015. The owner chose **A** for both screens
(«me gustan más la opción A») and said a Client may withdraw her request
(«una clienta podría retirar su solicitud de congelamiento»).

From here on, read these boards over C12 and 257:

1. **Mi plan — A «La tarjeta es el foco»** (`A-Mi-plan`). The maroon plan
   card is the only coloured block. Notices (founder deadline, ending soon,
   next plan) are a list without a fill, one icon each. The freeze is a
   neutral card with a status pill: «En revisión», «Aprobado»,
   «Congelado», «No aprobado». Renovar and Congelar are chevron rows under
   «Tu plan». No bottom **Reservar una clase**: the tab bar has Reservar.
2. **Congelar plan — A «Calendario del mes»** (`A-Calendario`). A month
   grid, Monday first, ‹ › between the term's months; tap the first day,
   then the last; off days muted and explained when tapped; the summary
   (Del … al … · N días · «Tu plan vencerá el …», «antes, el …»), the
   «Motivo» field and **Enviar solicitud**. The grid is the reusable
   `Calendar` component.
3. **Withdraw.** The «En revisión» card gets **Retirar solicitud** (the
   dashed outline on the board only marked it optional). It asks to
   confirm, then the card goes and «Congelar plan» comes back.

The refusal copy and the common points of 257 and 258 stand.
