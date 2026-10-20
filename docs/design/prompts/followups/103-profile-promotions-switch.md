# Follow-up — Perfil gains a promotions switch

Targets: **Client `18`** (the «Perfil · raíz de pestaña» and «Perfil · sin
foto» frames) and the generated handoff `design/README.md` (its `18` row).
Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BE-023 on 2026-10-20. Until now only a Client who closes her
Account is asked whether she wants to keep receiving the studio's promotions
(follow-up 100, ADR-0097). The studio owner wants to send promotions to
Clients with an open Account too, so each Client can now agree or stop from
Perfil, at any time (ADR-0098). Registration (`01`) does not ask: it stays the
short form every Client must finish, and Perfil is where a Client already
manages her own data.

## 1. `18` — A «Promociones» card

Between the menu card (the one ending in «Cambiar contraseña») and the muted
«Cerrar sesión» button, add one card in the menu card's style (Blanco, 1 px
Borde fuerte, radius 16, the same soft shadow), holding one row with 18 px
side padding and 16 px vertical padding:

- On the left, the label **Recibir promociones de Emma Pilates** (16 px,
  Texto principal) and under it the helper «Usamos tu nombre, correo y
  teléfono para enviarte ofertas y novedades del estudio. Puedes desactivarlo
  cuando quieras.» (13 px, Texto apagado), 4 px apart.
- On the right, vertically centred on the label, a switch 51 × 31 pt with a
  27 pt white knob and a soft shadow. On: the track is Palo de rosa
  (`#B78380`) and the knob sits right. Off: the track is Borde fuerte
  (`#D8C9BB`) and the knob sits left.
- The whole row is the tap target and toggles the switch. It is off until the
  Client turns it on; nothing turns it on for her.

Frame states: on in «Perfil · raíz de pestaña», off in «Perfil · sin foto».
The content area already scrolls under the tab bar; let the new card push the
rest down and shorten no copy.

## 2. Behaviour notes for the handoff

- Turning the switch on or off saves at once; while the change is saving the
  switch is dimmed and does not respond.
- If it cannot be saved, the switch returns to where it was and an Error line
  «No pudimos guardar tu preferencia. Inténtalo de nuevo.» (13 px, Error)
  appears under the helper until the next change.
- Closing the Account still asks again with the unticked box of `24`: closing
  is a new decision about data that is otherwise erased.

## 3. The handoff README

The `18` row gains: «a «Promociones» card with the «Recibir promociones de
Emma Pilates» switch (ADR-0098) sits between the menu and «Cerrar sesión»».

## Leave untouched

The summary card with «Editar», every menu row and its value or badge, the
«Cerrar sesión» button, the «Cerrar mi cuenta» link, the footer, the tab bar,
every other screen (`01` and `24` included), and every other line of the
README.
