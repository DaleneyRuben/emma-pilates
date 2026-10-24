# Google Play data safety (REL-004)

Answers for Play Console → each app → Policy and programs → App content →
Data safety. They come from an audit of the code on 2026-10-19 (both apps and
`packages/mobile-core`), not from the proposals, and they match the privacy
policy (`apps/public-site/privacidad/index.html`) and ADR-0081's telemetry
rules. Re-check them whenever an app starts sending a new kind of data; PAY-007
(2026-10-23) added Invoice Data, see [Deletion and retention](#deletion-and-retention).

Play counts data as **collected** when the app sends it off the device. Data
the app only downloads and shows (a Staff Member viewing a receipt) is not
collected by that app. Service providers that process data for us (Northflank,
Aiven, Cloudflare R2, Resend, Expo and Firebase for push, Better Stack) are not
**sharing** in Play's sense.

## Data collection and security

| Question | Client | Staff |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | Yes | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes: the API URL must be `https` (`packages/mobile-core/src/config/runtime.ts`), and release builds allow no cleartext | Yes |
| Which account creation methods does your app support? | Username and password (email and password) | Username and password, accounts made by the studio only |
| Account deletion URL | `https://app.emmapilatesstudio.com/eliminar-cuenta` | same URL; the page covers Client Accounts and says Staff Accounts are deactivated by an Administrator |
| Do you provide a way for users to request that some or all of their data is deleted without deleting their account? | No | No |

The deletion answers follow [Deletion and retention](#deletion-and-retention).

## Data types: Client app

Every type below is **collected**, **not shared**, and **processed
ephemerally: no**.

| Play category → type | What it is in the app | Required or optional | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | Registration and profile; used for promotions only while the Client's Perfil switch is on, or kept for them if she ticks the box when closing | Required | App functionality, Account management, Advertising or marketing |
| Personal info → Email address | Login, verification, recovery; used for promotions only while the Client's Perfil switch is on, or kept for them if she ticks the box when closing | Required | App functionality, Account management, Advertising or marketing |
| Personal info → User IDs | Referral code entered at registration | Optional | App functionality |
| Personal info → Phone number | Profile; used for promotions only while the Client's Perfil switch is on, or kept for them if she ticks the box when closing | Optional | App functionality, Account management, Advertising or marketing |
| Personal info → Other info | Invoice Data on a purchase (PAY-007): the NIT or CI and the name or business name for the studio's invoice, prefilled from her last purchase; «Sin factura» sends none | Optional | App functionality |
| Financial info → Purchase history | Plans bought, Payment amount, method and state | Required | App functionality |
| Photos and videos → Photos | Profile photo and transfer receipt, picked from the gallery | Optional (a receipt only to pay by transfer) | App functionality |
| App activity → Other actions | Bookings, Waitlist entries, Evaluation appointments | Required | App functionality |
| App activity → Other user-generated content | The text of «Enviar comentarios» (REL-012), with its type (Problema, Sugerencia, Otro); no screenshots | Optional | App functionality (fixing and improving the apps) |
| App info and performance → Crash logs | Sanitized exception type and stack (Better Stack) | Required | App functionality (diagnosing errors) |
| App info and performance → Diagnostics | App release and build number on crash reports; the app version, build, platform, and OS version sent with «Enviar comentarios» | Required | App functionality |
| Device or other IDs → Device or other IDs | Random installation ID and Expo push token | Required | App functionality (push notifications), Fraud prevention, security, and compliance (sign-in throttling) |

## Data types: Staff app

Same answers (collected, not shared, not ephemeral), for the data Staff
Members send:

| Play category → type | What it is in the app | Required or optional | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | A Client's name when the Assistant creates the Account | Required for that feature | App functionality, Account management |
| Personal info → Email address | Login; a Client's email when the Assistant invites them | Required | App functionality, Account management |
| Personal info → Phone number | A Client's phone, entered by the Assistant | Optional | App functionality, Account management |
| Personal info → Other info | A Client's Invoice Data (NIT or CI and name or business name) the Assistant types with a cash sale (PAY-007) | Optional | App functionality |
| Financial info → Purchase history | Cash Payments recorded by the Assistant, transfer approvals and rejection reasons by the Administrator | Required for those Roles | App functionality |
| App activity → Other actions | Attendance, Bookings made for Clients, the Nutritionist's availability | Required | App functionality |
| App activity → Other user-generated content | as in the Client app («Enviar comentarios») | Optional | App functionality |
| App info and performance → Crash logs | as in the Client app | Required | App functionality |
| App info and performance → Diagnostics | as in the Client app | Required | App functionality |
| Device or other IDs → Device or other IDs | Installation ID and push token | Required | App functionality, Fraud prevention, security, and compliance |

The Staff app uploads no photos.

«Enviar comentarios» (REL-012) adds the **Other user-generated content**
rows and widens **Diagnostics**: the OS version travels with a comment, never
with a crash report. The Role is attached by the server from the Account and
is not a new data type. A comment stays after a Client closes her Account,
under the anonymised Account (its email becomes the `cerrada-…` placeholder),
as the record of what testers asked for; it is never shown to other users.
Update the Play form for both apps with REL-004 before the next store build.

## Not collected (both apps)

Location, contacts, health and fitness data (Evaluations are appointments
only: no measurements, results, or notes exist in the schema), messages, audio,
files and documents, calendar, web browsing, installed apps, search history
kept on the server, payment card or bank account numbers, advertising ID,
analytics. Crash reports drop the message, user, device and OS contexts,
breadcrumbs, and request (`packages/mobile-core/src/monitoring/error-reporting.ts`).

## Deletion and retention

**Decided 2026-10-19 (BE-021, [ADR-0097](../adr/0097-erase-personal-data-when-a-client-account-closes.md)).**
Google's User Data policy says closing an Account must delete the data linked
to it; hiding it does not count, and only data with a legitimate reason to
stay (accounting, security, legal obligations) may remain, disclosed in the
privacy policy. Closing a Client Account (Perfil → «Cerrar mi cuenta», or an
Administrator from the admin web after an email request) now erases the name,
email, phone, password, and profile photo in the closure transaction. The
Payments, Bookings, Credit, and attendance stay, soft-deleted (ADR-0086),
under «Cliente eliminado» for the studio's accounting, which the privacy and
deletion pages disclose.

The Client app's closure screen offers an unticked «Quiero seguir recibiendo
promociones de Emma Pilates» box. Ticking it copies the name, email, and phone
into an unlinked Promotion Contact with the time of consent; that is the
«Advertising or marketing» purpose on the three Personal info rows above, and
the pages say how to ask to stop. An Administrator's closure never keeps one.

Since BE-023 (ADR-0098) a Client with an open Account may also turn on
«Recibir promociones de Emma Pilates» in Perfil. It collects no new data type:
the app records only when she agreed and stopped, and the studio uses the name,
email, and phone she already gave for the same «Advertising or marketing»
purpose while it is on. Turning it off, or closing the Account, ends it. The
answers above already cover it; nothing in the form changes.

Promotions go by email or WhatsApp (user's decision 2026-10-20, WEB-033). An
Administrator exports the contacts from AW35 to a spreadsheet and sends the
WhatsApp messages from the studio's own WhatsApp, so the phone number reaches
Meta only after the Client turned promotions on, a consent the privacy page
discloses together with WhatsApp (Meta) as a provider. Play does not count a
transfer the user consented to with that disclosure as **sharing**, and the
phone number is already declared collected for «Advertising or marketing», so
the answers stay **not shared**. Re-check them if the studio ever sends from
the app or the API through the WhatsApp Business Platform.

**Invoice Data (PAY-007, 2026-10-23, booking ADR-0012).** Every sale may
carry the NIT or CI and the name or business name the Client wants on the
studio's invoice, which is issued outside the system. Play has no tax-ID type,
so it is declared as **Personal info → Other info** in both apps (and the name
it carries is the Client's or her business's), **optional**, for **App
functionality** only: it is never used for promotions. The Administrator sees
it on the admin web and exports it to a CSV for the studio's accountant, a
service provider acting for the studio, so it stays **not shared**. Closing the
Account erases it from every sale in the closure transaction, like the name
and phone; the privacy and deletion pages say so (updated 2026-10-23).

The form's «delete» answers are **Yes** with the deletion URL above.

## Related gaps found by the audit

All fixed; the two permission fixes reach Play with REL-009's next store
build.

- The Client build declared `CAMERA` and `RECORD_AUDIO`, which
  `expo-image-picker` adds on its own, although the app never used the camera
  and the privacy policy says so. MOB-064 (2026-10-19) dropped them (the
  `expo-image-picker` plugin with `cameraPermission: false` and
  `microphonePermission: false`).
- On iOS the Client app asked for read access to the photo library before
  every pick, with the plugin's English text, although the system photo
  picker needs no permission. MOB-065 (2026-10-19) stopped asking, so the
  build no longer declares `NSPhotoLibraryUsageDescription`; saving the QR
  still asks only to add photos.
- Privacy policy wording (WEB-028, fixed with BE-021 on 2026-10-19): the
  installation ID is a SHA-256 digest on the server and stays on the device
  after logout; crash reports carry the app version but not the OS; the
  throttling digests stop being used after 30 days (rows are soft-deleted); EAS
  Update (Expo) is contacted on every launch.
- A closed Account kept its profile photo (BE-020, fixed with BE-021 on
  2026-10-19: the closure detaches it, so ADR-0076's sweep deletes the bytes).
