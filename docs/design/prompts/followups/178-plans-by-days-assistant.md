# Follow-up — Plans by days in the Assistant's cash flow

Targets: `S09` (Elegir plan, Asistente) and `S10` (Confirmar pago en
efectivo). Send [30](./30-invariants-checklist.md) and
[175](./175-plans-by-days-admin.md) alongside.

---

Written by BKM-005 on 2026-10-23 ([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md),
[ADR-0006](../../../../booking/docs/adr/0006-weekly-cap-and-extra-classes.md)).
`S09` keeps catalogue parity with `08` (follow-up 176).

## `S09` Elegir plan

- The cards are the eight Plans of follow-up 175, with the same terms line as
  `08`: «{n} clases · válido por {d} días», plus « · hasta {c} por semana»
  on a capped Plan. The credit frames keep their struck price and the
  amount after credit, recomputed on the new prices (Bs 60 of credit: «8
  clases» Bs 590 → Bs 530).

## `S10` Confirmar pago en efectivo

- The «Plan elegido» card reads «8 clases» with «8 clases · válido por 30
  días» under it, «Precio del plan Bs 590», «Crédito aplicado − Bs 60»,
  «Monto a cobrar Bs 530».
- The success frame's date line «Pagado hasta el 13 de septiembre de 2026»
  becomes «Vence el 13 de septiembre de 2026».

## Leave untouched

The client banner, the branch line, the buttons and their busy states, the
tablet layouts, and every other screen.
