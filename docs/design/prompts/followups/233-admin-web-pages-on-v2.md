# Follow-up — The whole admin web on v2

Targets: **every admin web page** (`AW01`–`AW44`, `AW151`), exported as the
boards in `design/v2/admin/`. Read with [225](./225-visual-system-v2.md) and
[232](./232-admin-web-structure-approved.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-03 (DES-005). After approving 232's structure and 231's
visual direction, the owner asked for every page at once rather than one by
one («Hacé el diseño de toda la web de una vez, ya aprobé todo»). From here
on, `design/v2/admin/` is the source for the admin web, and the v1 `AW` files
stay only as history until the code moves.

## The boards

| Board | Page | What it shows |
| --- | --- | --- |
| `P01-Inicio` | Inicio | 232's three summaries, the pending list with inline actions, Recomendaciones del mes. Tweaks: Role and «Todo al día» |
| `P01b-Inicio-coordinacion` | Inicio | The Coordinator's Inicio: a Clientas summary instead of Dinero, no money rows |
| `P01c-Inicio-al-dia` | Inicio | Nothing pending: «Todo al día» and the «Nada por resolver» state |
| `P01d-Inicio-movil` | Inicio at 420 px | One column; the menu button opens the nine destinations |
| `P02-Horario` | Horario | Clases: the week board (past days greyed and read-only, today in Rosa profundo, «Faltan equipos», «Llena · N en espera»), the class panel with who booked and the waitlist, «Reservar a una clienta» (to the waitlist when full), Editar / Pausar la serie / Terminar la serie / Cancelar esta clase (also with no bookings), «Nueva clase» with Una sola vez · Cada semana, «Vigente hasta (opcional)» and the no-end note, the toast. Nutrición: the week's evaluations and free slots |
| `P03-Clientas` | Clientas | Todas with the filters (Fundadora included), «Le quedan», «Vence», «Invitada por»; the Client file with Resumen · Reservas · Pagos · Evaluaciones; Para contactar with WhatsApp and «Contactada»; Congelamientos with the new expiry date, «Aprobar» / «Rechazar» and the decided list. Tweak: Role |
| `P11-Clientas-movil` | Clientas at 420 px | The list and the Client file as a full screen |
| `P04-Promociones` | Promociones | Carrusel cards in app order with drag handle and state; the editor panel; Clases de campaña with the reach («Llegará a 3 clientas»); Referidos with the trainers' codes; Contactos with export |
| `P05-Comentarios` | Comentarios | Nuevos · Revisados · Resueltos, an app filter, the list beside the detail (data, Estado, «Qué cambiamos», «Escribirle por correo») |
| `P06-Dinero` | Dinero | Each tab names what it holds under the title. Pagos with filters and the review panel (receipt, Confirmar / Rechazar); Caja read-only per day («Debía haber», «Contó», «Diferencia»); Sueldos with the Día · Semana · Rango · Mes picker and Por aprobar (statements with lines, «Aprobar y marcar pagado») · Pagados (with recepción and limpieza); Gastos with «Editar categorías» in a panel |
| `P07-Estudio` | Estudio | Personal with role filters and the member panel (Branches as checkboxes, referral code, Desactivar); Insumos with Stock · Retiros del mes and a stock meter; Equipos with faults. Tweak: Role |
| `P08-Informes` | Informes | El mes (four figures, the money trio for the Administrator only, classes per week, the monthly report with a question box, recommendations); Dinero (income, expenses, net, month by month, finances, budget against spend); Simulador (assumptions and projection) |
| `P09-Ajustes` | Ajustes | Tipos de clase, Planes, Sucursales, Reglas del estudio (read-only for the Coordinator, with the 7-day booking window), QR del estudio |
| `P10-Acceso` | Login, recovery, create password | One board with every state: Iniciar sesión, wrong credentials, Recupera tu contraseña, Revisa tu correo, Crea tu contraseña, Tu cuenta está activa |
| `Direccion-visual` | — | 231's desktop direction, kept as the reference sheet |

The rail on every board links to the other pages, so the canvas plays as one
clickable web. At phone width every page follows `P01d` and `P11`: the rail
becomes the menu button, tables become rows, and panels open full screen.

## Rules the boards follow

- The brand is «Emma Pilates Studio»; the tagline never appears.
- Studio-wide pages show «Todo el estudio» instead of the Branch selector;
  Branch pages keep it.
- One Rosa profundo emphasis per page; green and amber only in status pills.
- No underlined links; actions are 225's button kinds.
- Prices are whole bolivianos (walkthrough n.º 22).

## Not decided by the boards

The data is illustrative (fixture names and invented amounts). Whether the
Coordinator's pay statement follows the period picker stays open in BKO-009.
«Escribirle por correo» on Comentarios is a plain mail link, not a new
messaging feature.
