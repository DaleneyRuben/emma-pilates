# Follow-up — Card actions are text buttons, not filled buttons

Targets: **`V2 05 Mis Reservas con aviso`**, and from here on every booking or
evaluation card on v2 (client `05`, `15`; staff `S21`). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-02. Follow-up [225](./225-visual-system-v2.md) drew
«Cancelar» as the Destructive button (an `#F7E5E0` fill) and «Reprogramar» as
Secondary (a Rosa tinte fill) inside each booking card. On the canvas the owner
found the two pinks clashing with each other and with the card. Of three
options drawn side by side (neutral outline, text buttons, one neutral fill)
she chose the text buttons. From here on, read 225 §4's «Destructive» row and
§9's card actions from this follow-up.

## 1. The action row of a card

Under the card's content, a 1 px Arena `#E6DBD0` divider, then the action as a
Text button aligned right: 44 tap height, 12 side padding, Work Sans 600 15, no
fill and no border. The card's bottom padding drops from 16 to 4 so that the
button's own height gives the space.

- Cancelling a booking: «Cancelar reserva» in Error `#A04E3E` (5.0:1 on Lino).
- Inside the 2 h 30 window: «Reprogramar» in Rosa enlace `#7D4F4B`.

The red solid button stays only inside the confirmation sheet, which this
follow-up does not change.

## 2. The Destructive button kind

The `#F7E5E0` filled Destructive button of 225 §4 is used only where an action
stands alone on a screen (for example «Cerrar mi cuenta» at the end of
`24`). Never inside a card.
