# Require TOTP MFA for Administrators

Status: accepted

Every Administrator Account must use a standard time-based one-time password (TOTP) authenticator app as a second factor in the initial release. After proving the Account password, an Administrator must also enter the current six-digit code from the enrolled authenticator app before the backend creates a full Administrator Authentication Session. Clients and Staff Members are not required to enroll in MFA initially.

An Administrator who has not enrolled is routed into MFA setup immediately after their first successful password login. This setup state is a restricted challenge rather than an Authentication Session, expires 15 minutes after it is issued, and authorizes only the enrollment flow. If it expires, the Administrator must authenticate with their password again and begin a new setup. The Administrator scans the TOTP setup code, confirms one valid generated code, and is then shown the recovery codes. Only successful enrollment allows the backend to create a full Administrator Authentication Session. Existing Administrators must complete the same gate on their next successful password login after MFA is introduced; there is no password-only grace period.

Enrollment issues ten one-time recovery codes for loss of the authenticator. Each code can satisfy one MFA challenge once and is then consumed. The codes are shown only during enrollment or regeneration, are never sent by email, and are stored only as one-way hashes. The applications warn the Administrator when three codes remain. Regenerating recovery codes immediately invalidates every unused code from the previous set and displays ten new codes once. Recovery codes do not expire on a calendar schedule.

The TOTP secret is encrypted at rest with key material kept outside PostgreSQL; neither the secret nor a submitted TOTP or recovery code may be logged. The factor-replacement policy remains a separate lifecycle decision.

TOTP works with free authenticator apps, follows an interoperable standard, and avoids an SMS, email-code, or identity-provider dependency. Its main trade-off is weaker phishing resistance than passkeys and a recovery burden when an Administrator loses the enrolled device. Passkeys or WebAuthn may be added later, but requiring them initially would add cross-platform enrollment and recovery complexity across the admin web and Expo mobile app.
