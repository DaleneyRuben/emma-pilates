# Follow-up — `AW17` opens «Contactos para promociones»

Targets: **AW17 Promociones** (the «Escritorio · 1440 px», «Escritorio ·
Arrastrando», «Navegador angosto · 420 px», and «Escritorio · Carrusel vacío»
frames) and the generated handoff `design/README.md` (its `AW17` row, the
navigation list, and a new `AW35` row). Send
[30](./30-invariants-checklist.md) and the new screen prompt
[AW35](../admin-web/35-contactos-promociones.md) alongside.

---

Written by BE-022 on 2026-10-20. The new page AW35 lists the Promotion
Contacts that ADR-0097 keeps for former Clients who asked to keep receiving
promotions. It belongs to the Promociones group but has no sidebar item, so
adding one would change the sidebar of every admin screen; AW17 opens it
instead.

## 1. The entry button

In AW17's title row, left of **Nueva promoción**, add one compact neutral
outline button **Contactos para promociones** (the same height as the
primary, 1 px Borde fuerte, Blanco, Texto principal 13.5 px medium), with a
14 px two-people outline icon. It opens AW35. In the narrow frame it sits
full-width under «Nueva promoción». In «Carrusel vacío» it stays in the title
row: contacts exist whether or not a Promotion does.

## 2. The handoff README

- The `AW17` row gains «a «Contactos para promociones» button opens `AW35`».
- A new row after `AW34`: `AW35` | Contactos para promociones | the list of
  Promotion Contacts (ADR-0097), newest consent first, search only, «Exportar
  CSV» (every contact, audited), a per-row «Dejar de enviar» confirmation that
  erases the contact; reached from `AW17`, no sidebar item.
- The navigation list gains `AW17 → AW35` («Contactos para promociones») and
  `AW35 → AW17` («← Promociones»).

## Leave untouched

Every Promotion card, the drag state, the primary button, the shell and
sidebar, every other screen, and every other line of the README.
