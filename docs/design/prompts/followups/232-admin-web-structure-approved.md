# Follow-up — Admin web: the approved structure (icon rail, nine destinations)

Targets: **the admin web shell** (`AW02`'s sidebar and top bar, `AW33`,
`AW34`) and every `AW` page, which move into the destinations below. Read
with [225](./225-visual-system-v2.md) and [231](./231-admin-web-structure-proposals.md).
From here on, read the admin web's organisation from this follow-up instead
of 231's recommendation A and instead of the sidebar in `AW02`.

---

Written on 2026-11-03 (DES-005). After the three proposals of 231, the owner
chose **C** (the icon rail), answered five batches of questions, and approved
the structure and 231's visual direction on the canvas the same day («Sí lo
apruebo»). The pages are redrawn one by one in later follow-ups; nothing
under `design/` changes with this one.

## The shell

- A narrow **icon rail** (96 px, Lino) with the brand mark at the top and nine
  destinations, each an icon in a pill over a 12 px label; the selected one
  is a Rosa profundo pill. A destination with something waiting shows a count.
- A top bar with the wordmark «Emma Pilates Studio», a **global search**
  («Buscar una clienta, una clase, un pago o una página», Ctrl K), the Branch
  selector, and the signed-in person with her Role.
- Inside a destination, its pages are **tabs** under the title.
- At phone width the rail becomes a menu opened from the top bar.

## The nine destinations

| Destination | Tabs | Comes from |
| --- | --- | --- |
| **Inicio** | — | New |
| **Horario** | Clases · Nutrición | Horario; Evaluaciones nutricionales |
| **Clientas** | Todas · Para contactar · Congelamientos | Clientes, Fundadoras, Referidos (as a column), Para contactar, Congelamientos |
| **Promociones** | Carrusel · Clases de campaña · Referidos · Contactos | Promociones, the campaign button on Clientes, Referidos, Contactos para promociones |
| **Comentarios** | Nuevos · Revisados · Resueltos | Comentarios (its own destination so it stays visible) |
| **Dinero** | Pagos · Caja · Sueldos · Gastos | Pagos, Caja, Pagos a instructoras, Pago a la coordinadora, Nómina, Gastos, Categorías de gasto |
| **Estudio** | Personal · Insumos · Equipos | Personal, Insumos and Retiros, Equipos |
| **Informes** | El mes · Dinero · Simulador | Indicadores and Recomendaciones; Reporte and Finanzas; Simulador |
| **Ajustes** | Tipos de clase · Planes · Sucursales · Reglas del estudio · QR del estudio | Catálogo; Reglas del estudio (out of the account menu); WEB-038 |

The account menu keeps only «Cambiar contraseña» and «Cerrar sesión».

## What each destination gains (owner's decisions)

- **Inicio** shows three summaries side by side: **Por resolver** (the one
  Rosa profundo card), **Hoy en el estudio** (classes, bookings, occupancy,
  today's classes) and **Dinero** with a Hoy | Mes switch (collected, cash,
  confirmed QR, QR waiting). Below: the pending list, each row with its action
  and a link to the right tab, and **Recomendaciones del mes**.
- **Horario › Clases**: tapping a class shows who booked it and the waitlist,
  and lets the owner book a Client into it; past weeks are read-only; an empty
  class can be cancelled (walkthrough n.º 3, 24); a series has an end date or
  a pause (BKM-018).
- **Clientas › Todas**: filters Con plan · Sin plan · Expirado · **Fundadora**
  (Fundadoras stops being a page) and an «Invitada por» column (Referidos
  stops being a list here). The Client file has tabs Resumen · Reservas ·
  Pagos · Evaluaciones.
- **Dinero › Pagos** is every sale; **Caja** is the front-desk cash per day and
  Branch. The owner did not tell them apart, so each tab says in one line
  what it holds. **Sueldos** has a period picker (day, week, date range,
  month; BKO-009) and two views, **Por aprobar** and **Pagados** (the old
  Nómina). Expense categories open from «Editar categorías» on Gastos.
- **Informes** merges five pages into three tabs; El mes also carries the
  recommendations.
- **Ajustes** holds what is set up once; Planes stay here (the owner rarely
  changes them).

## What the Coordinator sees

The owner's contact point with Clients and Staff, never money:

- Inicio without the Dinero summary (a Clientas summary instead) and without
  money rows.
- Horario (Clases and Nutrición), including who booked and booking a Client.
- Clientas (all three tabs); the Client file without its Pagos tab and
  without courtesy classes or returning a class («me lo pide a mí»). She
  **approves or rejects freezes**.
- Promociones › Carrusel (she **creates and publishes** promotions),
  Referidos and Contactos; not Clases de campaña.
- Comentarios.
- Estudio: Personal (assigning Branches only), Insumos and Equipos (record
  withdrawals, restocks and faults).
- Informes › El mes without amounts; Ajustes › Reglas del estudio read-only.
- Never Dinero, Informes › Dinero, the Simulador or the other Ajustes tabs.

Freezes, promotions, Comentarios, Insumos, Equipos, Nutrición and the
read-only rules widen [ADR-0102](../../../adr/0102-coordinator-role-without-money.md),
so they need a new ADR and backend authorization before the pages ship.

## Order of the page redraws

Inicio, Horario, Clientas, Dinero, Estudio, Promociones, Comentarios,
Informes, Ajustes, then the sign-in pages. Each page is drawn at 1440 and
420 px for both Roles where they differ, and goes to the owner for approval
before the next one.
