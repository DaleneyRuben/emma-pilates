# Follow-up — The admin web's sign-in proposals: corrections

Targets: the proposal boards of [237](./237-admin-sign-in-proposals.md) in
`design/v2/propuestas-acceso/` (Main, A1, A2, B1, B2, C1, C2). Read with 237;
send [30](./30-invariants-checklist.md) alongside. No other screen changes.

---

Written on 2026-11-05 for DES-007, after an independent review of 237's
export. 237 was already applied on its canvas, so it stays as sent. From
here on, read these corrections instead of 237 where the two differ.

## Corrections to the boards

1. **Rosa profundo only in B's block.** The 72 px discs of «Revisa tu
   correo» and «Este enlace ya no es válido» draw their icon in Palo de rosa
   `#B78380`, not Rosa profundo. On the index board, the A/B/C letter badges
   are Rosa tinte `#F2E4E1` with Rosa enlace `#7D4F4B` letters. B's own
   thumbnail keeps its Rosa profundo block because it shows proposal B.
2. **The create-password flow can be clicked through.** A new state, «Lista
   para guardar», has both fields typed and matching and «Guardar
   contraseña» enabled. Tapping it returns to the sign-in with «Tu cuenta
   está activa». In the empty states the button stays Deshabilitado, as 237
   says.
3. **The index board's comparison** has a «Riesgo» row (A low; B: the dark
   rose takes almost half the screen and may feel heavy every day; C: looks
   much like today's screen).

## Corrections to 237's text

- In C, the notices, warnings and fields stay **Lino** inside the Marfil
  card (237 said the notice sits on Marfil). The boards already draw Lino.
- «Para Administración y Coordinación.» under «Inicia sesión» is copy
  carried over from P10 (233), not new copy. It is approved together with
  the proposal the owner picks.
- States the boards don't draw: these follow the same shapes when the screen
  is built.
  - The login's «No podemos iniciar sesión desde esta dirección. Abre el
    panel desde su enlace habitual.» and «No pudimos iniciar sesión.
    Inténtalo de nuevo en unos minutos.» use the warning row.
  - «Mínimo 8 caracteres.» uses the field error, like «Las contraseñas no
    coinciden.».
  - An expired recovery link uses the «Este enlace ya no es válido» message:
    «Los enlaces para restablecer la contraseña vencen a los 30 minutos y
    sirven una sola vez.», with «Pedir un enlace nuevo» as the primary
    button.
