# Follow-up — The account avatar on all four staff app roots

Targets: **S02 (Mi agenda · Entrenadora)**, **S04 (Buscar cliente · Asistente)**, **S11 (Pagos pendientes · Administración)**, **S15 (Mi agenda · Nutricionista)**. Send as a follow-up.

---

Prompt S23 (Perfil) says it is reached "from the avatar on each role's root", and S02's notes already promised that "el avatar abre perfil y cierre de sesión". None of the four roots delivers it:

- On **S02** and **S04** the avatar is decorative: a `div` that isn't a button, has no pressed state and leads nowhere. It also shows a **single letter** ("C", "J"), while the client app uses two ("LM") and the admin web does too ("MF", AW33).
- On **S11** and **S15** there is **no avatar at all**: the top-right corner holds a 46px icon button leading to a secondary flow ("Cancelar una clase" → S13; "Mi disponibilidad" → S16).

No staff role has a tab bar, so the avatar is the **only** route to Perfil (S23), and therefore the only route to changing a password or logging out. Today Administración and Nutrición have neither: they are locked inside their root screen with no way out of the session.

## 1. The avatar is a control, not an ornament

On all four roots, the avatar is a real button:

- 46px circle, `#D8BDB8` fill, initials in white Lora, **always two letters** (first name and surname).
- Minimum 44px touch target and a pressed state (the same soft darkening the app's other controls use).
- Accessible label "Tu cuenta".
- Tapping it opens **Perfil (S23)**, which returns to this same root via the back arrow. It does not open a sheet or an intermediate menu: the destination is the screen that already exists.

Fix the single-letter initials:

- **S02** — "C" → **"CR"**, Camila Rojas, the same name and email S23 already uses for the trainer.
- **S04** — "J" → two letters from the assistant's full name. Fix a name and use it consistently across every screen of that role (suggestion: **Jimena Zabala**, "JZ"; any name works as long as it doesn't clash with the sample clients').

## 2. Where the avatar goes when there is already an action icon

The right side of the header may carry two controls, and **the avatar is always the rightmost one**, on all four roots and in every frame. That way its position doesn't shift from role to role.

- **S11** — to the right of the title, in this order: the existing "Cancelar una clase" button (46px rounded square, `#D8C9BB` border, white fill, palo de rosa icon) and then the avatar. 10px apart.
- **S15** — the same, with the "Mi disponibilidad" button followed by the avatar.

The difference in shape does the work of telling them apart: **outlined rounded square = screen action; filled circle with initials = your account.** Don't put the avatar inside a square and don't give it a border.

If the title no longer fits beside both controls — "Pagos pendientes" with its counter in the Android frame is the tight case — drop the title to 24px or let it wrap to two lines, but do **not** shrink the controls or remove the pending-payments counter.

Apply both controls in **every frame of each screen**, including the empty states ("No hay pagos pendientes", "No tienes evaluaciones agendadas", "No tienes clases este día") and the Android versions: an empty list is exactly when a missing way out is most noticeable.

On **S04**, the avatar is the only control on the right; "Nuevo cliente" stays where it is, inside the body, and does not move up into the header. In the tablet frame, the avatar goes at the top right of the left panel, not over the detail panel.

## 3. Update each screen's notes

The footer notes on S11 and S15 currently say the header icon is the role's only secondary route. There are now two: the action icon and the avatar, which opens Perfil (S23). S02's note — "Sin navegación · el avatar abre perfil y cierre de sesión" — is already correct; leave it and add the equivalent to S04, S11 and S15.

---

Nothing else changes. The lists, cards, date pickers, counters, empty states and each card's destination stay as they are; "Cancelar una clase" still leads to S13 and "Mi disponibilidad" to S16; no root gains a tab bar; Notificaciones (S20) still hangs off Perfil and does not move up into the header; and Perfil (S23) does not change at all — this correction is only about how it is reached.
