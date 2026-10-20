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
• Mira el horario de la semana en cualquiera de nuestras sedes.
• Reserva tu lugar en segundos y cancélalo si cambias de planes.
• Si la clase está llena, únete a la lista de espera: cuando se libere un lugar, te reservamos automáticamente y te avisamos.
• Dentro de las 2 horas y 30 minutos antes de la clase, puedes reprogramarla a otro horario del mismo día.

Tu plan, siempre a la vista
• Revisa cuántas clases te quedan y hasta qué fecha está vigente tu plan.
• Compra o renueva tu plan pagando con transferencia por QR: sube la foto de tu comprobante y te avisamos cuando el estudio lo confirme.
• Consulta tu historial de clases y de pagos.

Evaluación nutricional
• Con tu plan activo, agenda una evaluación al mes con nuestra nutricionista, sin costo adicional.

Invita a tus amigas y amigos
• Comparte tu código: cuando tu invitado confirme su primer pago, recibes crédito para tu próximo plan.

Notificaciones útiles
• El estado de tus pagos, tu lugar confirmado desde la lista de espera, cambios del estudio en tus clases, recordatorios de tu evaluación y el aviso antes de que venza tu plan.

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
• Nutricionista: su disponibilidad y sus evaluaciones.
• Administración: confirmar pagos por transferencia y cancelar clases.

Si eres cliente del estudio, descarga la app Emma Pilates.

¿Dudas? Escríbenos a soporte@emmapilatesstudio.com.
```

## Graphics still to make

- **Feature graphic**, 1024 × 500 PNG or JPEG, one per app: the app's icon
  artwork on the blush background `#F3E9E7` with «Emma Pilates Studio» and
  «Movimiento · Equilibrio · Bienestar». No price or ranking text (Play's
  rules).
- **Phone screenshots**, 2 to 8 per app, 16:9 or 9:16, each side 320–3,840
  px. Client: Home, the week's classes, a class detail, Mi plan, the QR
  payment, Evaluations. Staff: the Trainer agenda, the Assistant's Client
  search, the Administrator's pending payments.
- **Tablet screenshots** (7" and 10"): Staff only, since the Assistant works
  on a tablet; the Client app can skip them.

Take screenshots on production-like data (the fixtures plan on staging),
never with a real Client's name or photo.
