# Erase personal data when a Client Account closes

Status: accepted

Closing a Client Account (BE-007) erases the personal data on its rows inside the closure transaction, while every row stays soft-deleted ([ADR-0086](./0086-soft-delete-every-database-row.md)):

- The Client's name becomes «Cliente eliminado», the phone is cleared, and the profile photo is detached, so the sweep of [ADR-0076](./0076-delete-detached-profile-and-promotion-images.md) deletes its bytes.
- The Account's email becomes `cerrada-<account id>@cuentas-cerradas.invalid`, and its password hash is cleared. A pending email change's new address gets the same placeholder.
- Payments, Bookings, Subscriptions, Credit entries, Evaluations, Referrals, and audit records stay as they are, now under the anonymous Client, because they are the studio's accounting and attendance history. Transfer receipt images already follow [ADR-0075](./0075-delete-receipt-images-after-forty-five-days.md).
- Notifications already sent to Staff Members keep their text, which may name the Client (a Nutritionist's «canceló su evaluación»), as part of the staff's operational record.

The reason is Google Play's User Data policy: closing an Account must delete the data linked to it, and hiding it is not deletion; only data with a legitimate reason to stay (accounting, security, legal obligations) may remain, disclosed in the privacy policy. Soft-deleting the rows with the name, email, and phone still on them read as deactivation (the REL-004 audit, 2026-10-19). Overwriting the personal fields meets the rule without physically deleting a row.

The studio owner wants to keep sending promotions to former Clients who agree. When a Client closes their own Account, the app offers an unticked box, «Quiero seguir recibiendo promociones de Emma Pilates»; ticking it copies the name, email, and phone, as they were before the erasure, into a new **Promotion Contact** row (`booking.promotion_contacts`) with the time of consent. The Promotion Contact has no link to the closed Client or Account, so the kept history stays anonymous. It records a withdrawal time for when the person asks to stop, and it is soft-deleted like every other row. An Administrator closing a Client's Account from the admin web has no such box: nobody consented, so nothing is kept.

Alternatives rejected:

- **Keep closure as built** and rely on the deletion page's disclosure. Google accepts accounting records but not the email and phone kept for nothing, so it risked a rejection or a later policy notice.
- **Keep the personal fields on the closed rows when the Client consents to promotions.** It mixes the consent with the accounting history, makes a later «stop» erase scattered fields, and keeps the payments identifiable.
- **Physically delete the Client's rows.** ADR-0086 forbids it, and the studio's accounting needs the Payments.

Sending the promotions, unsubscribing, and asking live Clients for the same consent are later work; this decision only keeps the contacts of people who agreed.
