# Follow-up — Founder renewal banner

Targets: `12` (Mi plan). Send [30](./30-invariants-checklist.md) alongside.

---

Written by BKM-010 on 2026-10-23 ([booking ADR-0008](../../../../booking/docs/adr/0008-founder-membership.md)).
A founder keeps her 15 % only if she renews within 7 days of the current
Plan's real end. Mi plan names that deadline.

## `12` Mi plan

- When the Client holds an active Founder Membership and a current
  Subscription, add a banner above the plan card: «Renueva antes del {date}.»
  The date is the current Subscription's real end plus 7 days, written as
  Mi plan already writes dates («30 de octubre de 2026»).
- No banner when she is not a founder, when the membership is lost, or when
  she has no current Subscription.

## Leave untouched

The expiring-soon note, «Siguiente plan desde …», the badges, and every other
screen.
