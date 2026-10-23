# Follow-up — Horario flags Sessions with more places than working equipment

Targets: **AW02 (Horario)**, the admin shell's sidebar as drawn in **AW02** and the **design system** (`Sistema de Diseño`, the admin shell section), and the **generated handoff `design/README.md`** (the `AW02` inventory row and the sidebar order). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKO-004 on 2026-10-23 ([ADR-0106](../../../adr/0106-log-equipment-faults.md), back-office glossary «Equipment» and «Equipment Kind of a Class Type»). The studio now registers its reformers, cadillacs, and mats on the new «Equipos» page (Prompt AW37), and a fault can take a machine out of service. A Session whose capacity is larger than the working machines of its kind at its Branch would sell a place with no machine behind it. The system never lowers a capacity itself: Horario must make those Sessions stand out so the Administrator edits them in AW03.

## 1. The flag on a Session block

A future, not cancelled Session whose capacity exceeds the working Equipment of its kind carries, in every AW02 frame where one is drawn:

- a 14 px outline warning triangle in Advertencia texto `#9A6B2F` at the right end of the block's first line, before the occupancy («⚠ 3/8»);
- the block's left border in Advertencia `#C9A15B` instead of Palo de rosa (a full Session already uses it; the triangle tells them apart);
- the block's accessible label ends with «, faltan equipos: 7 reformers funcionando para 8 lugares».

Draw it on two blocks of the desktop frame: Thursday 07:00 «Reformer Intermedio · Camila Rojas» (3/8) and Friday 08:00 «Reformer Intermedio» (5/8), with Reformer 5 out of service in the story. In the narrow day list the same two cards carry the triangle and the line «Faltan equipos · 7 de 8» in 12 px Advertencia texto under the time line.

## 2. The notice above the week

Above the grid, under the week stepper, a notice in AW02's notice style on the Advertencia tint: «2 sesiones de esta semana tienen más lugares que reformers funcionando. Baja su capacidad o revisa Equipos.», where «Equipos» is a Palo de rosa text link to AW37. It appears only when the shown week has at least one flagged Session; the singular reads «1 sesión de esta semana tiene más lugares que equipos funcionando. …» and names the kind when only one kind is short («reformers», «cadillacs», «mats»), «equipos» otherwise.

## 3. The sidebar entry

In the Back Office group, a new item **«Equipos»** right after «Insumos», with no badge. Draw it in AW02's sidebar and in the design system's admin-shell sidebar; the other admin screens pick it up on their next export.

## 4. README

- The `AW02` row gains «; a future Session with more places than working Equipment of its kind carries the warning triangle, an Advertencia border, and «Faltan equipos», and a notice above the week links to AW37 (BKO-004)».
- The sidebar order lists «Equipos» after «Insumos», and a new `AW37` row reads «Equipos: Equipment per kind with its state, the open and resolved faults, Nuevo equipo, Registrar falla, Marcar resuelta, Dar de baja (BKO-004)».

## What must remain untouched

Every other AW02 element (the stepper, the legend, the empty slots of follow-up 96, the full and cancelled blocks, the narrow day tabs), AW03, every other admin screen, and the `support.js` runtime.
