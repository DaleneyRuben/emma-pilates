# Follow-up — Verification finding 62: the availability time picker (proposals)

Targets: **S17 Nuevo horario / Editar horario**, the sheet behind «Hora de
inicio» and «Hora de fin», as proposals only, on a canvas of their own
exported to `design/v2/propuestas-hora/`. Read with
[74](./74-picker-sheet-selected-row.md) (the selected row in picker sheets)
and [225](./225-visual-system-v2.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: a later follow-up records what the owner chose.

---

Written on 2026-11-15 for DES-016 (walkthrough verification finding 62).

## Why

On Gabriela's Disponibilidad → Nuevo horario, «Hora de inicio» opens a
sheet holding a four-column grid of bordered buttons, one every 15 minutes
from 6:00 to 22:00 (65 cells), with «Volver» at the bottom. «Hora de fin»
opens the same grid, including times that cannot end the block. The owner:
«no me gusta este diseño, se ve muy cargado».

The sheet is used only by S17 (both frames). The admin web types a time
(`hh:mm`) and the client app picks no times, so nothing else changes.

The rules every option keeps (`availability-block-form-screen.tsx`,
`slotMinutes`):

- 15-minute steps, from 6:00 to 22:00;
- the block is at least 45 minutes long (one Evaluation turno), so the end
  is never before or equal to the start;
- the start is at most 21:15, the end at least 6:45;
- if a new start leaves the end less than 45 minutes later, the end goes
  back to «Elegir».

## The canvas

`Main.dc.html` (1440 wide) names the three options (A recommended) and the
rules. One 390 × 844 clickable board per option shows S17 Nuevo horario
(Jue, Achumani, no times yet) with its sheet open on «Hora de inicio»: pick
a start, confirm, open «Hora de fin», pick an end, and the «N turnos de 45
min» line updates. `Hoy.dc.html` shows today's grid for comparison; the
reference boards are S17 Nuevo and Editar horario unchanged.

### A · Rueda (recommended)

The sheet holds two wheel columns, hours and minutes (00, 15, 30, 45),
five rows tall, with the chosen row in a Lino band in the middle; tapping
a row brings it to the middle. Above the wheel the chosen time reads large
(Lora); for «Hora de fin» a line beneath says the length and turnos («3 h
· 4 turnos de 45 min»). Times the end cannot take are drawn faint and
cannot be chosen. **Listo** (primary) confirms; the backdrop or «Volver»
closes without changing.

### B · Hora y cuartos

The chosen time reads large at the top. Under «Hora», one row of hour
chips (6 to 21, or 22 for the end) that scrolls sideways, like S17's date
strip, the chosen hour in Palo de rosa. Under «Minutos», the app's
segmented control with :00, :15, :30, :45. An hour or quarter that would
break the 45-minute rule is disabled. Same length line and **Listo** as A.

### C · Lista corta

A plain list like the Branch picker sheet (74): rows without borders,
hairline dividers, the chosen row in `#8A5D59` with its check, grouped
under «Mañana», «Tarde» and «Noche». It opens scrolled to the chosen time
(or 9:00). «Hora de fin» lists only valid ends, each with its length and
turnos on the right («17:00 · 3 h · 4 turnos»). Tapping a row picks it and
closes the sheet; there is no Listo.

## Preserve everything else

S17's day pills, Branch line, «A partir del» strip, turnos line, Guardar
and «Eliminar horario» stay as exported. The field labels «Hora de inicio»
and «Hora de fin» and the «Elegir» placeholder stay.
