# Widen the Coordinator Role and let the Administrator book for Clients

Status: accepted (2026-11-03); supersedes part of [ADR-0102](./0102-coordinator-role-without-money.md)

On approving the admin web's new structure ([follow-up 232](../design/prompts/followups/232-admin-web-structure-approved.md)), the owner made the Coordinator her contact point with Clients and Staff. The line of ADR-0102 stays, operations yes, money no: she never sees an amount, a price, a Payment, or pay. What changes is which operations count as hers.

She now also:

- **approves or rejects Freezes** (`GET /administrator/freezes`, its detail, and the decision);
- runs the **carousel**: lists, creates, edits, orders, publishes, unpublishes, and deletes Promotions, and reads their images. Deleting is part of keeping the carousel she publishes; it only archives the row ([ADR-0086](./0086-soft-delete-every-database-row.md));
- sees **Referidos** and **Contactos**, exports the contacts, and withdraws one;
- lists, exports, and triages **Comentarios**;
- lists **Insumos** and the month's **Retiros**, and records Withdrawals and Restocks. Creating, editing, and archiving a Supply stays with the Administrator;
- reads the **Nutrición** agenda (`GET /administrator/evaluations`); cancelling an Evaluation stays with the Administrator;
- reads **Reglas del estudio** (`GET /administrator/studio-settings`); saving them stays with the Administrator.

Equipos (ADR-0106) and assigning a Trainer's Branches (ADR-0102, 2026-10-28) were already hers. She still never opens Dinero, Informes › Dinero, the Simulador, Tipos de clase, Planes, Sucursales, Fundadoras, or Clases de campaña, and courtesy classes and returned classes stay with the Administrator.

**Amounts in the widened reads.** The Freeze review, Promotions, Promotion Contacts, Referrals, Feedback, Supplies, Withdrawals, and the Evaluation agenda carry no amount, so they answer her as they answer the Administrator. The Studio Settings read carries two: the Paid Evaluation price and the Nutritionist's fee. For the Coordinator both come back `null` (the fields are nullable in the contract), and the admin web leaves that rule out. Percentages (tax rate, renewal targets, founder discount) are rules, not amounts, and stay.

**The Administrator books for Clients.** Follow-up 232 has the owner booking a Client from Horario. Booking on a Client's behalf was the Assistant's at her Branches and the Coordinator's at every Branch; the Administrator now does it too, at every Branch: booking, joining the Waitlist, cancelling, rescheduling, and taking a Client off a Waitlist (`actsForClientsAt`). The Booking records the Administrator's Account as who acted, like any Staff Member's.

Authorization stays in the use cases with default-deny tests ([ADR-0054](./0054-enforce-contextual-authorization-in-use-cases.md)); the authorization matrix records the new decisions endpoint by endpoint. No schema changes: the `COORDINATOR` Role already exists.
