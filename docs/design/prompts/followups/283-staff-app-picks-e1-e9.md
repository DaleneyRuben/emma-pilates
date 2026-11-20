# Follow-up — Staff app: the owner's picks E1–E9

Targets: staff app screens Mi agenda (trainer), Liquidación, Registrar pago
(`S10`), Ficha de la clienta (`S06`), Agenda de la nutricionista, Lista de la
clase (`S03`), the Assistant's new «Hoy», Mis pagos, and Revisar
congelamiento.
A decision record; no board is regenerated in this round. The approved
canvas https://claude.ai/artifact/Xi8xjc1NvQ8uVK8f51tzpW stays the reference
(boards `E1B`, `E2B` + `E2C`, `E3C`, `E4A`, `E5B`, `E6B` + `E6A` = `E6C`,
`E7A`, `E8A` / `E8B`, `E9A` + `E9B` = `E9C`). Read
[280](./280-base-comun-palette-b.md) and
[282](./282-client-app-picks-c1-c8.md) first; send
[30](./30-invariants-checklist.md) alongside when the screens are
regenerated.

---

Written on 2026-11-19 from the owner's per-screen picks
(`DECISIONES-AUDITORIA-2026-11-19.md`, «App del equipo»). From here on, read
these screens this way instead of earlier prompts. The mockups simplify the
data: every field and action the screens had before stays, placed quietly.

## E1 · Mi agenda (B)

A week strip with each day's class count; the next class as the Clase E
hero with who is coming in Crema initials circles (five, then «+N»; tapping
it opens the list); the rest as rows; cancelled classes folded at the end.
The bell and «Hoy» stay.

## E2 · Liquidación (B, detail E2C)

The total in a Palo de rosa block with its state; Crema rows per concept
(Clases dictadas / Canceladas por mínimo / Comisiones); a concept opens its
classes by day with the day's count and sum. Payment state, receipt and the
proportions bar stay.

## E3 · Registrar pago (C)

A Palo de rosa block with the Client's initials, plan, «A cobrar», price and
discount; Efectivo / QR as large options (chosen in Rosa profundo) saying
what happens next; «Empieza» as a day strip; «Pide factura» as a switch that
reveals NIT and name; one button «Confirmar Bs N en efectivo / por QR». No
Rubor fills.

## E4 · Ficha de la clienta (A)

The plan in a Palo de rosa block, the Freeze on its own row, the role's
actions on top (Administrator and Assistant: «Reservar clase» and
«Registrar pago»; Coordinator: «Escribir por WhatsApp», «Llamar», the last
contact and «Anotar contacto»), then the rows. Pagos and Evaluaciones rows
wait for staff read endpoints.

## E5 · Agenda de la nutricionista (B)

The next appointment in a Palo de rosa block (day, time, client initials,
first or paid) with «Escribirle por WhatsApp» and «Cancelar evaluación»;
the rest under «Después».

## E6 · Lista de la clase y asistencia (B then A)

Before the class: «Empieza en N min» with places and new clients, «Quién
viene» with initials and a note for a first class, «Tomar asistencia».
Once it starts (or on that button): «En curso · termina HH:MM · Marcadas N
de M» and «Vino» / «No vino» per client. Saving still waits for the start
(owner's rule of 2026-11-03). «Reportar una falla de equipo» stays.

## E7 · Inicio de la asistente (A)

A first tab «Hoy»: «Hoy en <sucursal>», the client search, «¿No está? Crear
clienta nueva», the next class hero with who is coming, pending rows
(«Facturas por subir», «Cerrar caja») and the later classes. Tabs: Hoy /
Clientas / Horario / Caja / Perfil. Transfer receipts to review stay with
the Administrator, who alone confirms them.

## E8 · Mis pagos (A for coordinator and nutritionist, B for the assistant)

Coordinator and Nutritionist get a «Mis pagos» tab; the Assistant gets
«Mis pagos» and «Mi QR de cobro» rows in Perfil. Perfil keeps everything it
had ([ADR-0111](../../../adr/0111-every-paid-staff-member-reads-her-own-pay.md)).

## E9 · Revisar congelamiento (A + B, board E9C)

Review: the client with initials, dates, plan, plan end before and after,
her reason; «Aprobar» decides there. «Rechazar con un motivo» opens the
refusal step: reason chips, an optional message, a Crema notice «Esto no se
puede deshacer», «Rechazar y avisar a <clienta>» and «Volver». The reason
is stored (FIX-091) and shown on a refused freeze as «Motivo del rechazo».
