# Follow-up — Staff cash payment names a fixed renewal start

Targets: **S10 (Confirmar pago en efectivo · Asistente)**, its phone and
tablet frames; the **generated handoff `design/README.md`** (`S10` inventory
row). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-019 item (1) on 2026-10-30
([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)).
Follow-up 219 drew the fixed start on Client `09` and left `S10` untouched.
The desk still offers «Fecha de inicio» chips on a renewal the server ignores:
the new Plan starts the day after the current one ends while classes remain.

## `S10` Confirmar pago en efectivo

Add one frame, «iOS · Renovación con clases», beside the existing confirmation:

- In place of the «Fecha de inicio» chip row, one body line: «El nuevo plan
  empieza el 13 de octubre, al terminar el actual.» Same style as the
  validity line under the plan name. Third person: the Assistant speaks of
  the Client, not «tu».
- The footnote above «Confirmar pago recibido» reads «Confirma solo cuando
  tengas el efectivo en mano. El plan queda programado para esa fecha.»: the
  Plan does not start at once, so «El plan se activa al instante.» would
  contradict the line above.
- Everything else as the existing frame: the price breakdown, the Branch
  chips, «Datos para la factura», the receipt photograph, and «Confirmar
  pago recibido».

The existing frame (chips, «Hoy» selected, «El plan se activa al
instante.») stays for a first purchase and for a renewal with nothing left.

## Leave untouched

Every other screen, including Client `09`.
