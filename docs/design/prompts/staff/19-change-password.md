# Prompt S19 — Change Password

Staff app. Not reached via a menu link — this is a **forced** screen inserted right after Login (Prompt S01) the first time a Staff Member authenticates with the temporary password an Administrator generated for them (Prompt AW24). The account cannot reach its Role home screen until this step completes.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login (Prompt S01), design the **Change Password** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

No navigation chrome — this step can't be skipped or backed out of while a temporary password is active.

**Layout, top to bottom:**
1. Brand header, smaller than Login's, plus a short title: "Crea tu contraseña" and a line explaining why: "Tu administradora te creó una cuenta con una contraseña temporal. Elige una nueva para continuar."
2. Field: "Contraseña nueva".
3. Field: "Confirmar contraseña" — inline validation if the two don't match.
4. A primary button: "Guardar y continuar" (Palo de rosa fill), disabled until both fields are filled and match.

On success, route straight to the Staff Member's Role home screen (S02 / S04 / S11 / S15, per Prompt S01's routing) — no separate confirmation screen.

Keep the form vertically centered with generous whitespace, consistent with Login. Same pattern as the client app's equivalent screen (Prompt 21).
