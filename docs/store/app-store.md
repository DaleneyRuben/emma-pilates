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
Emma Pilates es la app de Emma Pilates Studio. Tus clases, tu plan y tus reservas, ahora en tu celular.

Reserva tus clases
• Mira el horario de la semana en cualquiera de nuestras sedes.
• Reserva tu lugar en segundos y cancélalo si cambias de planes.
• Si la clase está llena, únete a la lista de espera: cuando se libere un lugar, te reservamos automáticamente y te avisamos.
• Dentro de las 2 horas y 30 minutos antes de la clase, puedes reprogramarla a otro horario del mismo día.

Tu plan, siempre a la vista
• Revisa cuántas clases te quedan y hasta qué fecha está vigente tu plan.
• Compra o renueva tu plan de clases presenciales pagando al estudio con transferencia por QR: sube la foto de tu comprobante y te avisamos cuando el estudio lo confirme.
• Consulta tu historial de clases y de pagos.

Evaluación nutricional
• Agenda una evaluación con nuestra nutricionista. Una evaluación al mes está incluida con algunos planes; el estudio te dice el costo de las demás.

Invita a tus amigas
• Comparte tu código de referido e invita a una amiga a una clase gratis.

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

**Screenshots:** ready in `graphics/apple/iphone-6.9/<app>/` (1320 × 2868) and `graphics/apple/ipad-13/<app>/` (2064 × 2752), five per app, made with the Play set ([play-listings.md](./play-listings.md#graphics)).

### Review notes, to paste

```text
Demo account: revision-tiendas@emmapilatesstudio.com (password sent separately, never in the repository). It holds a complimentary 16-class plan («Plan de cortesía») so the reviewer can book a class. Please cancel the booking after testing: it is a real class on the studio's schedule.

Plans are in-person classes at the studio («clases presenciales»), paid outside the app, by bank transfer or in cash at the studio. The app shows a QR and stores the receipt photo. No digital content is sold, so Guideline 3.1.3(e) applies and there is no in-app purchase.

Account deletion is in the app: Perfil → Cerrar mi cuenta (Guideline 5.1.1(v)). It erases the name, email, phone, and photo.

The app offers no third-party login, so Sign in with Apple is not required (Guideline 4.8).

ITSAppUsesNonExemptEncryption is false: the app uses only standard HTTPS.
```

### App Privacy labels

Declare what `docs/store/play-data-safety.md` lists, in Apple's categories.
Tracking: **No** (no advertising, no analytics, no IDFA, so no App Tracking
Transparency prompt).

| Apple category | Data type | Linked to the user | Purposes |
| --- | --- | --- | --- |
| Contact Info | Name, Email Address, Phone Number | Yes | App Functionality; Developer's Advertising or Marketing (the studio's promotions by WhatsApp and email, see `/privacidad`) |
| Financial Info | Other Financial Info (NIT or CI and business name, optional, for an invoice) | Yes | App Functionality |
| Purchases | Purchase History (Plans and Payments) | Yes | App Functionality |
| User Content | Photos (profile, transfer receipts); Customer Support (the feedback text) | Yes | App Functionality |
| Identifiers | User ID; Device ID (the random installation identifier for push) | Yes | App Functionality |
| Diagnostics | Crash Data | No | App Functionality |

No location, contacts, health data, browsing history, or usage analytics.

### Before each submission

1. Production has been reset (REL-019) and holds the real schedule and
   instructors: no «(prueba)» staff names from the Android closed test. The
   reset also matters for the reviewer Account: a courtesy grant made before
   2026-11-22 keeps the name «Acceso de prueba» until it ends.
2. Run `store-review-accounts`; it refuses (`no_upcoming_sessions`) while the
   schedule has no class ahead. Check by hand that the next two weeks have
   classes with free places, and name those days in the review notes.

## REL-016 · Reviewer Accounts, created after the reset

Two Accounts on the studio's domain, never a real person's:

| Account | What it is |
| --- | --- |
| `revision-tiendas@emmapilatesstudio.com` | A Client with an active «Plan de cortesía» of 16 classes, renewed before each review |
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
