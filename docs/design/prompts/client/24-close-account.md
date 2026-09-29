# Prompt 24 — Cerrar mi cuenta

Client mobile app. Chains from Prompt 18 (Perfil) — reached from the quiet «Cerrar mi cuenta» link under «Cerrar sesión» (see Follow-up 65, which adds that link). Returns to Perfil on «Cancelar», and ends on the sign-in screen (Prompt 01) after the account is closed.

This is the Client closing their own Account from the app, as BE-007 decided it (`docs/implementation/BE-007-data-governance-proposal.md`, G2–G6). It is **not** «Cerrar sesión» (that only ends this session) and not deactivation (that is a studio action on Staff Members). It also satisfies the App Store rule that an app that creates accounts lets people delete them from inside the app.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Cambiar contraseña (Prompt 23), design the **Cerrar mi cuenta** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** header with a back arrow that returns to Perfil (Prompt 18) without doing anything — no intermediate confirmation. No tab bar: this is a child screen.

**Layout, top to bottom:**
1. Header: back arrow, title "Cerrar mi cuenta".
2. Lead line: «Al cerrar tu cuenta dejas de usar Emma Pilates Studio. Esto es lo que va a pasar:»
3. A card with one line per consequence. Only the lines that apply to this Client appear, in this order, each with a small icon and the numbers filled in:
   - «Cancelamos tus {n} reservas futuras y tu evaluación nutricional pendiente. No se descuenta nada.» (reservas, evaluación, or both)
   - «Sales de {n} listas de espera.»
   - «Tu plan {nombre del plan} termina hoy. No se devuelve dinero y pierdes las {n} clases que te quedan.»
   - «Pierdes tu crédito de {Bs 60,00}.»
   - Always: «Cerramos tu sesión en todos tus dispositivos.»
   - Always: «Tu correo queda libre por si quieres registrarte de nuevo.»
4. A quiet note under the card: «El estudio conserva el registro de tus pagos y tus clases, pero deja de aparecer en la app y en las listas del estudio.»
5. Field: "Contraseña" (secure entry), with the helper «Escribe tu contraseña para confirmar que eres tú.»
6. A primary button "Cerrar mi cuenta" in the Error tone (outline, per the destructive convention of the admin dialogs), pinned above the bottom edge so it stays visible with the keyboard open (same treatment as Prompt 23's «Guardar contraseña»), disabled until the password field is filled.
7. Under the button, a quiet text link «Cancelar» that returns to Perfil.

Show these frames:
- **iOS · Con plan, reservas y crédito** — every consequence line, password empty, button disabled.
- **iOS · Sin nada pendiente** — a Client with no plan, reservas, or crédito: only the two «Siempre» lines and the note.
- **iOS · Contraseña incorrecta** — the server rejected the password: an inline Error message under the field («La contraseña no es correcta.»), the field kept, the button enabled again.
- **iOS · Pago en revisión** — the Client has a transfer payment awaiting review, so closure is refused: an Advertencia-tinted box in place of the consequence card, «Tienes un pago por transferencia en revisión. Podrás cerrar tu cuenta cuando el estudio lo confirme o lo rechace.», no password field, the button replaced by «Volver al perfil».
- **iOS · No se pudo cerrar** — a network failure: an Error line above the button, «No pudimos cerrar tu cuenta. Inténtalo de nuevo.», the password kept.
- **Android · Campos llenos** — password filled, button enabled, Android header height, keyboard open.

**After success:** the app signs the Client out and shows Iniciar sesión (Prompt 01) with a brief Éxito notice at the top, «Cerramos tu cuenta. Gracias por entrenar con nosotras.» Draw that as one frame (**iOS · Después de cerrar**); Prompt 01 stays otherwise as it is.

The consequence lines are read from data the app already loads (Mis reservas, Mis evaluaciones, Mi plan, Mi crédito); the numbers in the frames are sample values.

Generous whitespace, consistent with the rest of the client app. The invariants checklist (Follow-up 30) still applies: no plan is unlimited, the cancellation window is 2 h 30, and the only payment method is bank transfer.
