# Follow-up — S03's empty roster

Targets: **S03 (Lista de asistentes · Entrenadora)** and the **generated
handoff `design/README.md`** (the `S03` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-009 on 2026-10-23 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), finding S6). A past Session with no
bookings draws «No hay reservas para esta sesión.» as a plain line and keeps
the solid «Guardar asistencia» enabled with nothing to save. The prompt for
`S03` never draws that Session: both frames assume a roster. The empty state
is the plain empty state of `07`, `19`, `S20`, `S21`, and `S22` (README
«Lists between rules», last bullet: a 34px `#C4BAB6` line icon, a Lora 21
weight-500 title, a 14px `#766D69` note, no box). The button follows the
roster. The Staff app already draws this; the export is a design-accuracy
change only.

## 1. `S03` — the empty frame

A **new phone frame**, captioned **«Teléfono · Sin reservas»** with the
sub-caption «Después de la clase, sin clientas que marcar», placed after the
existing «Después de la clase» phone frame and before the Android frame. It
copies that frame's header (back arrow, Class Type as the Lora title, Branch
and time range as the subtitle) for a past Session and replaces the list and
the sticky action zone:

- The content area centres the plain empty state, on Superficie, with no
  card and no box: the quiet 34px calendar line icon in `#C4BAB6` (stroke
  1.1), the title **«Sin reservas»** in Lora 21 weight 500 `#4A4A4A`, and the
  note **«No hay reservas para esta sesión.»** in Work Sans 14/22 `#766D69`,
  centred, up to 260px wide.
- No «Asistencia» eyebrow, no progress count, no client rows, and no
  segmented controls.
- The sticky zone stays (border-top 1px `#D8C9BB`, padding 16px 20px 34px)
  and holds only **«Guardar asistencia»**, disabled: the same dusty-rose fill
  the incomplete roster already uses (`#D8BDB8`, white label, no pointer),
  because there is nothing to save. It is not omitted: the button follows
  the roster, and a past Session still shows it.

An upcoming Session with bookings does not gain a frame. It stays the
existing read-only roster with «Podrás marcar asistencia cuando termine la
clase.» and no button.

Add to the notes card: «**Sin reservas** · Una sesión pasada sin reservas
centra el estado vacío (icono de calendario, «Sin reservas», «No hay
reservas para esta sesión.») y deja «Guardar asistencia» deshabilitado: no
hay nada que guardar (UX-009).»

## 2. README

The `S03` row becomes «Trainer — attendance marking; a past Session with no
bookings centres the plain empty state «Sin reservas» / «No hay reservas
para esta sesión.» and disables «Guardar asistencia» (UX-009)».

## What must remain untouched

The two existing phone frames (the read-only roster before the class ends,
and the segmented «Asistió» / «No asistió» roster after it), the Android
partial-progress frame, the tablet frame, the notes already on the card
(when the control appears, no default value, the button stays dusty rose
until every clienta is marked, green for «Asistió» and terracotta for «No
asistió»), the waitlist (the Trainer does not see it, checklist 30), the
`support.js` runtime and the device frames, and every other README row.
