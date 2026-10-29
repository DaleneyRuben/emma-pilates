# Follow-up — `AW28` names the sale and dates it by the decision

Targets: **AW28 (Pagos · Web Admin)**, its desktop frame and its narrow
frame; the **generated handoff `design/README.md`** (the `AW28` inventory
row). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-003 on 2026-10-28. A paid Evaluation is its own Payment
(booking ADR-0011) and appears in the same list as a Plan sale. The list
and the CSV labeled every row with the Plan name and dated it by the
submission, while the income reports date a sale by the decision. The
accountant could not tell an Evaluation from a Plan, and a sale confirmed
in October after a September submission landed in the wrong month.

## 1. Table

- A **«Tipo»** column after «Cliente» and before «Plan», in `#6E6663`:
  «Plan» or «Evaluación». «Plan» stays.
- **«Fecha»** shows the decision date in Bolivia when the sale is decided,
  and the submission date while it is still pending. The column header
  stays «Fecha».

## 2. CSV

The export of the filtered rows gains a **«Tipo»** column after «Cliente»
(«Plan» or «Evaluación») and its **«Fecha»** uses the same decision date
the table shows. The other columns of follow-up 147 stay, in the same
order, after «Tipo».

## 3. Untouched

`AW29` stays a receipt review. The subtitle, the filters, «Método»,
«Monto», «Estado», «Factura», and «Exportar CSV» stay. Do not drop the
Plan name.
