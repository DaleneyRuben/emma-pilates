# System Identity

Authentication and account security shared by the mobile and admin applications. It establishes who is signed in while leaving Client, Staff Member, Role, Branch access, and business permissions in their owning domain context.

## Language

**Account**:
The system identity that owns one unique login email, credentials, Authentication Sessions, recovery mechanisms, and notification endpoints. It is linked to exactly one domain identity: either a Client or a Staff Member.
_Avoid_: User, login, profile

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
A single-use email link through which a staff-created Client or Staff Member proves control of their email address and creates their first password. Completing it activates the pending Account but does not sign the person in.
_Avoid_: Verification Link, invitation code

**Password-Recovery Link**:
A single-use email link through which an Account holder replaces a forgotten password. It is not an Authentication Session and cannot grant normal application access by itself.
_Avoid_: Reset code, magic link

**MFA Challenge**:
A temporary restricted step in which an Administrator proves or enrolls a second authentication factor before a full Authentication Session is created. It grants no ordinary Administrator access.
_Avoid_: Authentication Session, temporary login

**Recovery Code**:
One of an Administrator's single-use codes for completing an MFA Challenge when the authenticator app is unavailable. It is not a password-recovery mechanism and is shown only when a set is issued.
_Avoid_: Backup password, password-reset code
