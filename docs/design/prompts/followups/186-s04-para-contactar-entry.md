# Follow-up — «Para contactar» on the Coordinator's root

Targets: **S04 (Buscar cliente)**, frame «iOS · Coordinadora» (follow-up
158), and the **generated handoff `design/README.md`** (the staff navigation
bullets and a new S28 row). Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by BKM-013 on 2026-10-23 (the decisions' section 12, glossary
«Contact Alert», ADR-0102). The Coordinator's Staff app gains the new screen
S28, «Para contactar»: the new Clients to write to by WhatsApp during their
first 90 days.

## 1. `S04` — the Coordinator's frame

Under the full-width outline «Cancelar una clase», add a second full-width
outline button in the same style, **«Para contactar»**, and, when there are
Clients on the list, a count pill at its right end (the unread-count pill of
the README: `#8A5D59` on white text, 22 px, e.g. «3»). It opens S28. With
nobody to contact the button stays, without the pill.

## 2. README

- Add the S28 row: «Para contactar (Coordinación) — the first-90-days contact
  list; «Abrir WhatsApp» opens WhatsApp with the Client's number,
  «Contactada» removes her; reached from S04».
- In the staff navigation bullets, replace «Her follow-up contact list
  arrives with BKM-013.» with «S04 → S28 through «Para contactar».»

## What must remain untouched

Every Assistant frame of S04 and the Coordinator's search field, avatar, and
«Cancelar una clase».
