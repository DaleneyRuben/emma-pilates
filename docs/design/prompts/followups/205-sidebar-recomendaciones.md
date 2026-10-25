# Follow-up — the sidebar gains Recomendaciones

Targets: **every admin screen that draws the sidebar** (`AW02`–`AW35`,
`AW39`, and `Sistema de Diseño`'s web sample). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by STU-006 on 2026-10-23. The diagnosis's section 3.5 asks for the
recommendations panel, and the new screen is
[AW40](../admin-web/40-recomendaciones.md). The sidebar has no entry for it.
From here on, read checklist point 5 with **Recomendaciones** in it,
immediately after **Indicadores** and before the **Promociones** section:

- **Horario** (no section)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Evaluaciones nutricionales ·
  Personal · Nómina · Gastos · Categorías de gasto
- **Reporte** (no section)
- **Indicadores** (no section, its own item after Reporte)
- **Recomendaciones** (no section, its own item after Indicadores)
- **Promociones**: Promociones · Referidos · Créditos

**Recomendaciones** is active only on `AW40`. On every other admin screen it
is a plain entry, in that position. The design-system sample may abbreviate a
section's tail as it does today, but if it shows this entry the label is
**Recomendaciones**, never «Reglas» and never «Panel».

The Administrator and the Coordinator both see the entry. A frame drawn for
the Assistant or the Trainer leaves it out, the same way those roles leave
out the money pages. The Coordinator role does not exist in the product yet
(IDN-009); do not invent Coordinator chrome beyond the read-only frame of
AW40.

Nothing else moves: no entry is renamed, **Descuentos** does not return, and
the badges on Pagos and Insumos stay where they are.
