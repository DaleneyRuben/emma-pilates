# Follow-up — the sidebar gains Simulador

Targets: **every admin screen that draws the sidebar** (`AW02`–`AW36`, and
`Sistema de Diseño`'s web sample). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by STU-004 on 2026-10-23. The diagnosis's section 3.4 asks for a
simulator, and the new screen is
[AW37](../admin-web/37-simulador.md). The sidebar has no entry for it. From
here on, read checklist point 5 with **Simulador** in it, after the
standalone **Reporte** and before the **Promociones** section:

- **Horario** (no section)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Evaluaciones nutricionales ·
  Personal · Nómina · Gastos · Categorías de gasto
- **Reporte** (no section)
- **Simulador** (no section, its own item after Reporte)
- **Promociones**: Promociones · Referidos · Créditos

**Simulador** is active only on `AW37`. On every other admin screen it is a
plain entry, in that position. The design-system sample may abbreviate a
section's tail as it does today, but if it shows this entry the label is
**Simulador**, never «Calculadora» and never «Modelo».

Only the Administrator sees it. A frame drawn for another role leaves the
entry out. The Coordinator role does not exist in the product yet (IDN-009);
do not invent a Coordinator frame here.

Nothing else moves: no entry is renamed, **Descuentos** does not return, and
the badges on Pagos and Insumos stay where they are.
