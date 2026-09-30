# Follow-up — Leftovers found while applying follow-ups 39–67

Targets: **every screen still drawn with `#8A807C` or `#A79E9A`; Client `09`, `18`; `AW02`; the admin shell of every `AW` screen; the design system**. Send [30](./30-invariants-checklist.md) and [59](./59-admin-review-design-findings.md) alongside this follow-up.

---

The exports of 2026-09-30 applied follow-ups 39–63 and 67 but left these
points outside their Targets. Each one is settled below; draw it as written.

## 1. Finish 59 §1's text tones everywhere

59 §1 replaced the two quiet text tones, but the export applied them only to
the design system, `AW03`, `AW16`, `AW22`, `AW23`, `AW28`, and `AW29`. On every
other screen, Client, Staff, and admin alike:

- Texto tenue `#8A807C` becomes **`#766D69`** (5.05:1 on Blanco, 4.85:1 on
  Superficie sutil).
- Texto muy tenue `#A79E9A` becomes **`#7A716D`** (4.76:1 on Blanco, 4.58:1 on
  Superficie sutil).

Change text and icon colours only. Borders, dividers, placeholder hatching,
and disabled fills keep their current colours. The design system keeps the
old values only where it documents the change.

## 2. `09` — the total follows the price drawn

The first frame shows a Plan at **Bs 560**, but its total is computed as
`350 − crédito`. Compute it from the price the frame shows, `560 − crédito`
(never below zero), so the default Bs 120 of Credit reads **Bs 440**. Keep
every label as it is.

## 3. `AW02` — the narrow drawer's Role label

The 420 px drawer still labels the signed-in Role «Administradora». Use
**«Administración»**, as follow-up 52 did for `AW33` and as `S23` does.

## 4. Admin shell — sidebar hover on the palette

`design/README.md` and the shell draw a sidebar item's hover as `#FAF3EC`
background with `#B78380` text. `#FAF3EC` is not in the palette, and the
built admin web uses the palette's rows instead. Draw the hover as **Hover de
fila `#FDF7F2`** background with **Texto `#4A4A4A`** text. The active item
stays `#EFE0DC` / `#8A5D59`, weight 500.

## 5. `18` — the «Evaluación nutricional» row

The shipped Perfil has a row **«Evaluación nutricional»** between «Mi plan»
and «Mis evaluaciones». It opens `13`, the same place the Home card opens.
Add it in both `18` frames with a line icon in the same stroke style as the
other rows and a chevron, no badge. The phone frame must still fit 874 px without scrolling
the tab bar away.

## 6. Client text links on Crema and on the tint

Client screens draw text links («Cambiar foto», «Editar», «Reenviar
correo»…) in Palo de rosa `#B78380`, which is 2.99:1 on Crema `#FAF7F2` and
2.49:1 on Palo de rosa tinte. The shipped app draws every text button in
**Palo de rosa profundo `#8A5D59`**. Use `#8A5D59` for text links on Client
and Staff screens. On Palo de rosa tinte, `#8A5D59` reaches only 4.32:1, so
text on a tinted card (badge text, the pending cards of `22`) uses
**`#7A4F4B`** instead (5.3:1). Primary buttons, the active tab, and icons keep
`#B78380`.

## Preserve everything else

Do not change layout, copy, or any colour not named above.
