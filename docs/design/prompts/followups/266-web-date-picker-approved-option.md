# Follow-up — Walkthrough findings 82 and 83: the owner's choice

Targets: the same surfaces as [265](./265-web-date-picker-proposals.md).
A decision record over the export in `design/v2/propuestas-fecha-web/`; no
board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-15 for DES-018 and FIX-059. The owner chose **A ·
Calendario bajo el campo** and approved the dateless draft («A y apruebo»).

## The date field (finding 83)

Every admin web date is 265's option A, as `Selector.dc.html` and
`OpcionA420.dc.html` draw it:

- the typed «dd/mm/aaaa» field stays, with a calendar button inside it on
  the right («Abrir el calendario de …»);
- clicking the field or the button opens one month in a small floating
  calendar right under the field (above it when there is no room), aligned
  to the field's right edge when the field is the right one of a pair;
- Monday first, «‹ Noviembre 2026 ›», a picked day a filled Rosa profundo
  circle with white text, a range's band in Rosa tinte, a ring on today,
  days outside the field's limits muted and struck through; clicking one
  says why under the grid;
- «Hoy» and «Borrar» at its foot; picking a day writes it and closes; Esc
  closes without a change;
- «Fecha de fin» opens on the start's month and cannot pick a day before
  the start; a past-only field (Gasto, pago, informe) cannot pick after
  today.

Options B and C are not built.

## A draft without dates (finding 82)

**Guardar borrador** saves a new Promotion with only its title and
description (and its image if there is one); the dates are optional on a
draft. **Publicar** still needs the image, the title, the description and
both dates, and stays disabled until they exist. A draft with only one of
the dates is allowed; a typed date that is not real, or an end before the
start, is still refused on its field.
