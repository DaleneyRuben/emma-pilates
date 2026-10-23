# Follow-up — `AW33` opens «Reglas del estudio»

Targets: **AW33 Menú de usuario** (the «Escritorio · Menú abierto» and
«Navegador angosto · 420 px» frames) and the generated handoff
`design/README.md` (its `AW33` row, the navigation list, and a new `AW36`
row). Send [30](./30-invariants-checklist.md) and the new screen prompt
[AW36](../admin-web/36-reglas-del-estudio.md) alongside.

---

Written by BKM-004 on 2026-10-23. The new page AW36 shows the Studio Settings
(ADR-0101): the rules the Administrator may change from the web and the ones
that change only with a release. It is the studio's configuration, not a
daily list, and adding a sidebar item would change the sidebar of every
admin screen (the reason follow-up 102 gave AW35 no item either), so the
account menu opens it.

## 1. The menu row

In AW33's popover, the first row under the divider becomes **Reglas del
estudio** (36 px, 13.5 px, Texto, the same hover as its siblings, with a
15 px outline sliders icon in Texto secundario like their lock and exit
icons), above «Cambiar contraseña» and «Cerrar sesión», which keep their
order and tones. It opens AW36 and closes the popover. In the narrow frame's
bottom sheet it is the first row too (48 px, 14.5 px, a 17 px icon).

## 2. The handoff README

- The `AW33` row gains «a «Reglas del estudio» row opens `AW36`».
- A new row after `AW35`: `AW36` | Reglas del estudio | the Studio Settings
  (ADR-0101): «Puedes cambiar» with Mínimo de reservas, Impuestos, the three
  renewal targets, and Fecha de apertura, saved as a new audited version with
  «Guardar cambios»; «Reglas fijas» with the Cancellation Window, the minimum
  check, the Start Date limit, the Founder membership, Invita a una amiga, and
  the paid Evaluation; reached from `AW33`, no sidebar item.
- The navigation list gains `AW33 → AW36` («Reglas del estudio»).

## Leave untouched

The menu header, «Cambiar contraseña» and its panel, «Cerrar sesión» and its
confirmation, the shell and sidebar, every other screen, and every other line
of the README.
