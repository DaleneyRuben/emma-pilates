# Follow-up — Payment review states the admin web now has

Targets: **AW28 (Pagos)** and **AW29 (Revisar pago)**. Send
[30](./30-invariants-checklist.md) (with the corrections carried by
[31](./31-plan-naming-leftovers.md) and [40](./40-cancellation-window-wording.md))
alongside this follow-up.

---

WEB-005 built these two screens against `booking/CONTEXT.md` (Payment,
Credit), ADR-0006, ADR-0071, and ADR-0075. In a few places the screens leave
out a state the domain has. Apply only the changes below.

## 1. `AW28` — The amount asked, when Credit paid part of it

A Payment records "the Money Amount the client was asked to pay — the Plan's
price less any Credit — so a reduced Payment can be told apart from a short
one" (`booking/CONTEXT.md`, Payment).

- In the **Monto** column, keep the amount the Client transferred
  (`Bs 500,00`, right-aligned, tabular) and, only when Credit was applied, a
  second line under it in Texto tenue 11.5 px: «con Bs 60,00 de crédito».
  Add one such row to the sample (for example Natalia Aguilera, Paquete de 8
  clases, `Bs 500,00` with «con Bs 60,00 de crédito»).
- The footer names the filter: «Mostrando 6 de 6 pagos pendientes», «… pagos
  confirmados», «… pagos rechazados», or «… pagos» for Todos.

## 2. `AW28` — Empty and no-results frames

Add two small frames, the table header kept and the message inside the body
(the same pattern as follow-up 25):

- **Nada por revisar** (filter on Pendiente): «No hay pagos pendientes.»,
  «Todo al día. Cuando una clienta envíe un comprobante, aparece aquí.», and
  in Texto muy tenue «Las clientas envían sus transferencias desde la app;
  aquí solo se revisan.» The subtitle reads «Todo el estudio · ninguna
  transferencia por revisar» and the sidebar shows no badge.
- **Sin resultados** (a search): «No se encontró ningún pago.», «Revisa cómo
  escribiste el nombre de la clienta.», with both page buttons disabled.

## 3. `AW29` — Price and Credit above the amount to check

- In the summary, when Credit was applied, add two rows under **Monto a
  verificar**: «Precio del plan» `Bs 560,00` and «Crédito aplicado»
  `−Bs 60,00`, both tabular. Without Credit the summary stays the three lines
  drawn.

## 4. `AW29` — Confirming asks first

Confirming starts the Client's Subscription and cannot be undone
(`booking/CONTEXT.md`, Payment), so **Confirmar pago** opens a small
confirmation before anything happens:

- Title «¿Confirmar el pago de Valeria Terceros?», one sentence «Verifica que
  Bs 1.050,00 llegó a la cuenta del estudio. Al confirmar, su plan Mensual 16
  clases empieza hoy y le avisamos.», and **Volver** (compact neutral) /
  **Confirmar pago** (Palo de rosa fill). It is the one solid button of that
  dialog.
- After it, Pagos shows the Éxito line «Pago de Valeria Terceros confirmado:
  su plan Mensual 16 clases empieza hoy.»; after a rejection, «Pago de Valeria
  Terceros rechazado: le avisamos el motivo.»

## 5. `AW29` — A Payment someone else decided first

The Staff app (`S11`/`S12`) and the admin web decide the same Payments
(ADR-0006); whoever acts first settles it.

- Add a frame **Ya decidido**: under the panel header, a quiet line on
  Superficie «Otra persona ya decidió este pago.»; the summary gains «Estado»
  with the Confirmado or Rechazado pill and, for a rejection, «Motivo» with
  the reason; the footer has no buttons.
- When a confirmation is refused because the Client already holds an active
  Plan, the footer keeps both buttons and shows, in Error texto, «No se puede
  confirmar: la clienta ya tiene un plan activo. Si el pago no corresponde,
  recházalo con el motivo.»

## 6. `AW29` — A receipt that is gone or does not load

A receipt is deleted some days after the decision (ADR-0075), and reading it
needs a current session.

- **Comprobante no disponible**: in place of the image, a Superficie box with
  «El comprobante ya no está disponible.»; «Ver en grande» is hidden.
- **No se pudo mostrar**: «No pudimos mostrar el comprobante.» with a compact
  neutral **Reintentar**.
- The viewer's top line shows «Comprobante · JPG» (or PNG): the backend keeps
  no file name for a receipt, so `comprobante-1842.jpg` should not be drawn.

## 7. Copy register

`AW28` and `AW29` use «vos» in their visible notes («Tocá una fila
pendiente…», «comparás el comprobante…»). The design system's register is
informal «tú»: «Toca una fila pendiente para revisar el comprobante.» and
«compara el comprobante con la app del banco».

## Preserve everything else

Do not change the shell, the sidebar and its Pagos badge, the Branch selector
(shown and ignored on Pagos), the Estado filter's options and its Pendiente
default, the status pills, the read-only settled rows, the mandatory
«Motivo del rechazo» with its disabled **Confirmar rechazo**, follow-up 21's
enlarged receipt, or any screen not named in Targets.
