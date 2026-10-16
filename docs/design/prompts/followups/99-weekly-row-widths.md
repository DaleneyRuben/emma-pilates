# Follow-up — Weekly row widths for the real time control

Targets: **AW03 Formulario de Sesión** (the «Escritorio · Nueva sesión ·
Cada semana» frame and its «día repetido» frame). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-027 on 2026-10-16, after checking the built admin web in a
real browser. [98](./98-session-owned-duration.md) narrowed each «Días y
horas» row's «Hora» to 84 px to make room for its own Duración box. In the
browser, «Hora» is the native time control, whose clock button needs the
104 px it had before 98: at 84 px it cuts the time off. The Duración box
needs less than 98 gave it, because its input is plain text with a numeric
keyboard and draws no number spinner.

## 1. AW03 weekly frames

In both frames, every «Días y horas» row's grid becomes `minmax(0,1fr)
104px 88px 30px`: «Hora» goes back to 104 px and the Duración box takes
88 px. Each row's Duración input is a text input with
`inputmode="numeric"` instead of a number input, keeping its value, its
`0 8px 0 10px` padding, the 8 px-padded «min» suffix, and its
«Duración, fila N, en minutos» label. «Miércoles» still fits in the day
select, and «240» fits in the Duración box.

## Leave untouched

Every other frame, every row's values (Lunes 07:00 · 60, Miércoles 07:00 ·
60, Viernes 18:30 · 90, and the «día repetido» rows), the helper and
caption lines from 98, and the generated handoff `design/README.md`.
