# Prompt S20 — Notifications

Staff app, shared by all four Roles. Not reached via an in-app menu link — same pattern as Pending Payments (Prompt S11): a push notification opens this screen directly. Chains back to the relevant Role home screen via the back arrow.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with the rest of the staff app, design the **Notifications** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** no tab bar (staff app has none); a back arrow in the header returns to whichever Role home screen the account belongs to.

**Layout, top to bottom:**
1. Header: back arrow, title "Notificaciones".
2. A vertical list of notification entries, each with a small icon, a message, and a relative timestamp. Unread entries carry a subtle background tint and a small dot indicator; read entries are plain — same visual language as the client app's Notifications screen (Prompt 19).

**Include a representative mix, one card per Role**, so all four Roles' notification types are shown (a real account only ever sees its own Role's types — show all four here as documentation of the full set):
- Trainer: "Se te asignó una sesión de última hora: Reformer Intermedio, hoy 16:00." (trainer swap, per `AW03`'s note that changing a Session's Trainer notifies the newly-assigned one)
- Assistant: "Nuevo pago en efectivo confirmado para Valeria Áñez." (a low-priority confirmation echo, not an action item)
- Administrator: "Tienes un comprobante de pago pendiente de revisión." (what opens Pending Payments, Prompt S11)
- Nutritionist: "Nueva evaluación agendada: mañana 09:00 con Paola Suárez."

If there are no notifications, show an empty state: "No tienes notificaciones." with a simple supporting line.

Generous whitespace, consistent with the rest of the app.
