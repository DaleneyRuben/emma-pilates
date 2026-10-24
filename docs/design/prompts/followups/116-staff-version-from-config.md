# Follow-up — the Staff version comes from the app config

Targets: **S23** (`design/S23 Perfil staff.dc.html`, every frame that draws
the footer) and the generated handoff `design/README.md` (the S23 inventory
row, if it quotes the footer). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by STAFF-005 on 2026-10-23. Prompt S23, point 5, freezes the footer
as "Emma Pilates Studio · versión 1.0". The Staff app's `app.json` says
`expo.version` `1.0.1`, and the profile now reads that value, so the sample
and the built screen disagree. From here on, read the version as the app
config's, not as the literal 1.0 in prompt S23.

## 1. The footer

On every S23 frame that shows the footer, replace

> Emma Pilates Studio · versión 1.0

with

> Emma Pilates Studio · versión 1.0.1

The rest of the line stays: same type, same colour, same place under
**Cerrar sesión**. Do not invent a second version for a role.

## 2. What stays

Leave the summary card, Rol, Sucursales, the menu, **Cerrar sesión**, the
change-password step, and every other screen untouched. The Client app's
own «versión 1.0» footer is MOB-070, not this follow-up.
