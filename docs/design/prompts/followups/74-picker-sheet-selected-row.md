# Follow-up — The selected row in picker sheets

Targets: **Client `03`; Staff `S13`, `S17`; generated handoff
`design/README.md` (a «Picker sheets» subsection)**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
[70](./70-leftovers-of-the-2026-09-30-exports.md), and
[73](./73-unread-notifications-badge.md) §4. It finishes 70 §6 and
[72](./72-app-outlined-button-labels.md) for the one text 72 did not reach
(a sent follow-up is never edited).

---

Three bottom sheets mark the chosen row by drawing its label in Palo de rosa
`#B78380`, which is 3.2:1 on Blanco `#FFFFFF`, below the 4.5:1 text at these
sizes needs, beside a `#B78380` check:

- `03`, «Elige una sucursal» (the Branch chip's sheet): the selected Branch's
  name (Lora 17 px 500) and its check.
- `S13`, «Elige una sucursal»: the selected «Sucursal …» or «Todas las
  sucursales» row (16 px) and its check.
- `S17`, «Hora de inicio» / «Hora de fin»: the current time (16 px, tabular)
  and its check.

No static frame draws these sheets open; each opens from its chip or field in
the interactive frame, and the colour is set by that frame's state.

## 1. The selected row

In all three sheets, the selected row's label turns **Palo de rosa profundo
`#8A5D59`** (5.54:1 on Blanco) and keeps its family, size, and weight. The
check stays `#B78380` (an icon, 3.2:1, above the 3:1 a state mark needs), in
the same place, glyph, size, and stroke; it is the mark that does not rely on
colour alone. Unselected rows stay Texto `#4A4A4A` with no check (`03` keeps
its transparent check slot so the names do not shift). `03`'s addresses stay
`#766D69`.

## 2. README

Add a **«Picker sheets (Client and Staff)»** subsection right after «Unread
badges»: a bottom sheet that picks one value (`03` and `S13` Branch, `S17`
time) shows every option as a row; the selected row carries its label in
`#8A5D59` and a `#B78380` check on its right; other rows are `#4A4A4A` with no
check; tapping a row picks it and closes the sheet; screen readers hear the
row as selected.

## Preserve everything else

The chips and fields that open the sheets, the sheet layout, scrim, handle,
titles, row heights and dividers, the day and class-type chips, every other
frame, and every admin-web screen keep their current colours and copy.
Primary buttons, the active tab, and standalone icons keep `#B78380`.
