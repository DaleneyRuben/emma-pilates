# Follow-up — Show progressive Login throttling

Targets: **Client `01`; Staff `S01`; Admin web `AW01`**. Send [30](./30-invariants-checklist.md) and the still-pending [33](./33-email-only-authentication.md) alongside this follow-up. For Client `01`, also send [34](./34-client-email-verification.md).

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) protects every Login surface with progressive temporary backoff after repeated incorrect attempts. It does not hard-lock the Account and does not use CAPTCHA.

The first five failures have no enforced delay. The sixth failure waits 30 seconds, the seventh 1 minute, the eighth 5 minutes, and the ninth and later failures 15 minutes. A submission during an active wait returns the same remaining delay without checking the password or extending the wait.

Add a throttled Login state to `01`, `S01`, and `AW01`:

- Keep the early incorrect-credentials state generic; it must not reveal whether the submitted email identifies an Account.
- When the backend returns the stable RFC 9457 throttling problem and `Retry-After`, disable another submission until that delay ends.
- Show calm, neutral copy such as **"Demasiados intentos. Intenta de nuevo en un momento."** Display the dynamic remaining time from `Retry-After`; the client must not calculate the progression itself.
- Do not say that the Account is blocked or locked. Another legitimate device may still be able to sign in because the protection is scoped progressively rather than as a whole-Account lockout.
- Do not add CAPTCHA, security questions, phone verification, or a staff-assisted bypass.
- Preserve the submitted email, password visibility control, recovery link, biometric entry where already present, responsive layout, and existing visual styling.

The reset window is not settled yet. Do not invent one in the design.
