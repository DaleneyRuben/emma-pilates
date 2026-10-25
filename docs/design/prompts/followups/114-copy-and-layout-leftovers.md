# Follow-up — Copy and layout leftovers of the 2026-10-22 audit

Targets: **Client `02` (Inicio)**, the tablet «Sin plan activo» frame only;
**Staff `S13` (Cancelar una clase)**, the Session rows only; **Staff `S14`
(Cancelar sesión)**, the warning box only. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-012 on 2026-10-23 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), findings C5, S7, and S8). The apps now
draw what this follow-up asks; the frames still draw the old copy and the
full-width tablet card. Change only the three points below.

## 1. `02` — the no-plan card stops at 720 px on the tablet

The tablet frame of `02` caps the Promotions carousel at 720 px and notes
«La tarjeta se detiene en 720 px … el resto sigue en una columna», but it
draws the active-plan card, not «Elige tu plan y vuelve al mat». On an iPad
that card stretched to the full content width and read as a banner.

Draw the no-plan state on the tablet: the same Palo de rosa card, centred,
**720 px** wide at most (the carousel's cap), with the column continuing
under it at the phone width. The phone frame stays full width of its column.
The greeting, the carousel, the shortcuts, and the active-plan card stay.

## 2. `S13` — the Session row names the Branch without «Sucursal »

The pill above the list already reads «Sucursal: Centro». The row repeats
«Sucursal Equipetrol» (and «Sucursal Urubó») after the pin, while `S02`,
`S07`, and the Client app write the bare Branch name for the same place.

In every Session row of every frame, the pin line is the bare Branch name
(«Centro», «Equipetrol», «Urubó»). The pill, the «Elige una sucursal» sheet,
and the notes stay, including their «Sucursal:» and «Sucursal …» wording.
Do not change `S02` or `S07`.

## 3. `S14` — the warning box drops its em dashes

The warning reads «…a cada cliente afectado — incluso si ya no podían
cancelar por su cuenta — y se les notificará.» No other screen uses an em
dash in prose. Rewrite that clause with commas, in both frames:

«Se cancelarán las 6 reservas de esta clase, se reembolsará una clase a cada
cliente afectado, incluso si ya no podían cancelar por su cuenta, y se les
notificará. También se notificará a las 2 en lista de espera.»

The second frame uses the same commas for its ten Bookings. Keep
«cliente» / «clientes»: a later follow-up (110, UX-005) settles the feminine
register, and this one must not take that change. No en dash either.

## What must remain untouched

`04`'s «Entrenadora certificada» line, `05`'s cancel sheet, `S12`'s receipt,
`AW21`'s Plan column, and every screen not named in Targets. `04`, `05`,
`S12`, and `AW21` are app work in UX-012; their frames already say what the
apps now show, or a later follow-up owns the remaining difference.
