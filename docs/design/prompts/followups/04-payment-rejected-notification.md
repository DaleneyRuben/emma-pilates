# Follow-up — Add the missing "payment rejected" notification type

Targets: **19 (Notificaciones)**. Send as a follow-up.

---

The screen documents six notification types (class cancelled, waitlist promoted, payment confirmed, plan expiring, evaluation reminder ×2), but the domain has a seventh: per `booking/CONTEXT.md`'s Payment entry, when an Administrator rejects a transfer Payment, "the client sees why and must raise a new transfer Payment with a corrected receipt." That notification currently has no card.

Add one more card to the "Sin leer" or "Anteriores" group (whichever the surrounding demo data implies — pick unread, since a rejection is actionable and time-sensitive like the cancellation card already shown): icon color **Error** (`#B25D4B`), message pattern matching the existing cards' voice, e.g. "Tu comprobante fue rechazado: [motivo breve]. Sube uno nuevo para activar tu plan." Tapping it should read as routing to the payment/receipt-upload flow (screen 10), same as the existing cards route to their related screens per the "Comportamiento" note already on this screen.

Nothing else on the screen changes — same card structure, same read/unread treatment, same icon-color legend pattern (just gaining one more color/type entry: Rojo = pago rechazado, alongside the existing Rojo = clase cancelada... actually list will need two Rojo entries now, or note both share the color since both are negative-outcome types).
