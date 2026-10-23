# Prompt AW151 — Cierres de caja

Admin desktop web, Administrator only. A new **Back Office** sidebar entry, «Caja», right after «Pagos» ([follow-up 150](../followups/150-cash-close-entries.md) draws it in the design system's sidebar). Same shell as Horario (Prompt AW02). Send [30](../followups/30-invariants-checklist.md) alongside this prompt.

The number comes from the block BKO-003 was given on 2026-10-23 so that the items built in parallel never take the same number; it follows AW35 in the index.

---

Written by BKO-003 on 2026-10-23. Every evening the front desk closes the cash in the Staff app («Cerrar caja», Prompt S25): what the day's cash sales said, what was counted, the difference, and a note. One close a day per Branch, never edited. This page is where the Administrator reviews those closes: which days had a difference, which days had cash sales and nobody closed, and which closed days moved afterwards because a sale was voided (or recorded) after the close. The Coordinator never sees it ([ADR-0102](../../../adr/0102-coordinator-role-without-money.md)).

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Cierres de caja** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every admin screen. Amounts as the admin web writes them: «Bs 1.200,00», tabular.

**Sidebar state:** «Back Office» group, «Caja» active. The page follows the shell's Branch selector (AW34), like Gastos (AW13): it shows the selected Branch's closes. The browser address reads `admin.emmapilates.bo/back-office/caja`.

## Layout, top to bottom

1. Title «Cierres de caja» (Lora 27) and the subtitle «Sucursal Centro». No primary button: closes are made only in the Staff app.
2. AW31's month stepper («‹ octubre de 2026 ›»; the next-month arrow disabled on the current month).
3. When the month has past days with cash sales and no close, an Advertencia notice (Advertencia tint, 1 px Advertencia border at 40 %, radius 12) above the table: title «2 días con ventas en efectivo sin cierre» (14 px medium), line «Revisa con recepción qué pasó esos días.» (Nota). No notice when every such day is closed.
4. A table in AW13's card and density, one row per day of the month that had cash sales or a close, newest first, never a future day. Columns:
   - «Fecha» — «vie 23/10» (weekday and `dd/mm`), tabular;
   - «Estado» — a status pill: «Cerrada» (Éxito), «Sin cierre» (Advertencia; a past day with cash sales and no close), «Abierta» (Neutral; today, not closed yet);
   - «Esperado» — the expected cash at the close, right-aligned; on a day without a close, the day's cash sales in Texto tenue;
   - «Contado» — right-aligned, «—» in Texto tenue without a close;
   - «Diferencia» — right-aligned: «Bs 0,00» in Texto secundario when it squares; a shortfall «−Bs 10,00» and a surplus «+Bs 5,00» in medium weight on the Error and Advertencia text colours, and the whole row on a faint tint of that colour (Error at 6 %, Advertencia at 8 %) so a difference is seen at a glance;
   - «Ajuste» — right-aligned; empty when the day did not move after its close; otherwise the change in Nota size with a 12 px info glyph, «−Bs 50,00», and the tooltip «Una venta anulada o registrada después del cierre cambió las ventas del día.»;
   - «Cerró» — the Staff Member's name and the time, «Camila Rojas · 19:05», Nota size; «—» without a close;
   - «Nota» — the note, one line with an ellipsis, the full text in a tooltip; empty when there is none.
   Rows are not links: there is no detail panel and nothing is editable.
5. Under the table, AW31's summary line in Nota: «8 días con ventas en efectivo · 6 cerrados · 2 sin cierre».

Sample data for Centro, October 2026 (fictional): 23/10 Cerrada, esperado Bs 520,00, contado Bs 510,00, diferencia −Bs 10,00, Camila Rojas · 19:05, nota «Faltó cambio para un billete de 200»; 22/10 Sin cierre, ventas Bs 300,00; 21/10 Cerrada, Bs 760,00 / Bs 760,00 / Bs 0,00, ajuste −Bs 250,00; 20/10 Cerrada, Bs 250,00 / Bs 255,00 / +Bs 5,00, nota «Sobró una moneda de 5»; 18/10 Sin cierre, ventas Bs 480,00; further rows in the same voice.

## Frames

1. **Escritorio · 1440 px** — the month above, with the notice and one row of each kind.
2. **Escritorio · Todo cerrado** — a month where every day squares: no notice, no tinted rows.
3. **Escritorio · Sin movimientos** — AW13's empty card with the quiet icon: «No hubo ventas en efectivo ni cierres en este mes.» and «Prueba con otro mes o con otra sucursal.»
4. **Navegador angosto · 420 px** — AW13's narrow shell; the table becomes stacked cards: the date and the status pill on the first line, then «Esperado · Contado · Diferencia» as three right-aligned figures under small labels, then the adjustment, «Cerró» and the note when present; the difference tint stays on the card.

## Keep consistent

The shell, sidebar, Branch selector, and user menu exactly as AW13; the closed palette; the status pills, table, notice, and empty-card conventions of AW13 and AW31. Touch no other screen (the sidebar entry is follow-up 150).
