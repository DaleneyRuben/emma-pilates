# Follow-up — The «Cerrar caja» entries and the «Caja» sidebar row

Targets: **S04 (Buscar cliente · Asistente)**, **S11 (Pagos pendientes ·
Administración)**, **Sistema de Diseño (Prompt 00)** (the admin sidebar
card), and the **generated handoff `design/README.md`** (the new `S25` and
`AW151` inventory rows, the staff navigation bullets, and the admin sidebar
list). The new screens have their own full prompts,
[`staff/25-cash-close.md`](../staff/25-cash-close.md) and
[`admin-web/151-cierres-de-caja.md`](../admin-web/151-cierres-de-caja.md).
Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKO-003 on 2026-10-23. The owner's rules (§4.4) add a daily
**Cash Close** (`back-office/CONTEXT.md`): at the end of the day the
Assistant, or the Administrator, records the expected cash, the counted
cash, the difference, and a note, once per Branch. The Administrator
reviews the history on the admin web. Neither has a way in yet.

## 1. `S04` — «Cerrar caja» in the header

In every frame of `S04`, the root header gains a role action to the left of
the account avatar, drawn exactly as `S15`'s «Mi disponibilidad»: a pill
with a 1 px `#D8C9BB` border, 12 px horizontal and 8 px vertical padding,
the label «Cerrar caja» in 13 px `#8A5D59`. It opens `S25`. The title, the
search field, «+ Nuevo cliente», and the results stay exactly as they are;
on the tablet split view the pill sits in the search column's header.

## 2. `S11` — the same action for the Administrator

`S11`'s root header gains the same «Cerrar caja» pill, left of the account
avatar. It opens `S25` with the Branch chips (an Administrator closes any
Branch). Nothing else on `S11` changes.

## 3. The admin sidebar — «Caja»

From here on, the **Back Office** group of the admin sidebar reads:
Clientes · Pagos · **Caja** · Insumos · Evaluaciones nutricionales ·
Personal · Nómina · Gastos · Categorías de gasto. «Caja» opens `AW151`
(`/back-office/caja`). It has no badge. Draw it in the design system's
sidebar card and in `AW151`; the other admin screens take it the next time
each is regenerated, and invariant 5 of [30](./30-invariants-checklist.md)
is read with «Caja» after «Pagos» from now on.

## 4. Entry points that cannot disappear

Add to the table of invariant 6: «Cerrar caja» on `S04` and `S11` is the
only route to `S25`; the «Caja» sidebar row is the only route to `AW151`.

## Keep untouched

Every other control, copy, and frame of `S04` and `S11`. The Coordinator
(ADR-0102) sees neither the pill nor the sidebar row; no frame is drawn for
her here.
