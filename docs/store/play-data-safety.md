# Google Play data safety (REL-004)

Answers for Play Console → each app → Policy and programs → App content →
Data safety. They come from an audit of the code on 2026-10-19 (both apps and
`packages/mobile-core`), not from the proposals, and they match ADR-0081's
telemetry rules. Re-check them whenever an app starts sending a new kind of
data; PAY-007 (2026-10-23) added Invoice Data, see [Deletion and retention](#deletion-and-retention).

**Re-audited 2026-11-22 against `main` (`c5f726ed`).** The Staff app now
uploads photos and PDF files and the Client app sends more free text and the
registration channel; see [Changes since 2026-10-24](#changes-since-2026-10-24)
for the evidence and the exact form edits. The privacy policy has not caught
up with the Staff app yet: see [Privacy policy gaps](#privacy-policy-gaps).

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
| Personal info → User IDs | Referral code entered at registration; her own referral code, which she can change in Mis referidos | Optional | App functionality |
| Personal info → Phone number | Profile; used for promotions only while the Client's Perfil switch is on, or kept for them if she ticks the box when closing | Optional | App functionality, Account management, Advertising or marketing |
| Personal info → Other info | «¿Cómo nos conociste?» at registration (BKM-011, the app requires an answer); Invoice Data on a purchase (PAY-007): the NIT or CI and the name or business name for the studio's invoice, prefilled from her last purchase; «Sin factura» sends none | Required (the channel) | App functionality, Analytics |
| Financial info → Purchase history | Plans bought, Payment amount, method and state | Required | App functionality |
| Photos and videos → Photos | Profile photo and transfer receipt (for a Plan or an Evaluation), picked from the gallery | Optional (a receipt only to pay by transfer) | App functionality |
| App activity → Other actions | Bookings, Waitlist entries, Evaluation appointments, Plan freeze requests | Required | App functionality |
| App activity → Other user-generated content | The text of «Enviar comentarios» (REL-012), with its type (Problema, Sugerencia, Otro), no screenshots; the «Motivo» of a Plan freeze request (up to 300 characters) | Optional | App functionality (fixing and improving the apps, reviewing a freeze) |
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
| Personal info → User IDs | **New 2026-11-22.** The Staff Member's own referral code, which she can change (Perfil → código de referido); a Client's referral code the Assistant types when creating her Account | Optional | App functionality |
| Personal info → Other info | A Client's «¿Cómo nos conoció?» when the Assistant creates the Account (required on that screen); a Client's Invoice Data (NIT or CI and name or business name) the Assistant types with a sale (PAY-007) | Optional | App functionality, Analytics |
| Financial info → User payment info | **New 2026-11-22.** The Staff Member's bank payment QR (FIX-072, upload purpose `payout_qr`), so the studio can pay her salary; the image encodes her bank account | Optional | App functionality |
| Financial info → Purchase history | Payments recorded by the Assistant (cash or a transfer receipt she photographs), transfer approvals and rejection reasons by the Administrator | Required for those Roles | App functionality |
| Photos and videos → Photos | **New 2026-11-22.** Her profile photo (FIX-041, gallery); a transfer receipt at the front desk, the photo of an issued invoice (FIX-044), and her payout QR, each from the camera or the gallery | Optional | App functionality |
| Files and docs → Files and docs | **New 2026-11-22.** An issued invoice as a PDF picked from the phone's files (FIX-049, `expo-document-picker`) | Optional | App functionality |
| App activity → Other actions | Attendance, Bookings made for Clients, the Nutritionist's availability, cash closes, equipment fault reports, freeze approvals and refusals | Required | App functionality |
| App activity → Other user-generated content | as in the Client app («Enviar comentarios»); the description of an equipment fault (up to 500 characters), the note on a cash close, and the message on a freeze refusal | Optional | App functionality |
| App info and performance → Crash logs | as in the Client app | Required | App functionality |
| App info and performance → Diagnostics | as in the Client app | Required | App functionality |
| Device or other IDs → Device or other IDs | Installation ID and push token | Required | App functionality, Fraud prevention, security, and compliance |

Until 2026-11 the Staff app uploaded no photos; it now uploads photos and
PDFs (see [Changes since 2026-10-24](#changes-since-2026-10-24)).

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
video, calendar, web browsing, installed apps, search history kept on the
server, payment card numbers, advertising ID, and no analytics or ads SDK.
The Client app collects no files or documents and no bank account data; the
Staff app does (invoice PDFs, the payout QR). A Client downloading her
invoice in «Mis facturas», or a Staff Member viewing a salary receipt, only
receives data. The clipboard (`expo-clipboard`) is only written to, to copy a
referral code. Crash reports drop the message, user, device and OS contexts,
breadcrumbs, and request (`packages/mobile-core/src/monitoring/error-reporting.ts`).

## Deletion and retention

**Decided 2026-10-19 (BE-021, [ADR-0097](../adr/0097-erase-personal-data-when-a-client-account-closes.md)).**
Google's User Data policy says closing an Account must delete the data linked
to it; hiding it does not count, and only data with a legitimate reason to
stay (accounting, security, legal obligations) may remain, disclosed in the
privacy policy. Closing a Client Account (Perfil → «Cerrar mi cuenta», or an
Administrator from the admin web after an email request) now erases the name,
email, phone, password, and profile photo in the closure transaction. The
Payments, Bookings, and attendance stay, soft-deleted (ADR-0086),
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

## Added since the 2026-10-19 draft

These three were folded into the tables above; this note keeps why each type
was chosen. An earlier draft of this section named different types; the tables
are the answer to enter.

**Feedback text (REL-012, «Enviar comentarios»).** Both apps: **App activity →
Other user-generated content**, optional, App functionality. The text, the app
version, and the device kind are kept while the Account is open; a Client's
stays under the anonymised Account after closure (see above). Never used for
advertising.

**NIT or CI and business name (PAY-007, Invoice Data).** Both apps: **Personal
info → Other info**, optional, App functionality only (see [Deletion and
retention](#deletion-and-retention)). Play's «Other financial info» was
considered and not used: the NIT or CI identifies the buyer for the invoice
and carries no account, balance, or credit data.

**How she found the studio (BKM-011, «¿Cómo nos conociste?»).** Client app at
registration, and the Staff app when the Assistant creates a Client's Account:
also **Personal info → Other info**, which makes that type **required** in the
Client app (the registration screen will not submit without an answer,
`packages/mobile-core/src/auth/registration-screen.tsx`) and adds the
**Analytics** purpose in both (the Administrator counts where new Clients come
from on the admin web; no third party receives it, and no analytics SDK is
involved). It stays with the accounting record after closure, like the
Payments.

## Changes since 2026-10-24

Audit of `main` at `c5f726ed` (2026-11-22) against the answers entered on
2026-10-24. Libraries added since then: `expo-clipboard` (both apps, write
only), `expo-document-picker`, `expo-image-picker` with the camera,
`@react-navigation/bottom-tabs` and `react-native-svg` (Staff). No new
third-party SDK that collects data on its own: Sentry (`@sentry/react-native`,
sending to Better Stack) was already declared, and its settings are unchanged
(`packages/mobile-core/src/monitoring/error-reporting.ts`: `sendDefaultPii:
false`, no session tracking, no screenshots, `beforeSend` sanitizer). Upload
purposes on the API are now `profile_photo`, `transfer_receipt`, `promotion`
(admin web only), `invoice` (PDF, JPEG, PNG), and `payout_qr`
(`apps/backend/src/uploads/image-purpose.ts`).

### Client app

| Change | Evidence | Form edit |
| --- | --- | --- |
| The registration channel was described below the tables but missing from the **Other info** row | `packages/mobile-core/src/acquisition/acquisition-channel-field.tsx`, required in `registration-screen.tsx` | **Other info**: make it **Required**, add **Analytics** (keep App functionality) |
| Freeze request with a required free-text «Motivo» (300 characters) | `apps/client-mobile/src/subscription/freeze-plan-screen.tsx` | none: **Other user-generated content** is already ticked, optional, App functionality |
| She can change her own referral code | `packages/mobile-core/src/acquisition/own-referral-code.tsx` (`EditReferralCode`), used by `apps/client-mobile/src/payments/referral-code-card.tsx` | none: **User IDs** is already ticked |
| «Mis facturas»: downloads and shares the studio's invoice | `apps/client-mobile/src/invoices/` | none: only received |
| Evaluation paid by transfer uploads a receipt | `apps/client-mobile/src/evaluations/use-evaluation-commands.ts` (`transfer_receipt`) | none: **Photos** is already ticked |

### Staff app

| Change | Evidence | Form edit |
| --- | --- | --- |
| Staff profile photo (FIX-041) | `apps/staff-mobile/src/profile/staff-photo-summary.tsx` (`profile_photo`) | tick **Photos and videos → Photos** |
| Front-desk transfer receipt, camera or gallery | `apps/staff-mobile/src/assistant/front-desk-receipt-upload.ts` (`transfer_receipt`), camera permission in `apps/staff-mobile/app.json` | same **Photos** row |
| «Facturas por subir»: the issued invoice as a photo (FIX-044) or a PDF (FIX-049) | `apps/staff-mobile/src/invoices/invoice-screen.tsx` (`invoice`), `apps/staff-mobile/src/uploads/document-upload.ts` | same **Photos** row, and tick **Files and docs → Files and docs** |
| Payout QR (FIX-072) | `apps/staff-mobile/src/profile/payout-qr/use-save-payout-qr.ts` (`payout_qr`) | same **Photos** row, and tick **Financial info → User payment info** |
| Her own referral code, changeable; a Client's code at Account creation | `apps/staff-mobile/src/profile/staff-referral-code-screen.tsx`, `apps/staff-mobile/src/assistant/new-client-screen.tsx` | tick **Personal info → User IDs** |
| A Client's registration channel at Account creation | `apps/staff-mobile/src/assistant/new-client-screen.tsx` (`ChannelGrid`) | **Other info**: add **Analytics** |
| Equipment fault description (500 characters), cash close note, freeze refusal message | `apps/staff-mobile/src/trainer/report-fault-screen.tsx`, `src/cash-close/cash-close-form.tsx`, `src/administrator/refuse-freeze-step.tsx` | none: **Other user-generated content** is already ticked |

Every new row is **collected**, **not shared**, **not processed ephemerally**,
**optional**, purpose **App functionality** only. The payout QR is an image the
API stores without decoding it, but it carries the account the studio pays
into, so «User payment info» is declared rather than left to «Photos» alone:
over-declaring costs nothing, under-declaring is a rejection reason. The
invoice files are the studio's own documents, yet the Staff app sends them
off the device, so Play counts them as collected.

## Privacy policy gaps

Play compares the Data safety form with the privacy policy. The audit found
that `apps/public-site/privacidad/index.html` did not cover the Staff
additions: «Si eres parte del equipo» named no profile photo, invoice files,
or payout QR, and «Permisos del teléfono» said the app «no usa la cámara»,
false for the Staff app since FIX-044. It also omitted the freeze «Motivo»,
fault reports and cash close notes, and the registration channel. Fixed on
2026-11-22 (page dated 22/11/2026): the page now lists them and says the
camera and file picker are Staff-only. The iOS camera and photos permission
texts in `apps/staff-mobile/app.json` still mention only transfer receipts
and the old name «Emma Pilates Staff»; Android never shows them, so Play is
unaffected, but they should be widened with the next store build.

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
