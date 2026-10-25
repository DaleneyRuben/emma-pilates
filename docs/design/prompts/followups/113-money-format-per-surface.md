# Follow-up — one money format per surface

Targets: **generated handoff `design/README.md`** (the «Currency» sentence
under the opening copy rules). No numbered screen changes and no
design-system change. Send [30](./30-invariants-checklist.md) alongside this
follow-up.

---

Written by UX-010 on 2026-10-23 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), findings C7 and X2). The apps write
whole bolivianos («Bs 560», «Bs 0») and the admin web writes centavos
(«Bs 560,00», «Bs 1.200,00»); the README's one sentence writes only
`Bs 1.200,00`. The decision is to keep both: prices in the apps are whole
bolivianos, and the admin web keeps centavos where the report reconciles.
Sample amounts already drawn on numbered screens stay as they are.

## 1. The «Currency» sentence

Replace:

> Currency is the boliviano, written `Bs 1.200,00` (dot thousands, comma decimals).

with:

> Currency is the boliviano: whole bolivianos in the apps («Bs 560»), centavos on the admin web («Bs 1.200,00»).

Keep the sentences around it (neutral Spanish, informal «tú», dates
`dd/mm/aaaa`, 24-hour times).

## What must remain untouched

Every numbered screen, `Sistema de Diseño`, and every other README section,
including the catalogue amounts already written as whole bolivianos and the
admin amounts already written with centavos.
