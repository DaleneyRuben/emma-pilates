# Follow-up — The admin web without Credit

Targets: **the admin sidebar on every `AW` screen and in `Sistema de
Diseño`**, **AW22 (Detalle de cliente)**, **AW26 (Referidos)**, **AW27
(Créditos)**, **AW28 (Pagos)**, **AW29 (Revisar pago)**, **AW34 (Selector de
sucursal)**, and the **generated handoff `design/README.md`** (the sidebar
order, the studio-wide exceptions, and the `AW22`, `AW26`, `AW27`, `AW28`,
`AW29` rows and notes). Send [30](./30-invariants-checklist.md) alongside
this follow-up.

---

Written by PAY-005 on 2026-10-23. The owner removed the Bs 60 referral
Credit (decisions document §5.3, booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md)).
From here on, read the sidebar's *Promociones* group as **Promociones ·
Referidos** only: this corrects checklist 30's sidebar order, which still
lists Créditos.

## 1. Sidebar

Remove the **«Créditos»** entry from the *Promociones* group wherever the
sidebar is drawn (desktop and the narrow drawer). Nothing else in the
sidebar moves.

## 2. `AW27` — retired

Keep the file as history, with a single banner across its first frame:
**«Pantalla retirada (PAY-005): el crédito por referidos ya no existe.»**
(13px, `#766D69`, on `#FAF7F2`, 12px radius, 12px 16px padding).

## 3. `AW22`

- Remove the **«Crédito»** block («Crédito disponible» and its amount) from
  every frame; the Referidos block moves up.
- In the closure confirmation, remove **«Pierde su crédito de Bs 120,00.»**
  and rename the caption «Confirmación · con plan, reservas y crédito» to
  **«Confirmación · con plan y reservas»**.
- Description and notes: «contacto, plan vigente y referidos»; the «Bloques
  por tema» note lists «Contacto, plan y referidos»; the «Cifras alineadas»
  note says «Los referidos van a la derecha…».

## 4. `AW26`

- Remove the **«Estado»** column and its pills («Crédito otorgado»,
  «Pendiente»); the table keeps «Cliente que refiere», «Cliente referido»,
  and «Fecha de registro».
- The subtitle becomes the plain count: **«34 referidos»**.
- Delete the note «El crédito se otorga solo cuando se confirma el primer
  pago de la referida.», the «Dos estados…» note, and the description's
  sentence about Credit.

## 5. `AW28` and `AW29`

- `AW28`: the amount cell shows only the amount, the Plan price
  **Bs 560,00** (desktop row and narrow card); remove «con Bs 60,00 de
  crédito» and the «Crédito a la vista» note.
- `AW29`: remove the **«Escritorio · Con crédito aplicado»** frame and the
  «Precio del plan» and «Crédito aplicado» lines; delete the «Crédito en el
  resumen» note. The summary is «Monto a verificar», «Fecha», «Método».

## 6. `AW34` and `Sistema de Diseño`

`AW34`'s studio-wide list in its notes drops «Créditos (AW27)», and the
design system's density note lists «Nómina, Clientes, Referidos, Pagos y
Categorías de gasto».

## 7. Handoff README

- Sidebar order: *Promociones* (Promociones, Referidos).
- Studio-wide exceptions: drop **AW27 Créditos**.
- `AW22`: «contacto, plan, referidos». `AW26`: «Read-only, 3 columns; the
  studio-wide count whatever the search; no-results state», and its note says
  there is no status column. `AW27`: «Retired by PAY-005», row and note.
  `AW28` and `AW29`: no Credit lines, and confirming a payment «activates the
  subscription» (no Credit consumed).

## Leave untouched

Every other admin screen's content, the report (`AW16`: its «Bs 60.000» is a
sample income, not Credit), and the Payment decisions.
