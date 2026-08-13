# Prompt AM05 — Cancel Session Confirm

Admin mobile app. Chains from Prompt AM04 (Cancel Session Search) — reached by tapping a Session card. This is a destructive, last-resort action, so the screen leads with the consequences.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Cancel Session Search (Prompt AM04), design the **Cancel Session Confirm** screen of the admin mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** a back arrow in the header returns to Cancel Session Search.

**Layout, top to bottom:**
1. Header: back arrow, title "Cancelar sesión".
2. Session summary: Class Type, Trainer, Branch, date, time, and the number of affected Bookings ("6 clientes afectados").
3. A warning-colored callout (using the Warning semantic color) stating the consequences plainly: "Se cancelarán las 6 reservas de esta clase, se reembolsará una clase a cada cliente afectado — incluso si ya no podían cancelar por su cuenta — y se les notificará."
4. Two buttons: a plain "Cancelar" (dismiss, returns to search) and a destructive "Sí, cancelar sesión" button in the Error semantic color, since this is the one truly destructive action in the app.

**Show a second frame for the result state**, after confirming: a success-colored icon, "Sesión cancelada" message, "Se notificó a los 6 clientes afectados.", and a button "Volver" returning to Cancel Session Search.

Generous whitespace, consistent with the rest of the app.
