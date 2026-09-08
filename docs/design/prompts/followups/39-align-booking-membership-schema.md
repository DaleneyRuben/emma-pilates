# Follow-up — Align Booking & Membership screens with the reviewed schema

Targets: **Client `02`; Staff `S06`; Admin web `AW02`, `AW03`, `AW04`,
`AW07`, `AW17`, and `AW18`**. Send this alongside
[30](./30-invariants-checklist.md), including the amendments recorded by
[31](./31-plan-naming-leftovers.md) and
[32](./32-design-system-navigation-drift-again.md).

---

The Booking & Membership schema audit found several places where the generated
screens either cannot operate the accepted domain model or have sample copy that
contradicts it. Make only the changes below. Do not add another app, navigation
destination, domain table, payment mechanism, Plan benefit, or automatic
Promotion effect.

## 1. Make weekly Session Schedules operable on `AW02` and `AW03`

The Administrator builds the weekly Session Schedule on desktop. A weekly
definition generates concrete Sessions up to 30 days ahead. It is different from
a one-off Session, and changing it never rewrites booked occurrences.

- Keep `AW02` as the weekly calendar and keep `AW03` as its side panel.
- In the create flow, add a clear choice between **Una sola vez** and
  **Cada semana**.
- Both modes retain Tipo de clase, Entrenador, Hora and Capacidad.
- **Una sola vez** retains the concrete Fecha field.
- **Cada semana** uses Día de la semana and **Vigente desde** in Bolivia civil
  time. Replacing an existing definition requires a selected future date. Do not
  expose recurrence syntax, arbitrary intervals, an end-user time zone, Room, or
  Equipment inventory.
- When editing a generated future Session, ask whether the change applies to
  **Solo esta sesión** or **Esta y las futuras**. The first creates a one-off
  exception. The second requires **Vigente desde**, closes the old weekly
  definition at that boundary, and replaces only unbooked Sessions from that
  date onward. A Session that already has Bookings stays unchanged unless the
  Administrator explicitly edits or cancels that occurrence.
- Keep **Cancelar sesión** as an occurrence action. Do not ask for a required
  free-text cancellation reason.

Add only the minimum extra frames needed to make these choices and their effect
unambiguous. Preserve the calendar layout, Branch selector, waitlist count,
capacity rule, Trainer swap, cancellation refund, and notification copy.

## 2. Add the missing Class Type description to `AW07`

Add a required short text area labelled **Descripción** after **Nombre**. Explain
that this sentence or two appears on the Client Session Detail screen. Preserve
Duración, Capacidad, Equipo necesario, and the rule that existing concrete
Sessions are not rewritten by catalog edits.

## 3. Make Promotion publication explicit on `AW17` and `AW18`

A saved Promotion may be a private draft. It reaches the Client Home carousel
only after an Administrator explicitly publishes it with an image attached.

- On `AW17`, show a compact derived state on each card: **Borrador**,
  **Programada**, **Activa**, **Finalizada**, or **Archivada**. Programada means
  published before its display start date; Activa means published inside its
  display range; Finalizada means its display end date has passed.
- Keep drag reordering. Equal temporary positions must not be visible to the
  user and must not change the intended order.
- On `AW18`, distinguish **Guardar borrador** from **Publicar**. Publishing is
  disabled until an image, title, description, start date, and end date are
  present.
- An already-published Promotion has a **Dejar de publicar** action. Removing
  or replacing its image first unpublishes it and explains that it must be
  published again after the new image is ready.
- Preserve the existing image-first layout, inclusive display date range, and
  carousel ordering. Do not make Promotion copy change Plan prices, class
  allowances, Payment totals, Credits, or Referrals.

## 4. Correct contradictory sample content

- On Client `02`, replace **“2 clases de regalo al renovar tu paquete antes del
  25”** with a purely informational studio announcement that grants no classes
  and changes no price. Replace **“Invita y gana clases”** with **“Invita amigas
  y gana crédito”**.
- On `AW18`, replace **“Trae a una amiga y ganen una clase cada una”** and its
  related image/file/copy with a purely informational studio announcement.
- On `AW04`, remove **“Incluye 1 evaluación nutricional”**. Evaluations are free
  to every Client with an active Subscription and are not a Plan benefit.
- On `AW04`, remove the invented **“Prenatal 8 clases”** row and change the
  summary to **“6 planes · 6 visibles en la app”**. Keep exactly the six approved
  catalogue examples from invariant 1.
- On `S06`, replace **“Mensual 12 clases”** with **“Paquete de 12 clases”** and
  **“Mensual 8 clases”** with **“Paquete de 8 clases”**.

## Preserve everything else

Do not change the visual system, navigation, authentication follow-ups,
cancellation window, Payment methods, referral Credit rule, account avatars,
responsive behavior, or any screen not named in Targets. Return the regenerated
files for the named targets only, then re-verify the complete export against the
standing invariants before marking this follow-up applied.
