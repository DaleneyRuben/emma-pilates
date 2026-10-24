# System Identity

Authentication and account security shared by the mobile and admin applications. It establishes who is signed in while leaving Client, Staff Member, Role, Branch access, and business permissions in their owning domain context.

## Language

**Account**:
The system identity that owns one unique login email, credentials, Authentication Sessions, recovery mechanisms, and notification endpoints. It is linked to exactly one domain identity: either a Client or a Staff Member.
_Avoid_: User, login, profile

**Account closure**:
A Client's Account ending for good, by the Client's own request (password re-entered) or an Administrator's. Future Bookings and Evaluations are cancelled without penalty, the Subscription ends without refund, any historical Credit is forfeited, every Authentication Session is revoked, unused links are invalidated, devices are deactivated, and the Account and Client are marked removed. The login email becomes free to register again. In the same transaction the personal data is erased while every row stays soft-deleted ([ADR-0097](../docs/adr/0097-erase-personal-data-when-a-client-account-closes.md), replacing BE-007 G7): the Client's name becomes «Cliente eliminado», the phone is cleared, the profile photo is detached for the image sweep, the email becomes `cerrada-<account id>@cuentas-cerradas.invalid`, and the password hash is cleared. Payments, Bookings, Subscriptions, Credit, Evaluations, Referrals, and audit records stay under the anonymous Client for the studio's accounting ([BE-007](../docs/implementation/BE-007-data-governance-proposal.md), G2–G6). Any open Promotions Consent ends ([ADR-0098](../docs/adr/0098-ask-live-clients-for-promotions-consent.md)); only a Client closing their own Account who ticks the promotions box keeps a Promotion Contact, unlinked from the closed Account. A transfer Payment still awaiting review blocks closure. Staff Members are never closed; deactivation is their end state.
_Avoid_: Account deletion, delete account (nothing is physically deleted)

**Pending Account**:
An Account whose email-verification or staff-invitation flow has not been completed and which has no normal application access. It retains its provisional Client or Staff Member link until activation, cancellation, or expiration.
_Avoid_: Unverified user, incomplete signup

**Authentication Session**:
One independently expiring and revocable sign-in for an Account on a particular app installation or browser. It is distinct from a scheduled Booking & Membership Session.
_Avoid_: Login, token, Session (without the Authentication qualifier)

**Verification Link**:
A single-use email link through which a self-registering Client proves control of their email address. It verifies the pending Account but does not sign the Client in.
_Avoid_: Activation Link, confirmation link

**Activation Link**:
A single-use email link through which a staff-created Client or Staff Member proves control of their email address and creates their first password. Completing it activates the pending Account but does not sign the person in. While the invitation is pending, the Assistant who manages it may correct the email or resend the link (each resend renews the 30-day pending window) and may cancel it — which removes the Account and Client — only while the Client holds no Subscription, Payment, or Booking; an invited Client who already paid or booked stays pending until activated and is never removed by the expiry cleanup.
_Avoid_: Verification Link, invitation code

**Password-Recovery Link**:
A single-use email link through which an Account holder replaces a forgotten password. It is not an Authentication Session and cannot grant normal application access by itself.
_Avoid_: Reset code, magic link

**Impersonation**:
An Administrator's time-boxed (30 minutes) view of the Staff app as one active Trainer, Assistant, Nutritionist, or the Coordinator ([ADR-0102](../docs/adr/0102-coordinator-role-without-money.md)), tied to the Administrator's own mobile Authentication Session and ended by «Salir», by expiry, or by logout ([ADR-0100](../docs/adr/0100-impersonate-a-staff-member-from-the-staff-app.md)). While it lasts, requests resolve to the Staff Member's Account, Role, and Branches, the Administrator's own rights do not apply, account-level self-service is refused, and every audit record names the Administrator as actor and references the Impersonation. Never another Administrator, never a Client.
_Avoid_: Login as, switch user, sudo, view-as session (without the Impersonation qualifier)

**Feedback**:
A comment an Account holder sends from «Enviar comentarios» in either app: a type (problem, suggestion, other), the text, and the app version, platform, and Role attached automatically. An Administrator triages it (new, reviewed, resolved) with an internal note of what changed because of it.
_Avoid_: Ticket, review (a store review is public)
