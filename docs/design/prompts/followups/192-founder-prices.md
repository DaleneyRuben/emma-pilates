# Follow-up — Founder prices

Targets: `08` (Elige tu plan), `09` (Detalle del plan), and `S09` (Elige un
plan). Send [30](./30-invariants-checklist.md) alongside.

---

Written by BKM-010 on 2026-10-23 ([booking ADR-0008](../../../../booking/docs/adr/0008-founder-membership.md)).
A founder pays 15 % less on every Plan except the single class. The price she
sees is the discounted one; everyone else sees the list price.

## `08` Elige tu plan

- On a founder's cards, the price is the discounted price. Under it, in Texto
  tenue and struck through, the list price.
- The single class (1 class, Bs 80) never shows a struck price.
- A Client who is not a founder sees only the list price, as today.

## `09` Detalle del plan

- The price line uses the same discounted price, with the list price struck
  through beside it, only for a founder and only when the Plan is not the
  single class. The amount to transfer uses the discounted price.

## `S09` Elige un plan

- The Assistant's quote shows the same pair: the discounted price, and the
  list price struck through under it, for a founder. The single class stays
  at its list price. The cash to collect is the discounted price minus any
  credit.

## Leave untouched

The validity lines, the weekly cap, the Start Date row, and every other
screen.
