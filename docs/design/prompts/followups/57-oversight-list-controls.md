# Follow-up — What the read-only oversight lists show

Targets: **AW25 (Evaluaciones nutricionales)**, **AW26 (Referidos)**, **AW27
(Créditos)**. Send [30](./30-invariants-checklist.md) (with the corrections
carried by [31](./31-plan-naming-leftovers.md),
[40](./40-cancellation-window-wording.md), and
[48](./48-insumos-record-restock.md) §6) alongside this follow-up.

---

WEB-008 built the three lists against `booking/CONTEXT.md` (Evaluation,
Referral, Credit), NUT-001 D12, and invariant 10. All three stay read-only:
no primary action, no side panel, and rows that open nothing. In a few places
the screens name something the domain says differently, or leave out a state.
Apply only the changes below.

## 1. `AW25` — One Branch, one week

An Evaluation happens at a Branch (ADR-0001), so the page follows the top-bar
Branch selector like Insumos and Gastos; it is not one of the studio-wide
pages.

- Subtitle: «Sucursal Centro · 9 evaluaciones agendadas», «1 evaluación
  agendada», or «ninguna evaluación agendada».
- The filter row is the week stepper Horario already draws: two compact
  neutral arrows, **Hoy**, and the week's dates («21 – 27 de septiembre de
  2026»), then **Nutricionista** («Todas» and the Nutritionists assigned to
  the Branch; a deactivated one reads «Lorena Iriarte (cuenta desactivada)»
  so her past Evaluations stay findable).
- Under the Client's name the second line is only **«Primera evaluación»** or
  **«Seguimiento»**, as on `S15` (follow-up 45). The domain derives first
  versus follow-up from the Client's earlier Evaluations and keeps no
  ordinal, so «Control · 3.ª evaluación» cannot be shown.
- «Fecha y hora» reads «lun 21/09 · 09:00», Bolivia time.
- Footer: «Mostrando 1–9 de 9 evaluaciones». Empty week: «Sin evaluaciones en
  este rango.» with «Prueba con otra semana.», or, with a Nutritionist chosen,
  «Prueba con otra semana o quita el filtro de nutricionista.», and a quiet
  third line «Las clientas las agendan desde la app; la nutricionista publica
  su disponibilidad en la app del personal.»
- At 420 px each Evaluation is one labelled card (Cliente, Nutricionista,
  Fecha y hora), like every other list, instead of cards grouped by day.

## 2. `AW26` — Counts that do not follow the search

- The subtitle counts the whole studio whatever the search: «34 referidos ·
  27 con crédito otorgado, 7 pendientes»; with none yet, «Todavía no hay
  referidos en el estudio».
- The referrer's second line counts all of her Referrals, in the feminine:
  «3 referidas en total», «1 referida en total».
- Footer: «Mostrando 1–8 de 34 referidos».
- Add the no-results state of follow-up 25: the table keeps its header and
  says «No se encontró ningún referido.», «Revisa cómo escribiste el nombre
  de la clienta.», and «Un referido nace cuando una clienta se registra con
  el código de otra.»; the footer reads «Sin resultados». With no Referral
  at all the first line is «Todavía no hay referidos.»

## 3. `AW27` — Four movements and a total that must add up

- «Última actividad» names what the last ledger entry did: **«Crédito
  ganado»** (a Referral award), **«Reservado para un pago»** (held while a
  purchase is open), **«Usado en un pago»** (spent when its Payment is
  confirmed), or **«Devuelto al saldo»** (released when the purchase expires
  or is rejected). The date above it is `dd/mm/aaaa`.
- «Total en saldo activo» sits in a quiet Superficie block under the table,
  label left and amount right. It shows only while no search is typed: a
  searched page would not add up to the studio total. While searching, the
  subtitle keeps «Bs 640,00 en saldo activo» and drops the Client count.
- Footer: «Mostrando 1–9 de 9 clientas con crédito» (follow-up 28).
- No-results: «No se encontró ninguna clienta con crédito.» and «Revisa cómo
  escribiste el nombre.» Empty: «Ninguna clienta tiene crédito disponible.»
  and «El crédito se gana con los referidos y se usa al confirmar un pago.»

## Preserve everything else

Do not change the shell, the sidebar, the Branch selector's studio-wide note
on `AW26` and `AW27`, the absent primary actions, the Crédito otorgado /
Pendiente pills, the right-aligned tabular amounts, or any screen not named
in Targets. There is still no Evaluation detail screen anywhere (invariant 10).
