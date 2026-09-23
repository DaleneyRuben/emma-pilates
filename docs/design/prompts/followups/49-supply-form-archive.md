# Follow-up — Let the Supply Form archive a discontinued Supply

Targets: **AW09 (Supply Form), "Editar insumo" frame**. Send as a follow-up.

---

A Supply the studio stops buying has no way to leave the Insumos list. Supplies
are never deleted, because their Withdrawals are the consumption history AW31
reports (`back-office/CONTEXT.md`, *Supply*); instead a discontinued Supply is
**archived**.

In the **Editar insumo** frame only, add a tertiary, destructive-styled text
action **"Archivar insumo"** below the "Guardar" button. It opens a
confirmation dialog:

- Title: "¿Archivar este insumo?"
- Body: "Dejará de aparecer en Insumos y en Registrar retiro. Sus retiros
  seguirán en «Retiros e insumos consumidos»."
- Buttons: "Cancelar" (secondary) and "Archivar" (destructive).

Show the dialog as its own frame. The **Nuevo insumo** frame does not get this
action, and nothing else on AW09 changes.
