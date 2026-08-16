# Prompt 21 — Change Password

Client mobile app. Not reached via a menu link — this is a **forced** screen inserted right after Login (Prompt 01) the first time a client authenticates with a temporary password (the case where an Assistant created their account in Prompt S05, per `booking/CONTEXT.md`'s Client entry). The client cannot reach Home (Prompt 02) until this step completes.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login / Sign Up (Prompt 01), design the **Change Password** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

No tab bar, no back arrow — this step can't be skipped or backed out of while a temporary password is active.

**Layout, top to bottom:**
1. Brand header, smaller than Login's, plus a short title: "Crea tu contraseña" and a line explaining why: "Tu asistente te creó una cuenta con una contraseña temporal. Elige una nueva para continuar."
2. Field: "Contraseña nueva".
3. Field: "Confirmar contraseña" — inline validation if the two don't match.
4. A primary button: "Guardar y continuar" (Palo de rosa fill), disabled until both fields are filled and match.

On success, proceed straight to Home (Prompt 02) — no separate confirmation screen.

Generous whitespace, consistent with the rest of the app.
