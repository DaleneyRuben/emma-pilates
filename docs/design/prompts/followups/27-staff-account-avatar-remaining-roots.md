# Follow-up — The account avatar on the three remaining staff roots

Targets: **S02 (Mi agenda · Entrenadora)**, **S04 (Buscar cliente · Asistente)**, **S11 (Pagos pendientes · Administración)**. Send as a follow-up.

Replaces the unapplied part of [follow-up 18](./18-staff-account-avatar.md), which only landed on `S15`. Do not re-send 18 — it still asks for the change on `S15`, where it is already done.

---

`S15` now does this correctly and is the reference: the header carries the screen's action icon and, **always rightmost**, a circular avatar that opens Perfil (`S23`). Copy that header exactly into the three roots that still lack it.

Today:

- **S02** and **S04** draw the avatar as a decorative `div` — not a button, no pressed state, leading nowhere. It also shows a **single letter** ("C", "J"), while the rest of the product uses two (`02` uses "LM", `AW33` uses "MF", `S15` uses two).
- **S11** has no avatar: the top-right corner holds the "Cancelar una clase" button (→ `S13`) and nothing else.

No staff role has a tab bar, so the avatar is the **only** route to `S23`, and therefore the only route to changing a password or logging out. Entrenadora, Recepción and Administración have none today: they are locked inside their root screen with no way out of the session.

## 1. The avatar is a control, not an ornament

On all three screens, exactly as on `S15`:

- 46px circle, `#D8BDB8` fill, initials in white Lora, **two letters** — the first name and surname of whoever is signed in. If the screen currently carries only a first name, use the surname `S23` already gives that role; if the role doesn't appear in `S23`, pick one and use it consistently across every screen of that role.
- Minimum 44px touch target and a pressed state (the same soft darkening as `S15`).
- Accessible label "Tu cuenta".
- Tapping it opens **Perfil (`S23`)**, which returns to this same root via the back arrow. It does not open a sheet or an intermediate menu.

## 2. Where it goes when there is already an action icon

The right side of the header may carry two controls and **the avatar is always the rightmost one**, so its position doesn't shift from role to role. 10px apart, as on `S15`.

- **S11** — first the existing "Cancelar una clase" button (46px rounded square, `#D8C9BB` border, white fill, palo de rosa icon), then the avatar.
- **S02** and **S04** — the avatar is the only control on the right; it stays where it is and simply becomes a button.

The difference in shape tells the two apart: **outlined rounded square = screen action; filled circle with initials = your account.** Don't put the avatar inside a square and don't give it a border.

If the title no longer fits beside both controls — "Pagos pendientes" with its counter in the Android frame is the tight case — drop the title to 24px or let it wrap to two lines, but do **not** shrink the controls or remove the pending-payments counter.

Apply the change in **every frame of each screen**, including the empty states ("Día sin clases", "Sin resultados", "Sin pagos pendientes") and the Android and tablet versions: an empty list is exactly when a missing way out is most noticeable. In `S04`'s tablet frame, the avatar goes at the top right of the left panel, not over the detail panel.

## 3. Update each screen's notes

`S11`'s note currently says the header icon is the role's only secondary route. There are now two: the action icon and the avatar, which opens `S23`. Add the equivalent note to `S02` and `S04`, worded as `S15` already words it.

---

Nothing else changes. The lists, cards, phone search, date picker, counters, empty states and each row's destination stay as they are; "Cancelar una clase" still leads to `S13`, "Nuevo cliente" stays inside `S04`'s body rather than moving into the header, no root gains a tab bar, Notificaciones (`S20`) still hangs off Perfil, and `S23` does not change at all — this correction is only about how it is reached.
