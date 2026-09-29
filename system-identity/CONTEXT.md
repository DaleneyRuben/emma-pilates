# System Identity

Authentication and account security shared by the mobile and admin applications. It establishes who is signed in while leaving Client, Staff Member, Role, Branch access, and business permissions in their owning domain context.

## Language

**Account**:
The system identity that owns one unique login email, credentials, Authentication Sessions, recovery mechanisms, and notification endpoints. It is linked to exactly one domain identity: either a Client or a Staff Member.
_Avoid_: User, login, profile

**Account closure**:
A Client's Account ending for good, by the Client's own request (password re-entered) or an Administrator's. Future Bookings and Evaluations are cancelled without penalty, the Subscription ends without refund, the Credit is forfeited, every Authentication Session is revoked, unused links are invalidated, devices are deactivated, and the Account and Client are marked removed. The login email becomes free to register again. The name, email, phone, and history stay in the database, hidden from every screen and endpoint, and are never anonymized ([BE-007](../docs/implementation/BE-007-data-governance-proposal.md), G2–G7). A transfer Payment still awaiting review blocks closure. Staff Members are never closed; deactivation is their end state.
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
