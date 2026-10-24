# Follow-up — rule copy comes from the Studio Settings

Targets: the generated handoff `design/README.md` only (a «Studio rules in
copy» subsection under the shared conventions). No numbered screen changes:
every frame keeps its sample text. Send
[30](./30-invariants-checklist.md) alongside.

---

Written by BKM-004 on 2026-10-23. ADR-0101 keeps the studio's configurable
rules in one Studio Settings record, and the apps now read the client-facing
ones from the API instead of carrying them in their copy. The design keeps
drawing today's values; the README must say they are values, not fixed text,
so no export «corrects» the built apps back to a constant.

## The README subsection

Add **Studio rules in copy** with these bullets:

- «2 h 30» wherever the Cancellation Window is named (`05`'s «No cancelable»
  edge, `09`'s «Cancelación sin costo hasta 2 h 30 antes de cada clase.»,
  `S21`'s card actions, `AW03`'s «aunque falten menos de 2 h 30») is the
  Studio Settings' Cancellation Window written as «2 h 30», «3 h», or
  «45 min». While the apps cannot read it, `09` leaves that line out, `05`
  and `S21` offer neither «Cancelar» nor «Reprogramar» on a booking, and
  `AW03` drops the «aunque falten menos de …» clause.
- `02`'s «Paquetes desde Bs 560.» is the lowest price among the Plans the
  Client app shows (hidden Plans excluded), written as `formatBolivianos`
  does («Bs 80», «Bs 1.050»). While it is unknown the card says only «Puedes
  pagar en el estudio o desde la app.»
- The values change on `AW36` (follow-up 130) or with a release, and reach
  the apps within a minute without a store update.

## Leave untouched

Every screen file and every other line of the README; checklist 30's «2 h 30
window» invariant still holds for the sample text.
