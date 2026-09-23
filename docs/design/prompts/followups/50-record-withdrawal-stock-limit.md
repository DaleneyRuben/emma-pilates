# Follow-up — Record Withdrawal cannot exceed the stock on hand

Targets: **AW10 (Registrar retiro)**. Send as a follow-up.

---

A Withdrawal can never take a Supply's quantity on hand below zero
(`back-office/CONTEXT.md`, *Withdrawal*), but AW10 shows no limit and no error.

- Under "Cantidad retirada", add the helper line "Máximo: N unid.", where N is
  the stock shown next to the selected Insumo.
- Add an error frame where the entered quantity is larger than the stock: the
  field in its Error state with the message **"Solo hay N unid. en stock."**
  and "Registrar" disabled.

Keep the panel to its two fields and one button; nothing else on AW10 changes.
