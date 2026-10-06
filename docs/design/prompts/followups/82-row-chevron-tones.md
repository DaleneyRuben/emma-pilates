# Follow-up — The row chevrons: which are quiet and which are Palo de rosa

Targets: **generated handoff `design/README.md`** (the «Icono tenue» row of
the colour table and a new «Row chevrons (Client and Staff)» section after
«Lists between rules (Client and Staff)»); **Client `02`** (the size of the
three shortcut chevrons only). Send [30](./30-invariants-checklist.md)
alongside this follow-up; like [81](./81-history-rows-between-rules.md) it
names in the README a pattern the frames already draw.

---

Found by MOB-041 on 2026-10-06, comparing the row chevrons of `02`, `18`, and
`S23` with the apps, which now draw every chevron from one shared primitive:

1. Follow-up 81 wrote the «Icono tenue» row as «the 19px row chevrons on
   Client and Staff screens», and its text said the chevrons of `02`, `18`,
   and `S23` are `#C4BAB6`. A census of every chevron inside the Client and
   Staff frames (2026-10-06) says otherwise: only the Perfil menu rows of
   `18` and `S23` draw it in `#C4BAB6`. Every other tappable row ends in the
   same polyline (`9.5,5 16.5,12 9.5,19`, stroke 1.3) in Palo de rosa
   `#B78380`: `02`'s three shortcuts, the Session rows of `03`, `S07`, and
   `S13`, `16`'s «Tu crédito», the agenda rows of `S02` and `S15`, `S04`'s
   results, `S11`'s payments, and `S16`'s blocks. The only quiet glyph on
   `02` is the 19px `#C4BAB6` lock that replaces the chevron on the disabled
   «Reservar una clase» shortcut. The README must say which tone a row takes
   before another screen picks the wrong one.
2. `02` draws its three shortcut chevrons at 20px (`width="20"
   height="20"`), the one outlier among the frames' 19px chevrons. The apps
   draw one 19px chevron everywhere, as they draw one card radius since
   follow-up 80.
3. The «Sucursal:» picker of `03`, `S07`, and `S13` ends in a 16px `#766D69`
   chevron pointing down (`6,9.5 12,15.5 18,9.5`), which no README line
   names either.

## 1. README — the «Icono tenue» row

Change its use column to «Quiet line icons: the 34px empty-state glyphs, the
19px chevrons of the Perfil menu rows (`18`, `S23`), and the 19px lock on
`02`'s disabled shortcut».

## 2. README — a «Row chevrons (Client and Staff)» section

After «Lists between rules (Client and Staff)», add:

- A tappable card or list row ends in a 19px `#B78380` chevron (stroke 1.3,
  polyline `9.5,5 16.5,12 9.5,19`), vertically centred after the row's
  text or value: `02`'s shortcuts, the Session rows of `03`, `S07`, and
  `S13`, `16`'s «Tu crédito», the agenda rows of `S02` and `S15`, `S04`'s
  results, `S11`'s payments, `S16`'s blocks.
- The Perfil menu rows of `18` and `S23` end in the same chevron in
  `#C4BAB6`, after the row's value or unread count.
- The «Sucursal:» picker of `03`, `S07`, and `S13` ends in a 16px `#766D69`
  chevron pointing down (`6,9.5 12,15.5 18,9.5`); `02`'s disabled shortcut
  ends in a 19px `#C4BAB6` lock instead of the chevron.
- Rows between rules (`07`, `S22`) and the notification rows of `19` and
  `S20` carry no chevron.

## 3. `02` — the shortcut chevrons

In every frame, change the three shortcut chevrons from `width="20"
height="20"` to `width="19" height="19"`. Their stroke, polyline, and
position stay.

## Preserve everything else

Every other property of `02`'s shortcuts (the 44px icon tile, the Lora 17
title, the 13px note, the disabled tile and its lock), every other screen,
and every other README line.
