# Follow-up — payment status icons are stroked line icons

Targets: **`11` (Estado del pago)** (the three state frames) and **Sistema
de Diseño (Prompt 00)** (section 07 «Fundamentos»: the «Íconos» row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-006 on 2026-10-23 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), finding C2). The Client app draws
«Tu pago está en revisión» with the ⌛ emoji on a solid Advertencia disc.
It is the only emoji in the product, it renders differently on each
platform, and it does not match the stroked line icons every other state
uses. The design system allows only thin, single-weight line icons, and
`11` already draws a clock and a check — but the pending glyph is a clock,
not an hourglass, and no frame draws the rejected state the notes card
already promises. The app is built from the glyphs below.

## 1. The three discs

Each state of `11` opens with one **72 × 72 px disc**, fully rounded, and
one **26 px** stroked line icon centred on it. The icon sits on the 24-unit
grid, `fill="none"`, round caps and joins, stroke **1.3**, rendered at 26
px, in **Blanco `#FFFFFF`**. The disc is the semantic colour at 100 % —
never a 14 % halo, never Palo de rosa:

| State | Disc | Glyph |
| --- | --- | --- |
| Pendiente | Advertencia `#C99A4E` | hourglass |
| Confirmado | Éxito `#7C9473` | check |
| Rechazado | Error `#B25D4B` | cross |

The three glyphs, on the 24-unit grid:

- **Hourglass.** Two triangles meeting at the waist, with a short fill in
  the lower half so the wait reads as time passing:
  `M7 4.5h10M7 19.5h10M8 4.5l4 6.2 4-6.2M8 19.5l4-6.2 4 6.2M10.2 16.8h3.6`.
- **Check.** The check the icon row already draws:
  `polyline points="4.5,12.5 9.5,17.5 19.5,7"`.
- **Cross.** Two diagonals, the same weight, not a filled glyph:
  `line (6.5, 6.5)–(17.5, 17.5)` and `line (17.5, 6.5)–(6.5, 17.5)`.

The disc is decorative. The status is spoken by the title already on the
screen («Pago en revisión», «Pago confirmado», «Comprobante rechazado»);
the icon adds no second reading.

## 2. `11` — the three frames

In the **Pendiente** frame, replace the 104 px amber halo and its clock
with the 72 px Advertencia disc and the hourglass. In the **Confirmado**
frame, replace the 104 px green halo and its check with the 72 px Éxito
disc and the check above. Add a **third phone frame**, captioned
**Rechazado** with the sub-caption «Error · subir otro comprobante», after
Confirmado: the same centred column as Pendiente, the Error disc and the
cross, the Lora title **«Tu comprobante fue rechazado»**, a white card
whose first line is the muted label **Motivo** and whose body is «El monto
no coincide con el plan.», the note «Sube un nuevo comprobante para activar
tu plan. Tu crédito volvió a estar disponible.», a solid Error button
**«Subir un nuevo comprobante»** (`#B25D4B`, white, 54 px, radius 8), and
the outlined **«Volver al inicio»** under it. No emoji anywhere on the
screen.

The notes card «Color semántico» now says the disc is the semantic colour
at 100 % with a white 26 px stroke, not a 14 % halo, and that the rejected
frame is drawn. Everything else on the two existing frames stays: the
pills, the summary cards, the buttons, the tab bar, and the copy.

## 3. Design system — the icon row

In section 07 «Fundamentos», the «Íconos · trazo 1,3 px» card gains the
hourglass and the cross at the end of the existing row, at the same 24 px
and 1.3 stroke. No other icon in that row moves.

## What must remain untouched

Every other numbered screen; every other card of «Fundamentos»; the tab
bar, the pills, the summary cards, and the copy of `11`'s Pendiente and
Confirmado frames.
