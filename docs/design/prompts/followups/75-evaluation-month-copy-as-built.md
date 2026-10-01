# Follow-up — Evaluation copy names the month it is about

Targets: **Client `13`, `14`, `15`, `19`; generated handoff
`design/README.md` (the `13`, `14`, `15`, and `19` rows)**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
[70](./70-leftovers-of-the-2026-09-30-exports.md), and
[73](./73-unread-notifications-badge.md) §4.

---

A Client has one free Evaluation per month, and `13` offers the days of every
month not yet used in the next 30 days, so an Evaluation can belong to **next
month** ([43](./43-evaluation-availability-months-and-branch.md) and
[44](./44-my-evaluations-two-upcoming-and-cancel-window.md), the Booking & Membership
glossary's Evaluation and its monthly allowance). The screens still word every
line as if the Evaluation were always this month's, and `14` sends the Client
to Perfil to cancel although `13` is also reached from Inicio. The Client app
has named the month since MOB-022 (2026-10-01); this follow-up draws what it
ships. The sample month of these screens stays **agosto** (next month:
**septiembre**).

## 1. `13` used-month title

The «Ya usada este mes» frame keeps its sample: «Ya usaste tu evaluación de
este mes.» is right when the used month is the current one. Its caption's
second line gains the rule: **«El título nombra el mes usado: "de este mes" si
es el actual, si no "de septiembre"»**, after the existing text and a « · ».
No new frame.

## 2. `14` where to cancel

The line under the two notes reads **«Si necesitas cambiarla, puedes
cancelarla desde Mis evaluaciones hasta 3 horas antes.»** (was «… desde
Perfil …»). Nothing else on `14` changes.

## 3. `15` empty state and cancel sheet

- The existing «Sin evaluaciones próximas» frame keeps its copy («Tu
  evaluación de este mes sigue disponible y es gratuita.»); its caption's
  second line becomes **«Acceso directo a la disponibilidad · la evaluación de
  este mes aún no se usó»**.
- Add one phone frame right after it, captioned **«Sin próximas · ya usada
  este mes»** / **«La evaluación de este mes ya pasó · ofrece la del mes
  siguiente»**. It is the same screen as the empty frame (header, the
  illustration placeholder, «No tienes evaluaciones próximas.», the full-width
  «Reservar evaluación» primary button, the tab bar with Perfil active) with
  the body line **«Ya usaste tu evaluación de este mes. Puedes reservar la de
  septiembre, también gratuita.»**, and below the button the «Anteriores»
  section exactly as the first frame draws it, holding one row: **04 / Ago**,
  «09:30 · Carla Peña», «Realizada». The empty block no longer centres in the
  whole height; it sits under the header with the same gaps, so the list fits
  above the tab bar inside the 874 px device.
- The «iOS · Confirmar cancelación» frame keeps «Podrás reservar otra
  evaluación para este mes.» (its sample is in agosto); its caption's second
  line gains **« · "para este mes" o "para septiembre", según el mes de la
  evaluación»**.
- The «Estado vacío» note card gains one sentence at the end: **«Si la
  evaluación de este mes ya pasó, ofrece la del mes siguiente, también
  gratuita.»**

## 4. `19` studio-cancelled Evaluation

The sample notice keeps «… Ya puedes reservar otra este mes.» (the Evaluation
and the notice are in the same month). Its rule goes in the README row (§5):
when the cancelled Evaluation is in a later month than the notice, the
sentence reads **«Ya puedes reservar otra para octubre.»** with that month's
name.

## 5. README

- `13` row: append «; the used-month title names the used month («de este
  mes» or «de septiembre»)».
- `14` row: «Confirmation step; cancelling is from `15` («desde Mis
  evaluaciones»)».
- `15` row: append «; the sheet frees «este mes» or the Evaluation's month by
  name; the empty state offers next month's free Evaluation once this month's
  took place».
- `19` row: append «; its last sentence names the freed month («otra este
  mes», or «otra para octubre» when the Evaluation was in a later month)».

## Preserve everything else

Every other frame, caption, sample date, card, button, colour, and tone on
`13`, `14`, `15`, and `19`; the tab bar; the «Evaluación confirmada» strip;
`S15`–`S17` and `S20`; every other screen and README line.
