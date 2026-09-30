# Follow-up — Registration and login-error copy, decided against the built apps

Targets: **Client `01`; Staff `S01`; Admin web `AW01`**. Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Comparing the DES-001 export with the shipped apps (2026-09-30) left three differences in copy and fields. Each was decided as follows; the apps change where the design wins (MOB-021).

## 1. `01` Registrarse gains «Confirmar contraseña»

On both registration frames («Registrarse» and «Registrarse con código»), add **«Confirmar contraseña»** under «Contraseña», with the placeholder «Repite la contraseña». Validate a mismatch in line with «Las contraseñas no coinciden.», the same pattern as `21` and `23`. The button stays **«Crear cuenta»** and the footer link stays **«Regístrate»**. The optional referral-code field stays collapsed, with no helper text (checklist 30 §7).

## 2. One incorrect-credentials message on every login

On `S01` and `AW01`, change the form-level error to **«El correo o la contraseña no son correctos.»**, the copy the apps ship. It is still generic: it never says which field failed or whether the email has an Account. Add the same error frame to `01`, which has none yet: an iOS frame modelled on `S01`'s «Credenciales incorrectas».

## 3. Nothing else

Do not change the throttled states, «¿Olvidaste tu contraseña?», biometrics, the «Revisa tu correo» frames, or any screen not named in Targets.
