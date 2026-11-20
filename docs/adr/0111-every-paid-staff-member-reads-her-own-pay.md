# Every paid Staff Member reads her own pay

Status: accepted (2026-11-19); changes the «including her own» clause of [ADR-0102](./0102-coordinator-role-without-money.md) and «the Coordinator sees none» in [ADR-0105](./0105-calculate-staff-pay-in-the-system.md)

The Staff app's redesign (row E8, owner, 2026-11-19) gives «Mis pagos» to everyone who is paid, not only Trainers: the Coordinator and the Nutritionist get a «Mis pagos» tab, and the Assistant, whose bar is full, gets «Mis pagos» and «Mi QR de cobro» rows in Perfil. Until now the API let only a Trainer read her Pay Statements, her Salary Payments, and their receipts, and refused the Coordinator even her own (BKO-007).

## Options

1. Keep the Trainer routes Trainer-only and add Coordinator-, Nutritionist-, and Assistant-only copies. Four routes per read, and the same rule written four times.
2. Widen the Trainer routes to every paid Role. No new contract, but a Coordinator would call `/trainer/…`, and the receipt link would keep naming the Trainer.
3. **Recommended:** one rule, «a Staff Member who is paid reads only her own pay», enforced in the use cases, served by Role-neutral routes beside her payout QR: `GET /v1/staff-members/current/pay-statements`, `GET /v1/staff-members/current/salary-payments`, and `GET /v1/staff-members/current/salary-payments/{id}/receipt`. The Trainer routes and `GET /v1/coordinator/pay-statements` stay for the Staff app already released ([ADR-0016](./0016-support-current-and-previous-mobile-releases.md)) and answer under the same rule.

## Decision

Option 3. A Trainer, the Coordinator, a Nutritionist, or an Assistant reads her own Pay Statements, Salary Payments, and receipts; the reads are keyed on the signed-in Staff Member, never on an identifier the caller sends, so nobody reads another person's pay. The Administrator, who reads everyone's pay through Sueldos, is refused these «own pay» routes as before, and a Client is refused. No table changes.

A Staff Member has exactly one Role today (`staff_members.role`), so the app places «Mis pagos» by that Role: a tab for the Trainer, the Coordinator, and the Nutritionist, rows in Perfil for the Assistant. Because the reads follow the Staff Member and not the Role, a person who someday holds several Roles still sees one list of her own pay, never one per Role.

## Consequences

- The Coordinator now sees her own amounts in the Staff app. She still sees no other money: sales, revenue, the Cash Close, other people's pay.
- The Assistant and the Nutritionist have no Pay Statements (the system drafts them only for Trainers and the Coordinator), so their «Mis pagos» lists the Salary Payments the Administrator logged by hand.
