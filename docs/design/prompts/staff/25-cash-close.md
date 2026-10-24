# Prompt S25 — Cerrar caja (Asistente y Administración)

Staff app, Assistant and Administrator roles. Reached from the «Cerrar caja» header action that [follow-up 150](../followups/150-cash-close-entries.md) adds to Buscar cliente (Prompt S04) and Pagos pendientes (Prompt S11). It is the daily **Cash Close** of `back-office/CONTEXT.md` ([ADR-0012](../../../../booking/docs/adr/0012-sales-controls-and-invoice-data.md), the owner's rules §4.4): at the end of the day the front desk counts the drawer and records it once.

Written by BKO-003 on 2026-10-23. Send [30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Using the Emma Pilates Studio design system (Prompt 00) and the centered-card layout of Confirmar pago en efectivo (Prompt S10), design the **Cerrar caja** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal «tú» address. Amounts as everywhere else in the app: whole bolivianos without decimals («Bs 520»), centavos only when there are some («Bs 512,50»), tabular figures.

**Navigation chrome:** header with a back arrow that returns to the screen it came from (S04 for the Assistant, S11 for the Administrator), the title «Cerrar caja» (Lora, as S10's), and under it a 13 px `#766D69` line with today and the Branch: «Viernes 23 de octubre · Centro». No tab bar.

**Branch choice:** when the person can close more than one Branch (the Administrator always; an Assistant assigned to several), S10's Branch chips appear under the header, «Sucursal», one chip per Branch, the first selected. An Assistant with one Branch sees no chips.

## Layout of the form, top to bottom

1. **Efectivo esperado** card (white card, 1 px `#D8C9BB`, radius 16, as S10's breakdown card): the eyebrow «EFECTIVO ESPERADO» (12 px uppercase 0.14em `#766D69`), the amount «Bs 520» in Lora 28 `#4A4A4A`, and under it in the Nota style «3 ventas en efectivo hoy en Centro». With no cash sale yet: «Bs 0» and «Todavía no hay ventas en efectivo hoy.»
2. **Efectivo contado** field: label «Efectivo contado» (field label style), a numeric field with the «Bs» prefix inside it, placeholder «0,00», decimal keyboard. Helper under it: «Cuenta los billetes y monedas de la caja.»
3. **Diferencia** line, shown once a count is typed, in a tinted inset (radius 12, 12 px padding):
   - equal: «Diferencia · Bs 0 · Cuadra» on the Éxito tint, text `#5F7457`;
   - short: «Diferencia · −Bs 10 · Falta efectivo» on the Error tint, text `#94493A`;
   - over: «Diferencia · +Bs 5 · Sobra efectivo» on the Advertencia tint, text `#9A7434`.
4. **Nota (opcional)**: a 3-line text area, placeholder «Ej.: faltó cambio para un billete de 200», counter «0/500» in Texto tenue.
5. A Nota-style line: «Solo hay un cierre por día y no se puede corregir después.»
6. Primary button «Cerrar caja» (Palo de rosa fill), disabled until a count is typed; it shows S10's busy state while it records.

## The closed state

After recording, and whenever the screen opens on a day already closed at that Branch, the form is replaced by S10's success layout:

- the success icon (white check on `#7C9473`, 56 px circle);
- «Caja cerrada» as the main message (Lora 24);
- a summary card with four lines, label left and value right, as S10's breakdown: «Efectivo esperado Bs 520», «Efectivo contado Bs 510», «Diferencia −Bs 10» (the value in the tint colour of its case above), and, when there is one, the note in Nota style under a 1 px divider;
- a Nota line «Cerrada por Camila Rojas a las 19:05.»;
- a primary button «Volver».

## Errors (inline, Error colour, above the button)

- «La caja de hoy ya se cerró en esta sucursal.» (someone closed it meanwhile; the screen then shows the closed state);
- «Solo puedes cerrar la caja de tus sucursales.»;
- «No pudimos cerrar la caja. Inténtalo de nuevo.»

**Loading and failure:** the branded loading state of section 08 while today's expected cash loads; «No pudimos cargar la caja de hoy.» with «Reintentar» on failure.

## Frames

- **iOS · Asistente · Formulario** — Camila Rojas at Centro, Bs 520 expected from 3 sales, «510» typed, the short Diferencia line, the note «Faltó cambio para un billete de 200».
- **iOS · Asistente · Cuadra** — the same with «520» typed and the Éxito line.
- **iOS · Caja cerrada** — the closed state for the first frame.
- **iOS · Administración · Formulario** — the Administrator, with the Branch chips Centro / Equipetrol / Urubó, Equipetrol selected, «Todavía no hay ventas en efectivo hoy.».
- **Android · Formulario** — the first frame at Android header height.
- **Tablet · Formulario** — iPad Pro 11: the card centred in a 520 px column, as S10 on tablet.

Generous whitespace, calm tone, consistent with S10. Never show this screen to a Trainer, the Nutritionist, or the Coordinator: the Coordinator never sees money ([ADR-0102](../../../adr/0102-coordinator-role-without-money.md)).
