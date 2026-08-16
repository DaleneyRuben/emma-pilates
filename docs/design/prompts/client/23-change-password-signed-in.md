# Prompt 23 — Cambiar contraseña (sesión iniciada)

Client mobile app. Chains from Prompt 18 (Perfil) — reached from a "Cambiar contraseña" menu row (see Follow-up 16, which adds that row). Returns to Perfil on save.

This is the self-serve change, for a client who is signed in and knows their current password. It is **not** Prompt 21 (Crea tu contraseña), which is the forced step after a first login with the temporary password an Assistant handed out in Prompt S05, and not Prompt 20 (Recuperar contraseña), which runs before any session exists. Prompt S05's own copy promises this screen exists — "Compártela con la clienta; podrá cambiarla desde su perfil al entrar" — and until now it didn't.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Editar perfil (Prompt 22), design the **Cambiar contraseña** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** header with a back arrow that returns to Perfil (Prompt 18) without saving — no intermediate confirmation, same rule as Prompt 22. No tab bar: this is a child screen.

**Layout, top to bottom:**
1. Header: back arrow, title "Cambiar contraseña".
2. Field: "Contraseña actual".
3. Field: "Contraseña nueva".
4. Field: "Confirmar contraseña" — inline validation when the two new ones don't match.
5. A primary button "Guardar contraseña", pinned above the bottom edge so it stays visible with the keyboard open (same treatment as Prompt 22's "Guardar cambios"), disabled until all three fields are filled and the two new ones match.

Show these frames:
- **iOS · Campos vacíos** — button disabled, nothing typed.
- **iOS · No coinciden** — the confirm field in the Error tone with a short inline message, button still disabled.
- **iOS · Contraseña actual incorrecta** — the server rejected the current password: an inline Error message under the first field ("La contraseña actual no es correcta."), the other two fields untouched.
- **Android · Campos llenos** — all three valid, button enabled, Android header height.

On success, return to Perfil (Prompt 18) with a brief confirmation — no separate success screen. The session stays open.

Generous whitespace, consistent with the rest of the client app.
