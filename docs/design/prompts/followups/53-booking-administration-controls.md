# Follow-up — Booking administration controls the admin web now has

Targets: **AW02 (Horario)**, **AW03 (Formulario de sesión)**, **AW04 (Planes)**,
**AW05 (Formulario de plan)**, **AW06/AW07 (Tipos de clase)**, **AW19/AW20
(Sucursales)**. Send [30](./30-invariants-checklist.md) (with the corrections
carried by [31](./31-plan-naming-leftovers.md) and
[40](./40-cancellation-window-wording.md)) and [39](./39-align-booking-membership-schema.md)
alongside this follow-up.

---

WEB-003 built these screens against the accepted Booking & Membership rules.
In a few places the screens draw less than the domain needs, or draw an action
the domain does not allow. Apply only the changes below.

## 1. `AW03` — Cancelling is only for a Session that has Bookings

`booking/CONTEXT.md` (Session): a Session with zero Bookings is cancelled
automatically by the 2-hour check; an Administrator cancels a Session **that
has Bookings**, as a last resort. The backend refuses to cancel an empty one.

- In **Editar sesión**, show **Cancelar sesión** (Error text link) only when
  the Session has at least one Booking. Its confirmation stays as invariant 4
  and follow-up 40 describe: «Se cancelan las 8 reservas y cada clienta
  recupera su clase, aunque falten menos de 2 h 30. Avisamos a cada clienta y a
  las 3 personas en lista de espera. No se puede deshacer.», buttons **Volver**
  and **Cancelar sesión**.
- For a Session without Bookings, replace the link with one muted centered
  line: «Sin reservas: si sigue vacía, el sistema la cancela sola 2 horas antes
  de empezar.»

## 2. `AW03` — What an existing Session can change

ADM-001 C4: editing one Session changes its Trainer (the Trainer swap), its
start, or its capacity. The Class Type of an existing Session does not change.

- In **Editar sesión · Solo esta sesión**, draw **Tipo de clase** as read-only
  text (field label above, the Class Type name below), not a dropdown.
- Under **Entrenador**: «Si cambias de entrenadora, le avisamos a la nueva.»
  Under the date and time: «Si cambias el día o la hora, avisamos a las
  clientas con reserva.»

## 3. `AW03` — Ending a weekly schedule

Follow-up 39 adds **Esta y las futuras**, but a weekly schedule can also stop
(ADR-0059: it ends from a selected future date and cancels only unbooked
Sessions).

- In **Esta y las futuras**, add a quiet Palo de rosa text link under
  **Guardar**: **Terminar la serie**. It opens a confirmation titled
  «¿Terminar esta serie semanal?» with one sentence («Reformer Pilates deja de
  repetirse desde la fecha que elijas. Las sesiones sin reservas se cancelan;
  las que tienen reservas o lista de espera se mantienen.»), a date field
  **Deja de repetirse desde** (Bolivia date), and **Volver** / **Terminar
  serie** (Error outline).

## 4. `AW02` — The result of a schedule change

After a schedule change the page shows one Éxito-tinted line above the week,
naming what happened, for example «Serie semanal creada: 4 sesiones en los
próximos 30 días.», «Serie actualizada desde el 02/10/2026: 4 sesiones nuevas;
3 sin reservas se reemplazaron y 1 con reservas se mantiene sin cambios.», or
«Sesión cancelada: 8 reservas reembolsadas y avisos enviados.». It disappears
when the next panel opens. A full Session's block reads «Llena · 3 en espera»
in the Advertencia tone.

## 5. `AW04`/`AW05` — Plan order and visibility

A Plan is never deleted; it is hidden from the Client catalog (ADM-001 A3).

- `AW04`: a **Visibilidad** column with a neutral «Oculto» or Éxito «Visible»
  pill, and a **Visibilidad** filter (Todos · Visibles · Ocultos) next to the
  title. The Precio column stays right-aligned (`Bs 1.050,00`).
- `AW05`: after **Precio**, a field **Orden en la app** («Los planes se
  muestran a las clientas de menor a mayor.»). Under **Clases incluidas**:
  «Cantidad fija para todo el periodo; ningún plan es ilimitado.» In edit mode,
  the note «Las suscripciones vigentes y las compras ya iniciadas conservan su
  precio.» and a Palo de rosa text link under **Guardar**: **Ocultar en la
  app** (or **Mostrar en la app** for a hidden Plan).

## 6. `AW06`/`AW07` and `AW19`/`AW20` — Archiving

ADM-001 A1/A2: an idle Branch or Class Type is archived, never deleted, and
the backend refuses while upcoming work depends on it. `AW19`'s «no delete»
rule stays true; archiving keeps the history.

- `AW06` and `AW19`: an **Estado** filter (Activos/Activas · Archivados/Archivadas
  · Todos/Todas, default active), and a neutral «Archivado»/«Archivada» pill
  beside an archived row's name.
- `AW07` and `AW20` edit frames: an Error text link under **Guardar**:
  **Archivar tipo de clase** / **Archivar sucursal**, with a confirmation
  («¿Archivar Centro?», **Volver** / **Archivar**). When the backend refuses,
  the panel says «No puedes archivarla: tiene sesiones programadas o un horario
  semanal vigente.» / «No puedes archivarlo: un horario semanal vigente lo
  usa.»
- `AW07` edit mode also notes: «Los cambios se aplican a las sesiones que se
  generen desde ahora; las ya programadas no cambian.»

## Preserve everything else

Do not change the shell, sidebar, Branch selector, visual system, the
follow-up 39 choices (Una sola vez / Cada semana, Solo esta sesión / Esta y las
futuras, Vigente desde), the capacity rule, or any screen not named in Targets.
