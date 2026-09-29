# Runbook: answer a personal data request

Use this when someone asks what the studio holds about them, asks to correct
it, or asks for it to be deleted. It implements decision G8 of
[BE-007](../implementation/BE-007-data-governance-proposal.md): the request is
answered by an operator, not by a self-service export. Bolivian Constitution
art. 130 (habeas data) is the basis; the reply goes out **within 15 business
days** of a verified request. No export endpoint or screen exists.

Retention is indefinite (G1) and a closed Account keeps its data, hidden from
every screen (G7), so a former Client can still ask, and the same queries
answer them.

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

Run the query file once per request. It answers for every Account that ever
used the email, including closed ones (`closed_at` is filled for those):

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

The database never physically deletes a row (ADR-0086), so a deletion request
is answered honestly:

- A Client can close their own Account from Perfil → Cerrar mi cuenta, or ask
  an Administrator to close it (BE-007 G2). Closing cancels what is ahead, ends
  the Subscription, forfeits the Credit, revokes every session, and frees the
  email.
- The name, email, phone, and history stay in the database, hidden from every
  screen and endpoint, with no anonymization (G7).
- Say that in the reply; do not promise erasure. If the person insists on
  erasure, escalate to the owner: it changes G7 and needs a decision and legal
  advice, not an operator's SQL.

## Request log

| Received | Requester | Verified by | Type | Deadline | Answered |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
