# Sign in with a rotating biometric device key

Status: accepted (2026-11-23); replaces the biometric half of MOB-006 (PR #372) and narrows the biometric sentence of [ADR-0029](./0029-manage-authentication-in-the-nestjs-backend.md)

PR #372 kept the session credential itself behind Face ID or the fingerprint, so «Cerrar sesión», which revokes that session, also wiped biometrics: every sign-out ended in the password form. After comparing banking apps (HSBC, Lloyds, Wise) and OWASP/Okta guidance, the owner approved (2026-11-23) a bank-style model: signing out keeps fingerprint sign-in, each installation holds its own key that changes on every use, the app opens with the system prompt by itself, «Usar otra cuenta» is the way to another Account, and the offer is one short question.

## Options

1. Keep the session behind the prompt and stop revoking it on sign-out. A «signed out» phone would still hold a live session; rejected.
2. One server-issued key behind the prompt, replaced on every use. On Android, expo-secure-store asks for the fingerprint on every write with `requireAuthentication`, so replacing the key would show two prompts each launch; a native change (expo-local-authentication) would break the OTA-only constraint.
3. **Recommended:** two secrets per installation. The **unlock secret**, written once behind the prompt when biometrics are turned on, proves the person passed Face ID or the fingerprint; the **device key**, kept in SecureStore without the prompt, is replaced on every exchange. The server needs both.

## Decision

Option 3.

- **Issue** — `POST /api/v1/biometric-keys` (Bearer, `x-client-identifier`) answers `{deviceKey, unlockSecret}` once. Only SHA-256 digests are stored in `system.biometric_keys`, bound to the Account and to an HMAC digest of the installation identifier (ADR-0029 signals). One live key per installation (partial unique index): issuing revokes the previous one (`replaced`). Refused while impersonating. Audited `account.biometric_key_issued`.
- **Exchange** — `POST /api/v1/biometric-keys/exchange` (`x-client-identifier`, `{deviceKey, unlockSecret}`) opens a new mobile Authentication Session and answers `{credential, deviceKey}`. In one transaction the key sent is revoked (`rotated`) and its successor, with the same unlock secret, is stored; of two racing requests the second opens nothing. A key that is unknown, from another installation, expired (90 days unused), turned off, or whose Account can no longer sign in answers 401 `biometric_key_invalid`. A `rotated` key that comes back means a copy exists, so every live key of that Account and installation is revoked (`reuse_detected`, audited). Failures count against Login's own throttle lanes (ADR-0029), answering 429 `login_throttled` with `Retry-After`.
- **Revoke** — `POST /api/v1/biometric-keys/revocation` (`x-client-identifier`, `{deviceKey}`) always answers 204: Perfil's switch off and «Usar otra cuenta» (`turned_off`, audited). No session is needed, since «Usar otra cuenta» has none.
- **Account-wide revocation** — a password change (this phone included, which also forgets its key right away), a password recovery, a Staff Member's deactivation, and an Account's closure revoke every key of the Account in the same transaction.
- **App** — «Cerrar sesión» revokes the session only; the key stays, and the next screen is «Hola de nuevo». While a key waits, a launch never opens the saved session: it shows the logo and opens the system prompt once; success exchanges the key, ends the session saved before (so sessions do not pile up), and keeps the next key. A cancelled prompt shows «Hola de nuevo» (**Entrar con tu huella** / **Entrar con Face ID**, **Usar otra cuenta**); a failed exchange after a good scan says «No pudimos entrar. Revisa tu conexión e intenta de nuevo.»; a 401 forgets the key and shows the password form.
- **Phones from PR #372** — their next unlock reads the old protected session (one prompt), restores it, saves it as the plain copy, and asks for a key (Android shows its write prompt once more, once). If no key can be kept, the person stays signed in and the offer shows again.

## Consequences

- The biometric unlock now authenticates to the backend through the exchange, so ADR-0029's «biometrics never authenticate directly to the backend» holds only in the sense that the backend sees two random secrets, never biometric data.
- Any face or fingerprint enrolled on the phone can sign in; Perfil says so in `secundario`. iOS's `biometryCurrentSet` makes a new enrollment unreadable, which falls back to the password form.
- A lost exchange response (the server rotated, the phone never saved the successor) is accepted once: within 2 minutes, with the right unlock secret, while the successor is still unused, the replaced key exchanges the successor instead. Later, or after the successor was used, it is `reuse_detected` and the person signs in with the password once.
- JavaScript-only on mobile (OTA); the backend ships the migration and endpoints by Release Production first. Releases already installed ignore the new endpoints.
