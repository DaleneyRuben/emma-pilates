# Use password authentication for Administrators

Status: accepted

Administrator Accounts use the same email-and-password authentication boundary
as other Staff Members. A successful password Login creates an admin-web or
mobile Authentication Session with the shorter Administrator idle and absolute
lifetimes defined in
[ADR-0030](./0030-use-opaque-server-side-authentication-sessions.md). No
additional sign-in step is required in the initial release.

Administrator access remains protected by neutral Login failures, progressive
and origin-wide throttling, independently revocable server-side Authentication
Sessions, email-based password recovery, immediate revocation when an Account
is disabled, exact trusted-origin checks for admin web, contextual authorization,
and focused audit records for sensitive actions.

This keeps the first release aligned with its designed Login, activation, and
recovery journeys and avoids adding another enrollment and support flow before
the studio has operational evidence that it is needed. A stronger additional
sign-in safeguard may be reconsidered later as a separately designed security
change.
