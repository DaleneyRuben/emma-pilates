# Follow-up — Fix when a plan starts, and the payment methods it points at

Targets: **09 (Detalle del Plan)**. Send as a follow-up.

---

Two lines on this screen contradict the domain, and one of them contradicts the screen itself.

1. **When the plan's date range starts.** The "Qué incluye" list says "Un mes de vigencia **desde tu primera clase**", while the line under the price breakdown on the same screen already says "El plan se activa cuando el estudio confirma tu pago." The second one is right: per `booking/CONTEXT.md`'s Subscription entry, "the new date range begins only when a Payment is confirmed", and screen `12 Mi Plan` shows exactly that with its "Inicio" date. Change the bullet to say the vigencia runs from the confirmation of the payment — e.g. "Un mes de vigencia desde que se confirma tu pago." Do the same on the "Sin crédito" frame, which repeats the list.

2. **What the payment screen offers.** The notes grid says "«Continuar al pago» lleva a la pantalla de pago (10), donde se elige entre **QR, transferencia o efectivo en el estudio**." Screen `10` states the opposite, correctly: transfer against the studio's QR is the only method in the client app, and cash is recorded by staff in the staff app (`S10`), never by the client. Rewrite the note so it describes a single method: continuing goes to the transfer/QR payment screen, where the client attaches the receipt.

Nothing else on this screen changes — the three-line price breakdown, the credit line in the Éxito tone, and the "Cancelación sin costo hasta 2 h 30 antes de cada clase" bullet are all correct.
