# Follow-up — Show progressive Login throttling

Targets: **Client `01`; Staff `S01`; Admin web `AW01`**. Send [30](./30-invariants-checklist.md) and the still-pending [33](./33-email-only-authentication.md) alongside this follow-up. For Client `01`, also send [34](./34-client-email-verification.md).

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) protects every Login surface with progressive temporary backoff after repeated incorrect attempts. It does not hard-lock the Account and does not use CAPTCHA.

Add a throttled Login state to `01`, `S01`, and `AW01`:

- Keep the early incorrect-credentials state generic; it must not reveal whether the submitted email identifies an Account.
- When the backend returns the stable RFC 9457 throttling problem and `Retry-After`, disable another submission until that delay ends.
- Show calm, neutral copy such as **"Demasiados intentos. Intenta de nuevo en un momento."** A dynamic remaining-time value may reflect `Retry-After`, but do not hard-code a delay or attempt threshold.
- Do not say that the Account is blocked or locked. Another legitimate device may still be able to sign in because the protection is scoped progressively rather than as a whole-Account lockout.
- Do not add CAPTCHA, security questions, phone verification, or a staff-assisted bypass.
- Preserve the submitted email, password visibility control, recovery link, biometric entry where already present, responsive layout, and existing visual styling.

The exact attempt thresholds, delay progression, and reset window are not settled yet. Do not invent them in the design.
