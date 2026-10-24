# Follow-up — «Para contactar» in the admin sidebar

Targets: **AW02 (Horario)**, the **design system** (section 06, the admin
sidebar), and the **generated handoff `design/README.md`** (the admin
navigation bullets and a new AW39 row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-013 on 2026-10-23 (the decisions' section 12, glossary
«Contact Alert»). The new page AW39, «Para contactar», lists the new Clients
the studio should write to in their first 90 days. The Administrator and the
Coordinator both work it (ADR-0102, the decisions' table 7), so both
sidebars carry it.

## 1. `AW02` — the entry, Administrator

In every AW02 frame, the «Back Office» group gains **«Para contactar»** right
after «Clientes», before «Pagos». When there are Clients to contact it
carries the count badge of the «Pagos» entry (Primario tinte pill, Primario
profundo 12 px tabular text, e.g. «3»); with none, no badge.

## 2. `AW02` — the entry, Coordinator

In the frames «Escritorio · Coordinadora» and «Escritorio · Coordinadora ·
Sección sin acceso» (follow-up 155), her «Back Office» group reads
**Clientes · Para contactar · Personal**, with the same badge. The count is a
number of people, never money, so she sees it.

## 3. Checklist 30 §5, amended

From here on, §5's «Back Office» line reads: Clientes · **Para contactar** ·
Pagos · Insumos · Evaluaciones nutricionales · Personal · Nómina · Gastos ·
Categorías de gasto. Everything else in §5 stands, «Descuentos» included.

## 4. Design system and README

- Section 06's admin sidebar sample gains the same entry in the same place.
- README: add the AW39 row («Para contactar — the first-90-days contact list
  for the Administrator and the Coordinator; «Abrir WhatsApp» opens `wa.me`,
  «Contactada» removes the Client; no amount») and the navigation bullet
  «Sidebar «Para contactar» → AW39, for both Roles.»

## What must remain untouched

Every other sidebar entry and its order, the badges of Pagos and Insumos, the
week grid, the session panel, and AW33.
