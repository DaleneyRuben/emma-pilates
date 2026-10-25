# Follow-up — the admin web at 1024 px

Targets: **generated handoff `design/README.md`** (the «Responsive» bullet
under «Admin web interactions», and one sentence in «Admin web — shell»).
No numbered screen changes and no design-system change: the design draws
1440 and 420 only, and this follow-up records the width it does not draw.
Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-011 on 2026-10-23. The UI/UX audit (UX-001, findings A3 and A4)
walked the admin web at 1024 × 900, a 13-inch laptop, and found two places
the 1440 layout does not survive a narrower desktop:

- `AW02` Horario kept seven equal columns and the 236 px sidebar, so every
  Session block truncated to «Refo… 0/12 · 07:00 – 07:…».
- `AW16` Reporte wrapped «mayo de 2026» and «Bs 780,00» in «Totales por mes»
  onto two lines, and the three tiles squeezed their captions.

Numbered 204, not 114: 110–113 belong to UX-005, UX-006, UX-009, and UX-010,
and 114 belongs to UX-012.

## 1. The 1024 px rules

A desktop browser from **1024 px** up to just under **1280 px** keeps the
sidebar (it still collapses only below 1024 px, behind «Abrir menú») and
reads as follows. At **1280 px** and up, including the 1440 reference, nothing
below applies: the sidebar stays 236 px and the Session block, the week
headers, and the tiles stay as drawn.

- **Sidebar:** 168 px instead of 236 px, and the main area's padding 16 px
  instead of 32 px. The wordmark, the section order, and the active and hover
  states stay.
- **`AW02` Session block:** three lines, never one truncated line. The Class
  Type on its own line, in full («Reformer Pilates», not «Refo…»); the start
  and end time on the next («07:00 – 07:50»), with the Trainer after a middle
  dot; the occupancy («0/12», or «Llena · N en espera») on the third. The
  type and the time do not wrap. The hour gutter is hidden (the block
  itself names the time) and the day headers tighten their tracking, so a
  seven-column week still fits. At 1280 px the gutter returns at 56 px.
- **`AW16` «Totales por mes»:** a month name («mayo de 2026») and every amount
  («Bs 780,00», «−Bs 2.480,50») stay on one line (`white-space: nowrap`). A
  tile caption («Ingresos», «Gastos», «Neto») stays on one line; only the
  explanation under the figure may wrap. The tile figure may step down from
  Lora 32 to Lora 26, and the tile padding from 20 px to 12 px, so the three
  tiles still sit in one row. Below 1100 px «Gastos por categoría» and
  «Totales por mes» stack instead of sharing a row, so a month name has the
  width of the main area; from 1100 px they share the row again.

## 2. README

In «Admin web — shell», after the sentence «Reference width **1440px**; a
420px narrow-browser variant is drawn for every screen.», add:

> From 1024px up to just under 1280px the sidebar stays, at 168px instead of
> 236px, and the main area's horizontal padding is 16px. Below 1024px it
> still collapses behind «Abrir menú».

In «Responsive», after the existing bullet, add:

> - From 1024px to just under 1280px, a width not drawn: an `AW02` Session
>   block is three lines (Class Type, then time and Trainer, then occupancy)
>   and neither the type nor the time wraps; `AW16`'s month names and amounts
>   in «Totales por mes» do not wrap, and a tile caption stays on one line
>   (only the explanation under the figure may wrap). Below 1100px «Gastos
>   por categoría» and «Totales por mes» stack. At 1280px and up the 1440
>   drawing applies unchanged.

## What must remain untouched

Every numbered screen and `Sistema de Diseño`; the 1440 px and 420 px frames
of `AW02` and `AW16`; every other README section, including the 420 px rules
already in «Responsive».
