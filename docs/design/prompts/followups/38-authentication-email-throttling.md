# Follow-up — Throttle authentication emails without revealing Accounts

Targets: **Client `01`, `20`; Staff `S05`, `S18`; Admin web `AW24`, `AW30`**. Send [30](./30-invariants-checklist.md) and the still-pending [33](./33-email-only-authentication.md), [34](./34-client-email-verification.md), [35](./35-email-activation-instead-of-temporary-passwords.md), and [36](./36-email-password-recovery-destinations.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) applies layered limits before sending verification, activation, or password-recovery email. The backend limits each recipient and purpose, each first-party installation or browser across different recipients, and each trusted network address. A suppressed request sends no email and leaves the currently valid link unchanged.

Apply these states consistently:

## Public Client and recovery requests

- On `01`, `20`, `S18`, and `AW30`, keep the response neutral when a recipient-specific limit suppresses an email. Show the same **Revisa tu correo** or equivalent sent state used for an eligible or unknown address; do not reveal whether an Account exists, whether an email was sent, or when that recipient becomes eligible again.
- When a broader client-wide or network-wide limit returns RFC 9457 throttling Problem Details and `Retry-After`, show a neutral temporary-throttling state and disable another request until the server-provided delay ends.
- Do not imply that requesting again invalidated the previous link. A limited request creates no token, and any previously valid link remains usable.

## Authenticated staff resends

- On the pending invitation states of `S05` and `AW24`, show an explicit temporary limit when an authorized resend is suppressed. Keep the existing pending Account visible, preserve the current link, and show the server-provided retry time.
- Do not add an override, CAPTCHA, phone fallback, WhatsApp fallback, or a way to copy an activation secret.

The exact cooldowns and hourly or daily budgets are not settled yet. Do not invent numeric limits in the design.

Preserve the existing form values, destinations, link lifetimes, neutral public wording, responsive layout, and visual styling.
