# Follow-up — Outlined-button labels and accent labels on Client and Staff screens

Targets: **Client `03`, `04`, `05`, `10`, `11`; Staff `S04`, `S06`, `S08`,
`S16`, `S21`, `S22`; generated handoff `design/README.md` (Buttons)**. Send
[30](./30-invariants-checklist.md) and [70](./70-leftovers-of-the-2026-09-30-exports.md)
alongside this follow-up; it finishes 70 §6, which named only text links
(a sent follow-up is never edited).

---

70 §6 moved Client and Staff text links to Palo de rosa profundo `#8A5D59`
because Palo de rosa `#B78380` is 2.99:1 on Crema `#FAF7F2`. The same tone
still labels the outlined (secondary) buttons and two accent labels on these
screens. The shipped apps draw no text in `#B78380`: the outlined button in
`mobile-core` has a `#B78380` border and a `#8A5D59` label.

## 1. Outlined buttons

On Client and Staff screens, an outlined button keeps its 1 px `#B78380`
border, transparent fill, and `#F6EDEB` hover tint; its label, and the icon
inside it, turn **`#8A5D59`**. This covers «Unirme a la lista de espera»
(`04`, `S08`), «Reprogramar» (`05`, `S21`), «Volver al inicio» (`11`), and
the icon-led outlined buttons and chips on `S04`, `S06`, `S16`, `S21`, and
`S22`.

## 2. Accent labels

«Lista de espera» on `03` and «Sube tu comprobante de transferencia» on `10`
turn **`#8A5D59`**.

## 3. README

Under Buttons, «Secondary» reads: 1 px `#B78380` border, transparent fill,
`#8A5D59` label on Client and Staff screens (`#B78380` on the admin web),
hover tint `#F6EDEB`.

## Preserve everything else

Primary buttons, the active tab, standalone icons (including icon tiles whose
colour only feeds an SVG), the screen eyebrows and `S01`'s role legend in the
documentation, and every admin-web screen keep their current colours. Change
no layout or copy.
