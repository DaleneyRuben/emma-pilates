# Runbook: answer a personal data request

Use this when someone asks what the studio holds about them, asks to correct
it, or asks for it to be deleted. It implements decision G8 of
[BE-007](../implementation/BE-007-data-governance-proposal.md): the request is
answered by an operator, not by a self-service export. Bolivian Constitution
art. 130 (habeas data) is the basis; the reply goes out **within 15 business
days** of a verified request. No export endpoint or screen exists.

Business and audit rows are kept indefinitely (G1), but closing a Client
Account erases its name, email, phone, password, and profile photo
([ADR-0097](../adr/0097-erase-personal-data-when-a-client-account-closes.md),
which replaced G7). A former Client can still ask: what is left about them is
a Promotion Contact, if they kept one, and the audit records that carry an
email (see the [audit catalog's retention](../security/audit-event-catalog.md#retention)).

## Who may do this

Only the studio owner or an Administrator the owner names, with read-only
access to the production database. Use a read-only database role where the
provider offers one. The query file also starts with
`SET default_transaction_read_only = on`, so it cannot change data.

## 1. Verify the person

- Reply only to the email address on the Account. A request from any other
  address, or on someone else's behalf, is answered with a request to write from
  the Account's address or to come to the studio with a photo ID.
- If the person cannot reach that mailbox, verify in person at the studio with
  a photo ID that matches the name on the Client record.
- Never send the answer to a different address, and never confirm over the
  phone whether an email is registered.

## 2. Record the request

Add a row to the log at the end of this file the day it arrives: date received,
who asked, how they were verified, and the deadline (15 business days).

## 3. Collect the data

Run the query file once per request. It answers for every Account that still
uses the email. A Client Account closed since ADR-0097 no longer holds the
email (it reads `cerrada-<account id>@cuentas-cerradas.invalid`), so the query
does not find it; its history is anonymous, so nothing personal is left to send.

```sh
psql "$DATABASE_URL" -v email='person@example.com' \
  -f docs/runbooks/personal-data-request.sql
```

It returns one result per context:

| Context | What it returns |
| --- | --- |
| System Identity | The Account (dates, no password hash), sessions, devices, inbox notifications, and audit records that name the Account |
| Booking & Membership | The Client profile, Subscriptions, Payments, Bookings with attendance, Waitlist entries, Evaluations, Credit ledger, and Referrals |
| Back Office | Salary Payments, only when the person is a Staff Member |

The query file does not read promotions yet. Search the person's name, email,
or phone on the admin web's **Contactos para promociones** (AW35, reached from
Promociones): a «Activa» row is a live Client's open Promotions Consent
(ADR-0098), the other kind a former Client's Promotion Contact (ADR-0097).
Add what it shows, with the date they agreed, to the answer.

To hand the result over, save each result as a CSV with `\copy (…) TO
'file.csv' CSV HEADER` in an interactive `psql` session (still read-only), or
copy it into a spreadsheet. Check by eye that no other person's data is in the
files. The Referral query shows only the role and dates, never the other
person's name.

Not included on purpose: password hashes, credential digests, push tokens, and
device digests (security material, not personal data the person can use).
Transfer receipt images are deleted from storage by retention (ADR-0075), so
only their metadata remains; profile photos are in the app the person already
uses.

## 4. Send the answer

Send the files from the studio's email to the verified address, with a short
cover message in Spanish: what the files contain, that the studio keeps
Payments, Subscriptions, Bookings, and the Credit ledger for accounting
reasons, and how to ask for a correction. Mark the log row with the send date.

## Corrections

- The person can change their own name, phone, and email from Editar perfil.
- Anything else (a wrong Payment, an attendance error) is corrected through the
  product by an Administrator, which leaves an audit record. Never edit rows
  with SQL for a correction request.

## Deletion requests

The database never physically deletes a row (ADR-0086), but closing a Client
Account erases the personal data on it (ADR-0097):

- A Client can close their own Account from Perfil → Cerrar mi cuenta, or ask
  an Administrator to close it from AW22 (BE-007 G2). Closing cancels what is
  ahead, ends the Subscription, forfeits the Credit, revokes every session,
  frees the email, and erases the name (it becomes «Cliente eliminado»), email,
  phone, password, and profile photo.
- Payments, Bookings, Subscriptions, the Credit ledger, Evaluations, Referrals,
  and audit records stay, under the anonymous Client, for the studio's
  accounting. Notifications Staff Members already received may still name the
  Client, and the audit records listed in the catalog's retention section keep
  the email they recorded. Backups age out within 12 months.
- An Administrator's closure never keeps a Promotion Contact. If the person
  also asked to stop promotions, it is enough: the closure ends their open
  Promotions Consent.
- Say that in the reply, in those words; do not promise that every trace is
  gone. If the person insists on erasing the accounting history too, escalate
  to the owner: it needs a decision and legal advice, not an operator's SQL.

## «Stop promotions» requests

A person may ask to stop receiving promotions by email or WhatsApp, by
writing to `soporte@` or by replying to a promotion. Verify them as in step 1
(the address or phone the promotions went to is enough to identify the row),
then on the admin web:

1. Open Promociones → **Contactos para promociones** (AW35) and search their
   name, email, or phone.
2. Select **Dejar de enviar** on their row and confirm.
   - A live Client («Activa»): their Promotions Consent closes
     (`promotions_consent.withdrawn`); the Account stays as it is, and they can
     turn promotions on again from Perfil.
   - A former Client's Promotion Contact: the name, email, and phone are erased
     for good (`promotion_contact.withdrawn`). This cannot be undone.
3. Remove them from any spreadsheet exported earlier and from the studio's
   WhatsApp broadcast lists, so the next send skips them.
4. Reply that they will not receive more promotions, and log the request below
   with type «stop promotions».

A live Client can also do it themself with «Recibir promociones de Emma
Pilates» in Perfil, which needs no log row.

## Request log

| Received | Requester | Verified by | Type | Deadline | Answered |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
