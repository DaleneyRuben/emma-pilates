# Follow-up — The attendance list opens «Reportar una falla»

Targets: **S03 (Lista de asistentes · Entrenadora)** and the **generated handoff `design/README.md`** (the `S03` inventory row and a new `S26` row). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKO-004 on 2026-10-23 ([ADR-0106](../../../adr/0106-log-equipment-faults.md)). A Trainer reports a broken machine from her agenda: she opens the Session from S02, as she does to take attendance, and from S03 opens the new **Reportar una falla** screen (Prompt S26), which already knows the Session's Branch and kind.

## 1. `S03` — the link

In every S03 frame, right under the Session line («Sucursal Equipetrol · Jueves 13 de agosto · 07:00 – 08:00»), a quiet text action **«Reportar una falla»** in 14 px Palo de rosa `#B78380`, weight 500, preceded by a 16 px outline wrench icon in the same colour, 44 px tall touch target, left-aligned. It is there before and after the class: a fault can be found at any time. Nothing else in the frames moves except what the new line pushes down by its height.

Add to the notes card: «**Reportar una falla** · Abre S26 con la sucursal y el tipo de equipo de esta clase (BKO-004).»

## 2. README

- The `S03` row gains «; «Reportar una falla» under the Session line opens S26 (BKO-004)».
- A new `S26` row: «Reportar una falla (Entrenadora): choose the Equipment of the Session's Branch, «¿Qué pasó?», «No se puede usar», «Enviar reporte», and the «Gracias por avisar» state (BKO-004)», and the navigation list gains `S03 → S26`.

## What must remain untouched

The roster rows, the segmented attendance control and its rules, «Guardar asistencia», the read-only frame's note, S02, and the `support.js` runtime and device frames.
