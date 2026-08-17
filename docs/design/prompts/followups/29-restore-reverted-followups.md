# Follow-up — Restore the corrections the last export reverted

Targets: **Sistema de Diseño (Prompt 00)**, **08**, **18**, **19**, **S09**, **S11**, **S12**, **S14**, and **AW02–AW29**. Send as a follow-up in each surface's conversation, applying only the section for that surface.

---

The last export brought the new work through correctly (`02`, `Sistema de Diseño`, `AW29`, `S12`, `S02`, `S04`, `S11`, `AW21`, `AW22`), but it **undid corrections that were already applied and verified** in earlier exports. These are not design decisions being revisited: they are changes that were already requested and that reverted to their original form.

Restore each one exactly as it was. None of this conflicts with what was just added.

## Sistema de Diseño (Prompt 00)

The cancellation window went back to "6 horas". The correct window is **2 h 30**, and the consequence changed too. Leave the sentence exactly like this:

> Puedes cancelar sin costo hasta 2 h 30 antes del inicio de la clase. Después de ese plazo solo puedes reprogramar a otra clase del mismo día.

It does not say "se descuenta la sesión de tu paquete": outside the window nothing is deducted, the class is rescheduled. And the product says "clase", not "sesión", when talking about what a client consumes.

## Client app — `08`, `18`, `19`

**`08` Elegir plan.** The old catalogue came back: "Clase suelta", "Paquete de 4 clases", "Mensual ilimitado". **Unlimited plans do not exist** — every plan sells a fixed number of classes. The correct catalogue, the same one the other screens already use, is:

- Paquete de 8 clases
- Paquete de 12 clases
- Mensual 16 clases
- Trimestral 36 clases

**`18` Perfil.** The **"Cambiar contraseña"** row disappeared; it belongs between "Notificaciones" and "Cerrar sesión". Without it, screen `23` (Cambiar contraseña) has no entry point anywhere in the app. Restore it with the same row styling as the ones above it.

**`19` Notificaciones.** The **rejected receipt** notification type disappeared. Restore the card:

> Tu comprobante fue rechazado: el monto no coincide con el plan. Sube uno nuevo para activar tu plan.

along with its line in the colour legend, which groups the two negative outcomes in red: "**Rojo:** clase cancelada y comprobante rechazado; comparten color porque los dos comunican un resultado negativo."

## Staff app — `S09`, `S11`, `S12`, `S14`

**`S09`, `S11`, `S12`.** "Mensual ilimitado" came back as a sample plan. Replace it with one from the real catalogue (above). On `S11` it also appears inside the payment-inbox sample data next to the amount: use a plan and an amount that match each other.

**`S14` Cancelar sesión.** Two things reverted:

1. The "Reembolso garantizado" note says "fuera del plazo de 6 h". It is **2 h 30**: "Se devuelve la clase a todas las reservas, incluso fuera del plazo de 2 h 30: la falta es del estudio."
2. The warning notice lost its last sentence, the one covering the waitlist. The full paragraph is:

> Se cancelarán las 10 reservas de esta clase, se reembolsará una clase a cada cliente afectado — incluso si ya no podían cancelar por su cuenta — y se les notificará. **También se notificará a las 2 en lista de espera.**

Cancelling a session also releases whoever was waiting for a spot, and the administrator needs to know that before confirming.

**`S11`, additionally — finish the account avatar.** The "Tu cuenta" avatar landed only in the first frame. It is missing from the **Android · Bandeja de pagos** frame and the **iOS · Sin pagos pendientes** frame, with the "Cancelar una clase" button to its left, 10px apart, exactly as in the frame that does have it. The empty state is precisely where a missing way out of the screen shows most.

## Admin web — `AW02` to `AW29`

The sidebar reverted to an earlier version: the **"Descuentos"** section reappeared and **Insumos**, **Nómina**, **Gastos** and **Categorías de gasto** disappeared from Back Office. "Descuentos" does not exist in the product. The correct sidebar, identical across all 28 screens, is:

- **Horario** (no section)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Personal · Nómina · Gastos · Categorías de gasto
- **Promociones**: Promociones · Referidos · Créditos

No "Descuentos" at any level. `AW21` already came out right in this export — use it as the reference.

---

None of the new work is touched: the account avatar on `02`, `S02`, `S04` and `S15`, the `Sistema de Diseño` "Avatar de cuenta" section, the enlarged receipt on `AW29` and `S12`, the feminine counters on `AW21`/`AW22`, the `AW34` branch selector, and the states on `05`, `15` and `S15` all stay exactly as they are.
