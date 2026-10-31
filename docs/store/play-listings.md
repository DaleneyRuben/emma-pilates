# Google Play store listings (REL-003)

Text to paste into Play Console → each app → Grow users → Store presence →
Main store listing, language **Spanish (Latin America) – es-419** (the apps'
default language). Neutral Spanish with «tú», as in the apps
([design system](../design/design-system.md#language)). Lengths are checked
against Play's limits: name 30, short description 80, full description 4,000.

The Staff listing is required for its closed testing track, but the Staff app
is never published to production.

## Shared settings

| Field | Value |
| --- | --- |
| App category | Health & Fitness (Salud y bienestar) |
| Tags | Pilates, Fitness, Yoga y pilates (pick the closest Play offers) |
| Email | `soporte@emmapilatesstudio.com` |
| Website | `https://app.emmapilatesstudio.com` |
| Phone | leave empty |
| Privacy policy | `https://app.emmapilatesstudio.com/privacidad` (Policy → App content → Privacy policy) |
| App icon (512 × 512) | `apps/client-mobile/assets/store-icon-512.png`, `apps/staff-mobile/assets/store-icon-512.png` |
| Feature graphic (1024 × 500) | still to make (see below) |

## Emma Pilates (`com.emmapilates.client`)

**App name** (12/30)

```text
Emma Pilates
```

**Short description** (70/80)

```text
Reserva tus clases de Pilates, revisa tu plan y paga desde tu celular.
```

**Full description**

```text
Emma Pilates es la app de Emma Pilates Studio. Movimiento, equilibrio y bienestar, ahora en tu celular.

Reserva tus clases
• Mira el horario de la semana y cuántos lugares quedan en cada clase.
• Reserva tu lugar en segundos y cancélalo si cambias de planes.
• Si la clase está llena, únete a la lista de espera: cuando se libere un lugar, te reservamos automáticamente y te avisamos.
• Dentro de las 2 horas y 30 minutos antes de la clase, puedes reprogramarla a otro horario del mismo día.

Tu plan, siempre a la vista
• Revisa cuántas clases te quedan y hasta qué fecha está vigente tu plan.
• Compra o renueva tu plan pagando con transferencia por QR: sube la foto de tu comprobante y te avisamos cuando el estudio lo confirme.
• Consulta tu historial de clases y de pagos.

Invita a una amiga
• Comparte tu código: tu amiga se registra y toma su primera clase gratis. Si después compra un plan, tú ganas una clase más.

Notificaciones útiles
• El estado de tus pagos, tu lugar confirmado desde la lista de espera, cambios del estudio en tus clases y el aviso antes de que venza tu plan.

Para usar la app necesitas una cuenta de Emma Pilates Studio. Puedes crearla desde la app con tu correo o pedirla en recepción.

¿Dudas? Escríbenos a soporte@emmapilatesstudio.com.
```

## Emma Pilates Staff (`com.emmapilates.staff`)

**App name** (18/30)

```text
Emma Pilates Staff
```

**Short description** (67/80)

```text
La app del equipo de Emma Pilates Studio: agenda, clientes y pagos.
```

**Full description**

```text
Emma Pilates Staff es la app interna del equipo de Emma Pilates Studio. Solo pueden ingresar las personas que trabajan en el estudio, con la cuenta que les envía la administración.

Cada persona ve lo que corresponde a su rol:
• Instructoras e instructores: su agenda de clases y la asistencia de cada clase.
• Recepción: buscar clientes, crear sus cuentas, reservar clases por ellos y registrar pagos en efectivo.
• Coordinación: buscar clientes, reservar por ellos y cancelar clases. No registra pagos ni ve montos.
• Nutricionista: su disponibilidad y sus evaluaciones.
• Administración: confirmar pagos por transferencia y cancelar clases.

Si eres cliente del estudio, descarga la app Emma Pilates.

¿Dudas? Escríbenos a soporte@emmapilatesstudio.com.
```

## Graphics

All in [`graphics/`](./graphics/), made 2026-10-31 from the fixtures data
(fictional names, one branch, 8 places per class) and the 1.0.2 builds.

| Play field | Emma Pilates | Emma Pilates Staff |
| --- | --- | --- |
| Feature graphic (1024 × 500) | `graphics/client-feature-graphic.png` | `graphics/staff-feature-graphic.png` |
| Phone screenshots (1080 × 1920, 9:16) | `graphics/client-1-inicio.png` … `client-5-mi-plan.png` | `graphics/staff-1-agenda.png` … `staff-3-clienta.png` |

The screenshots crop the iOS status bar so they read the same on Android, and
carry a caption above the screen. The plan prices are fixture values, so no
screenshot shows a price; retake them when real prices or a new screen should
appear. No tablet screenshots yet: the Staff closed test does not need them.
