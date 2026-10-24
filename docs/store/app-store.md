# App Store drafts (REL-014, REL-015, REL-016, REL-017)

Drafts for the owner. Nothing here is submitted to Apple, and no Apple
account step is taken from this repository.

## REL-014 · Enrollment, done by the owner

1. Enroll in the Apple Developer Program as an **individual**, with the Apple
   Account that has two-factor authentication on and the legal name exactly as
   it appears on the ID. The fee is $99 a year, paid by the owner.
2. As an individual, the seller name on the App Store is the owner's legal
   name, not the studio's. The same happens on Play.
3. After enrollment, register the bundle IDs `com.emmapilates.client` and
   `com.emmapilates.staff`, create the APNs key and load it into EAS, set the
   associated domains for `links.emmapilatesstudio.com`, and create both App
   Store Connect records.

Done when an iOS development build receives a real push through APNs and
`links.emmapilatesstudio.com` serves an `apple-app-site-association` file with
the team ID.

## REL-015 · Client listing, Spanish (Mexico)

App Store Connect uses Spanish (Mexico) for Latin-American Spanish. Lengths
are Apple's: name 30, subtitle 30, promotional text 170, description 4,000,
keywords 100.

**Name**

```text
Emma Pilates
```

**Subtitle** (28/30)

```text
Reserva tus clases de Pilates
```

**Promotional text** (96/170)

```text
Mira el horario, reserva tu lugar y revisa tu plan desde el celular.
```

**Description**

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
• Agenda una evaluación con nuestra nutricionista. Una evaluación al mes está incluida con algunos planes; el estudio te dice el costo de las demás.

Invita a tus amigas
• Comparte tu código de referido. Pronto podrás invitar a una amiga a una clase.

Notificaciones útiles
• El estado de tus pagos, tu lugar confirmado desde la lista de espera, cambios del estudio en tus clases, recordatorios de tu evaluación y el aviso antes de que venza tu plan.

Para usar la app necesitas una cuenta de Emma Pilates Studio. Puedes crearla desde la app con tu correo o pedirla en recepción.

¿Dudas? Escríbenos a soporte@emmapilatesstudio.com.
```

**Keywords** (99/100, comma separated, no spaces)

```text
pilates,clases,reservas,horario,estudio,bienestar,reformer,entrenamiento,salud
```

**URLs**

| Field | Value |
| --- | --- |
| Support | `https://app.emmapilatesstudio.com/soporte` |
| Privacy | `https://app.emmapilatesstudio.com/privacidad` |
| Marketing | `https://app.emmapilatesstudio.com` |

**Screenshots still to make:** 6.9" iPhone and 13" iPad, from production-like
data, never with a real Client's name or photo. Home, the week's classes, a
class detail, Mi plan, the QR payment.

### Review notes, to paste

```text
Demo account: revision-tiendas@emmapilatesstudio.com (password sent separately, never in the repository). It holds a complimentary 8-class plan so the reviewer can book a class. Please cancel the booking after testing: it is a real class on the studio's schedule.

Plans are in-person classes paid outside the app, by bank transfer or in cash at the studio. The app shows a QR and stores the receipt photo. No digital content is sold, so Guideline 3.1.3(e) applies and there is no in-app purchase.

Account deletion is in the app: Perfil → Cerrar mi cuenta (Guideline 5.1.1(v)). It erases the name, email, phone, and photo.

The app offers no third-party login, so Sign in with Apple is not required (Guideline 4.8).

ITSAppUsesNonExemptEncryption is false: the app uses only standard HTTPS.
```

### App Privacy labels

Match `docs/store/play-data-safety.md`: name, email, and phone (account
data); photos (profile and transfer receipts); the feedback text; the NIT or
CI and business name, optional; crash reports without personal data; a push
installation identifier. Not linked to tracking. No advertising, no location,
no health measurements.

## REL-016 · Reviewer Accounts, created after the reset

Two Accounts on the studio's domain, never a real person's:

| Account | What it is |
| --- | --- |
| `revision-tiendas@emmapilatesstudio.com` | A Client with an active `store_review` Plan of 8 classes, renewed before each review |
| `revision-staff@emmapilatesstudio.com` | A Trainer with no Sessions |

Both are marked `store_review` and created after the production reset
(REL-019), so their rows never count toward income, founders, the gift class,
commissions, or pay statements. REL-005's Play reviewer login moves to these
same Accounts. An operational step cancels any booking a reviewer leaves
behind.

## REL-017 · Staff app on iPhone

Recommended: ad hoc distribution through EAS internal distribution.

- No App Review, install from a link, and EAS Updates work.
- Each iPhone's UDID is registered with `eas device:create`, and the app is
  rebuilt before a new phone can install. Apple allows 100 iPhones a year and
  the profile is renewed yearly.
- The device list is written in the release runbook when the first phone is
  registered, not before, because it holds identifiers.

Unlisted on the App Store, TestFlight, and a Custom App were compared and set
aside: the team is small, the account is individual, and a Custom App needs an
organization with a D-U-N-S number. Move to Unlisted only if the team grows or
registering devices becomes a burden.

Android Staff stays on Play Internal testing, up to 100 testers, no review.
