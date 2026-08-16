# Follow-up — Fix the admin sidebar (remove Descuentos, make it consistent)

Targets: every admin web screen, **AW02 through AW29**. Send as a follow-up in the existing admin web conversation — don't restate Prompt 00 or Prompt AW02.

---

Two problems with the sidebar across the admin web screens generated so far:

1. **Remove the "Descuentos" link** from the Promociones group on every screen. There's no feature behind it and there won't be one — see [ADR-0007](../../adr/0007-drop-descuentos-from-admin-web.md). Promociones group becomes just: Promociones, Referidos, Créditos.
2. **The Back Office group is inconsistent across screens** — earlier screens (AW02–AW14) are missing items that later screens (AW15 onward) have, because the group grew as new screens were designed. Every screen should render the **same complete sidebar**:
   - Horario (direct link)
   - Catálogo — Tipos de clase, Planes, Sucursales
   - Back Office — Clientes, Pagos (badge), Insumos (badge, warning tint), Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de gasto
   - Reporte (direct link)
   - Promociones — Promociones, Referidos, Créditos

Regenerate the sidebar on all 28 screens (AW02–AW29) to this exact, identical item list, active/expanded state unchanged per screen. Nothing else on any screen changes.
