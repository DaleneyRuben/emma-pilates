# Follow-up — Add "Registrar reposición" to Insumos

Targets: **AW08 (Insumos)** and a new side panel in the style of **AW10
(Registrar retiro)**. Send as a follow-up.

---

Today stock can only go down. AW09 makes "Cantidad en stock" read-only after
creation and AW10 only subtracts, so once a Supply runs out there is no way to
record that new units arrived. `back-office/CONTEXT.md` now defines a
**Restock**: a logged record of putting units of a Supply into a Branch's
storage (UI: "Reposición"). It records units only, never money.

1. **AW08** — add a fourth header action, **"Registrar reposición"**, styled
   like "Registrar retiro" (secondary/outlined) and placed right after it. The
   order becomes: "+ Nuevo insumo" (primary), "Registrar retiro" (outlined),
   "Registrar reposición" (outlined), "Ver historial de retiros" (text link).
2. **New panel "Registrar reposición"** — the same layout as AW10: panel
   header with close icon; field "Insumo" (dropdown of the Branch's Supplies,
   showing the current stock next to the selected item); field **"Cantidad
   repuesta"** (whole units, at least 1); a **"Registrar"** primary button
   (Palo de rosa fill). Show it as its own frame over the Insumos table.

This amends checklist [30](./30-invariants-checklist.md) §6: `AW08` now has
**four** header actions, in the order above.

Nothing else on AW08 changes, and AW10 stays exactly as it is.
