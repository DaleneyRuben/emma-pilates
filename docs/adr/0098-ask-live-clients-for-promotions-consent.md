# Ask live Clients for promotions consent

Status: accepted

[ADR-0097](./0097-erase-personal-data-when-a-client-account-closes.md) keeps a Promotion Contact only for a former Client who ticks the box while closing their own Account, so the studio has nobody else it may send promotions to. BE-023 lets a Client with an open Account give or withdraw the same consent from Perfil:

- Each period of consent is a **Promotions Consent** row (`booking.client_promotions_consents`): the Client, when they agreed, and when they stopped. A partial unique index allows one open consent per Client. Turning the switch on again starts a new row, so earlier periods stay as the record of what the person agreed to and when. The rows hold no personal data of their own; the name, email, and phone are read from the Client and Account while the consent is open.
- `GET` and `PUT /api/v1/clients/current/promotions-consent` read and set it. Giving an open consent again keeps its time; withdrawing when none is open changes nothing.
- AW35 lists both kinds in one table, with a «Tipo» column and the same «Tipo» in the CSV: live Clients with an open consent and Promotion Contacts. «Dejar de enviar» on a live Client closes their consent (audited `promotions_consent.withdrawn`) and leaves the Account as it is; on a Promotion Contact it erases the contact as BE-022 built.
- Closing an Account ends any open consent with the closure time and soft-deletes it, whoever closes it. If the Client ticks the closure box, the new Promotion Contact keeps the time of the live consent that was open, because that is when the person first agreed; otherwise it takes the closure time. The box still starts unticked (follow-up 100): closing is a new decision about data that is otherwise erased.

Registration (`01`) does not ask. Asking there would lengthen the one form every Client must finish and put a marketing question before they have used the studio; Perfil is where a Client already manages their own data.

Alternatives rejected:

- **Two columns on `booking.clients`** (`promotions_consented_at`, `promotions_withdrawn_at`). Simpler, but turning the consent on again overwrites when it was first given and withdrawn, losing the record of earlier periods.
- **Copy live Clients into `booking.promotion_contacts`.** It duplicates their name, email, and phone, which would then go stale when they edit their profile and need erasing in two places on closure.
- **Pre-tick the closure box for a Client who already consents.** Follow-up 100 forbids a pre-ticked box, and Google Play's policy expects affirmative consent.
