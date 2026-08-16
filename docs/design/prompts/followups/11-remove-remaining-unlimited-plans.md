# Follow-up — Remove the remaining unlimited plans

Targets: **AW05 (Formulario de Plan)**, **AW22 (Detalle de Cliente)**, **S11 (Pagos Pendientes)**, **S12 (Revisar Pago)**. Send as a follow-up on each surface.

---

Follow-up 02 removed unlimited plans from the plan catalog, but only on AW04, 08 and S09. Four screens still show them, and `booking/CONTEXT.md`'s Plan entry is unambiguous: "Every Plan grants a fixed number of classes; there is no unlimited Plan."

1. **AW05 — Formulario de Plan**: the plan list behind the panel still contains "Mensual libre · 1 mes · Ilimitadas · Bs 1.050", "Semestral libre · 6 meses · Ilimitadas · Bs 5.400" and "Anual libre · 12 meses · Ilimitadas · Bs 9.600". Replace all three with fixed-allowance plans consistent with the catalog on AW04 and 08 — a class count in the Clases column, never "Ilimitadas". Keep the 1 / 3 / 6 / 12-month durations, which are correct. Nothing in the panel form itself changes.

2. **AW22 — Detalle de Cliente**: the plan block reads "Clases disponibles: Ilimitadas" in both the desktop and the narrow frame. Replace with a real remaining count (e.g. "5 de 8"), and change the plan name off "…libre" to a fixed-allowance plan from the same catalog.

3. **S11 — Pagos Pendientes**: the row "Paola Suárez · Mensual ilimitado · Bs 600" names a plan that can't exist. Rename it to a fixed-allowance plan and keep the amount consistent with that plan's price.

4. **S12 — Revisar Pago**: the same payment appears here as "Paola Suárez · Mensual ilimitado". Apply the same rename, so the two screens still describe one payment.

While renaming on S11 and S12, also switch the allowance wording from "sesiones" to "clases" ("Paquete de 4 sesiones" → "Paquete de 4 clases"). In `booking/CONTEXT.md` a Session is a scheduled occurrence on the calendar; what a Plan grants and a Booking consumes is a class. The client app already says "clases" everywhere.

Nothing else on these four screens changes.
