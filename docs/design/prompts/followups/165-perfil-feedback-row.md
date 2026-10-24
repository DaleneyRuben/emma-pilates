# Follow-up — The «Enviar comentarios» row on Perfil

Targets: **18 (Perfil · Client)** and **S23 (Perfil · Staff)**, and the
**generated handoff `design/README.md`** (the rows for `25` and `S27` and the
two Perfil menus). The new screens have their own full prompts,
[`client/25-send-feedback.md`](../client/25-send-feedback.md) and
[`staff/27-send-feedback.md`](../staff/27-send-feedback.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by REL-012 on 2026-10-23 (system-identity `CONTEXT.md`, Feedback).

## 1. `18` — the Client's Perfil

Every frame's menu card gains one last row after «Cambiar contraseña», with
the same 60 pt height, the 21 pt Palo de rosa line icon (a speech bubble: a
rounded rectangle with a small tail at the bottom left, stroke 1.3), the
label «Enviar comentarios» in 16 px `#4A4A4A`, and the quiet `#C4BAB6`
chevron. It opens `25`. Nothing else on the screen moves: the promotions
switch, «Cerrar sesión», and «Cerrar mi cuenta» stay below the card.

## 2. `S23` — the Staff Perfil

Every frame's menu group (all Roles) gains a row «Enviar comentarios» after
«Cambiar contraseña» and before the Administrator's «Ver la app como…»
(follow-up 108), in the group's existing row style (no icon, quiet chevron).
It opens `S27`. Under the impersonation banner the row stays (the screen
explains the refusal).

## 3. README

Add `25 Enviar comentarios` and `S27 Enviar comentarios` to the inventory,
and the new row to both Perfil menus. Note that both screens come from one
shared component.

Keep everything else on `18` and `S23` exactly as it is.
