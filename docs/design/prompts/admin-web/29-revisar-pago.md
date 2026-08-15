# Prompt AW29 — Revisar Pago

Admin desktop web. Chains from Prompt AW28 (Pagos) — reached by clicking a Pendiente row. Shown as a side panel over the Pagos table, the desktop counterpart to Payment Review on the staff app (Prompt S12).

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Pagos (Prompt AW28), design **Revisar Pago** — a side panel for checking a client's transfer receipt against the studio's bank app and confirming or rejecting the Payment.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Layout, top to bottom:**
1. Panel header: title "Revisar pago", context line with client name and Plan, close icon.
2. A read-only summary row: Monto a verificar, Fecha, Método (siempre "Transferencia" here — cash Payments are confirmed instantly by an Assistant and never reach this queue).
3. A large view of the client's uploaded transfer receipt screenshot (clickable to view at full size).
4. Footer: two buttons side by side, "Confirmar pago" (Palo de rosa fill) and "Rechazar" (destructive/outlined, Error).

**Show two frames:**
- **Default** — as described above.
- **Rechazar expanded** — clicking "Rechazar" reveals a "Motivo del rechazo" text field (placeholder: "Ej. el monto no coincide con la transferencia recibida.") in place of the two buttons, with "Confirmar rechazo" as the new primary action and a "Cancelar" text link beside it — a reason is always recorded before the rejection goes through, same rule as the mobile flow (Prompt S12).

Confirming or rejecting closes the panel and returns to Pagos, the row now showing its settled status. No separate result screen.

Clean desktop density, consistent with other side panels.
