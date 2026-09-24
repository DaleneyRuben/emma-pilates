# Follow-up — Back Office controls the admin web now has

Targets: **Sistema de Diseño (Prompt 00)**, **AW34 (Selector de sucursal)**,
**AW08 (Insumos)**, **AW09 (Formulario de insumo)**, **AW10 (Registrar
retiro)** and follow-up 48's **Registrar reposición** panel, **AW31 (Retiros e
insumos consumidos)**, **AW11 (Nómina)**, **AW12 (Formulario de pago de
sueldo)**, **AW13 (Gastos)**, **AW14 (Formulario de gasto)**, **AW15
(Categorías de gasto)**. Send [30](./30-invariants-checklist.md) (with the
corrections carried by [31](./31-plan-naming-leftovers.md),
[40](./40-cancellation-window-wording.md), and
[48](./48-insumos-record-restock.md) §6) and the still-pending
[48](./48-insumos-record-restock.md), [49](./49-supply-form-archive.md), and
[50](./50-record-withdrawal-stock-limit.md) alongside this follow-up.

---

WEB-007 built these screens against `back-office/CONTEXT.md`, the Context Map,
and BKO-001 (D2–D19, Q1–Q3). In a few places the screens leave out a state the
domain has, or scope a page the design system lists differently. Apply only
the changes below.

## 1. `Sistema de Diseño` and `AW34` — Categorías de gasto is studio-wide

An Expense Category is a studio-wide label (BKO-001 D13): the same
«Reparación» groups the Expenses of every Branch, and the category list has no
Branch of its own.

- In the design system's navigation section, the pages where the Branch
  selector is shown and ignored become **Nómina, Clientes, Referidos,
  Créditos, Pagos, and Categorías de gasto**.
- `AW34`'s studio-wide frame gains the same note for Categorías de gasto:
  «Esta página no se filtra por sucursal — las categorías de gasto son del
  estudio, no de una sede.»
- `AW15` draws no Branch column and its subtitle reads «Todo el estudio ·
  agrupan los gastos de cada sucursal en el reporte.»

## 2. `AW08` — What the Insumos table says

- Subtitle: «Sucursal Centro · 2 con stock bajo», or «Sucursal Centro · ningún
  insumo con stock bajo».
- The status column is headed **Estado**; its only value is the Advertencia
  pill «Stock bajo». In the narrow card layout, a Supply without the pill
  shows no Estado row at all.
- The footer reads «Mostrando 1–3 de 3 insumos». With no Supply yet, the
  table body says «Todavía no hay insumos en esta sucursal.» and «Crea el
  primero con «Nuevo insumo».»
- After a change, the page shows one Éxito line: «Insumo «Toallas» creado con
  12 unid.», «Retiro registrado: quedan 9 unid. de Detergente.»,
  «Reposición registrada: ahora hay 42 unid. de Detergente.», or «Papel
  higiénico se archivó: sus retiros siguen en el historial.»
- The sidebar's Insumos count is the selected Branch's Supplies at or below
  their threshold, in the Advertencia tint, and follows the Branch selector.

## 3. `AW09` — The stock is typed once

- **Nuevo insumo**: under «Cantidad en stock», «Solo al crearlo: después
  cambia con retiros y reposiciones.»; under «Umbral de alerta», «Con esta
  cantidad o menos, Insumos lo marca con stock bajo.»
- **Editar insumo**: «Cantidad en stock» is a read-only row on Superficie
  («2 unid.») with «Cambia solo con «Registrar retiro» y «Registrar
  reposición».» under it.
- A second active Supply with the same name at the Branch is refused on the
  Nombre field: «Ya hay un insumo activo con ese nombre en esta sucursal.»

## 4. `AW10` and Registrar reposición — The Insumo list

- Each option names the stock beside the Supply: «Detergente (12 unid.)».
  With no Supply at the Branch the field says «No hay insumos en esta
  sucursal.» and «Registrar» is disabled.
- When someone else withdrew first, the panel re-reads the stock and shows
  follow-up 50's error with the new figure («Máximo: 1 unid.», «Solo hay 1
  unid. en stock.»).
- Registrar reposición has no maximum; «Cantidad repuesta» takes whole units
  from 1.

## 5. `AW31` — Moving through months

- The back link above the title reads «Volver a Insumos».
- The month picker is a pair of compact neutral arrows around the month's
  name («septiembre de 2026»); the forward arrow is disabled on the current
  Bolivia month.
- The Insumo filter lists the Branch's active Supplies and then the archived
  ones as «Cera (archivado)», whose Withdrawals stay in the history.
- The summary names a chosen Supply: «3 retiros de Detergente en septiembre
  de 2026.» When nothing matches, only the empty state shows (no «0 retiros»
  line). The per-Supply footer block is headed «Consumo del mes»; the table
  keeps the usual footer («Mostrando 1–5 de 5 retiros»).

## 6. `AW11` and `AW12` — Payroll

- `AW11`: subtitle «Todo el estudio · solo registra que el pago se hizo, no
  cómo se calculó.»; an **Empleado** filter (Todos and each Staff Member)
  under the title; «Mostrando 1–2 de 2 pagos». Empty: «Todavía no hay pagos
  registrados.» or, filtered, «No hay pagos registrados para esta persona.»
- `AW12`: «Empleado» lists every Staff Member of any Role; a deactivated one
  stays choosable for a final payment and reads «Rita Salas (cuenta
  desactivada)» (BKO-001 D10). «Fecha» cannot be after today in Bolivia
  («La fecha no puede ser posterior a hoy.»).
- Notices: «Pago de Bs 3.500,00 a Emma Vargas registrado.» and «Guardamos la
  corrección del pago de Emma Vargas.» A payment is corrected, never deleted
  (BKO-001 Q1).

## 7. `AW13` and `AW14` — Expenses

- `AW13`: subtitle «Sucursal Centro»; a **Categoría** filter (Todas and each
  category) under the title; «Mostrando 1–2 de 2 gastos». Empty: «Todavía no hay gastos en
  esta sucursal.» or «No hay gastos de esta categoría en esta sucursal.»
- `AW14`: a quiet Superficie line at the top of the panel, «Se registra en la
  sucursal Centro.» (new) or «Sucursal Centro: un gasto no cambia de
  sucursal.» (edit), because an Expense keeps the Branch it was recorded in
  (BKO-001 D11).
- «+ Nueva categoría» unfolds `AW15`'s inline row under the Categoría field:
  «Nombre de la categoría» and a compact neutral **Agregar**; the new label is
  chosen straight away. When the studio has no category yet, the row is open
  and the field says «Todavía no hay categorías: crea la primera.»
- «Fecha» cannot be after today in Bolivia. Notices: «Gasto de Bs 450,50 en
  Reparación registrado en Centro.» and «Guardamos la corrección del gasto de
  Reparación.»

## 8. `AW15` — Deleting a label

- A used category shows «En uso» in Texto muy tenue beside its disabled
  delete icon, so the state never rests on the icon alone.
- The delete icon asks first: «¿Eliminar «Limpieza»?», «Deja de aparecer al
  registrar un gasto. Ningún gasto la usa.», **Volver** / **Eliminar**
  (Error outline).
- If an Expense started using it meanwhile, the page says «No puedes
  eliminarla: un gasto la usa.» and the row turns «En uso».
- The inline row's field is labelled «Nombre de la categoría»; a taken name
  says «Ya existe una categoría con ese nombre.» Notices: «Categoría
  «Limpieza» agregada.» / «… eliminada.»

## Preserve everything else

Do not change the shell, the sidebar and its two badges, the Branch selector
elsewhere, follow-ups 48–51, AW08's four header actions and their order, the
immutable Withdrawals and Restocks (no edit or delete anywhere), `AW16`, or any
screen not named in Targets.
