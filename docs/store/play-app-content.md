# Google Play app content (REL-005)

Answers for Play Console → each app → Policy and programs → App content. The
answers are the same for both apps unless a row says otherwise. Data safety
has its own page: [play-data-safety.md](./play-data-safety.md).

## Declarations

| Section | Answer | Why |
| --- | --- | --- |
| Privacy policy | `https://app.emmapilatesstudio.com/privacidad` | WEB-021 |
| Ads | **No**, the app contains no ads | No ad SDK in either app |
| App access | **All or some functionality is restricted** → add the reviewer login below | Both apps open on a login screen |
| Content rating | IARC questionnaire below | |
| Target audience and content | **18 and over** only; not appealing to children: **No** | Adult studio customers and staff |
| News app | **No** | |
| COVID-19 contact tracing and status | **My app is not** a publicly available COVID-19 app | |
| Government app | **No** | |
| Financial features | **My app doesn't provide any financial features** | Clients pay by bank transfer in their own bank app; ours only shows a QR and stores the receipt photo |
| Health apps | see below | The Client app shows nutritionist Evaluations |
| Advertising ID | **No**, the app doesn't use an advertising ID | No ads or analytics SDK |

## App access: reviewer logins

Choose «All or some functionality in my app is restricted», then «Add
instructions» once per app:

| Field | Client app | Staff app |
| --- | --- | --- |
| Name | `Revisión Google Play` | `Revisión Google Play` |
| Username | `revision-play@emmapilatesstudio.com` | `revision-staff@emmapilatesstudio.com` |
| Password | from the Run Script job log, typed only into this form, never stored in the repository | same |
| Other information | «Inicia sesión con este correo y contraseña. La cuenta tiene un plan de prueba de 16 clases, otorgado por la administración, así que puedes reservar una clase, ver Mi plan y el perfil.» | «Inicia sesión con este correo y contraseña. La cuenta es de una instructora de prueba sin clases asignadas.» |
| Login needed every time | No (the session stays signed in) | No |

The reviewer Accounts are made for Google, never a real person's, by the
Run Script workflow's `20261031-store-review-accounts` on production
([runbook](../runbooks/run-script.md#store-review-accounts-20261031-store-review-accounts)):
both are verified and active without an email, marked `store_review`, and
their passwords appear once in the job run's log. The Client Account gets the
hidden tester Plan of 16 classes (REL-011), granted in the Administrator's
name, so the reviewer can book a class; that grant is a courtesy Payment of
Bs 0 and counts toward no income report. After the production reset
(REL-019) the script runs again with Force rerun and the new passwords go
into this form. The Staff Account is a Trainer with **no Sessions**, since a real
Session would be bookable by Clients; a Trainer rather than an Administrator
keeps the reviewer away from payments and Account management.

## Content rating (IARC questionnaire)

- Email address: `soporte@emmapilatesstudio.com`
- Category: **All other app types** (not a game, not social or communication,
  not a reference or news app).
- Violence, fear, sexuality, nudity, language, controlled substances,
  gambling, crude humour: **No** to all.
- **Online content** («content that isn't part of the initial app download»,
  with product listings as an example): **Yes**, since the schedule and the
  Plans come from the server; its follow-up questions (violence, sexuality,
  language, controlled substances) are all **No** (owner, 2026-10-31).
- **Does the app allow users to interact or exchange content?** The Client app
  sends a receipt photo and a profile photo that only studio staff see, and
  there is no chat, public profile, or content one Client can see from
  another. Answer **No**: Google's question is about users communicating with
  each other, and here a Client only talks to the business. If Play's wording
  on the day mentions sharing images with other users in any form, answer
  **Yes** instead; it lowers no rating, it only adds «Users interact».
- **Does the app share the user's current location?** **No.**
- **Does the app allow purchases of digital goods?** **No.** A Plan is paid by
  a bank transfer outside the app, with no Google Play billing.
- **Unrestricted internet browser or search engine?** **No.**

Expected result: everyone or 3+ (IARC), «Users interact» only if the
alternative answer above was given.

## Health apps declaration

Play asks this of apps in Health & Fitness. Tick only what the apps really do:

- Client app: **Activity and fitness** only (booking Pilates classes). The
  nutritionist Evaluations are appointments: the app never shows or stores
  nutrition data, so «Nutrition and weight management» stays unticked.
- Staff app: **Activity and fitness** only, as a studio staff tool.
- Never tick medical, clinical, or disease-management categories: the apps
  make no medical claims.

The listing text makes no health claims either (no weight-loss promises).
