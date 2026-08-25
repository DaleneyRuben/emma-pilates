# Require TOTP MFA for Administrators

Status: accepted

Every Administrator Account must use a standard time-based one-time password (TOTP) authenticator app as a second factor in the initial release. After proving the Account password, an Administrator must also enter the current six-digit code from the enrolled authenticator app before the backend creates a full Administrator Authentication Session. Clients and Staff Members are not required to enroll in MFA initially.

Enrollment issues a set of one-time recovery codes for loss of the authenticator. The codes are shown only during enrollment, are never sent by email, and are stored only as one-way hashes. The TOTP secret is encrypted at rest with key material kept outside PostgreSQL; neither the secret nor a submitted code may be logged. The enrollment ceremony, challenge lifetime, recovery-code quantity, code-consumption behavior, and factor-replacement policy remain separate lifecycle decisions.

TOTP works with free authenticator apps, follows an interoperable standard, and avoids an SMS, email-code, or identity-provider dependency. Its main trade-off is weaker phishing resistance than passkeys and a recovery burden when an Administrator loses the enrolled device. Passkeys or WebAuthn may be added later, but requiring them initially would add cross-platform enrollment and recovery complexity across the admin web and Expo mobile app.
