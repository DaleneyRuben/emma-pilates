# Follow-up — The Navegación section drifted again, and two additions to the invariants list

Targets: **Sistema de Diseño (Prompt 00)**. Send as a follow-up on the admin-web surface, alongside [30](./30-invariants-checklist.md) as always.

---

The last export is the best one so far: `AW34`'s invented plan is gone, the plan card counts **clases**, `19` says **six** types, and every trace of "Mensual libre", "Mensual ilimitado", "Semestral libre", "Anual libre" and "Paquete de 4 clases" is gone from the admin web *and* the staff app, with the amounts realigned to the catalogue. Nothing on the checklist broke — except section 06 of the design system, which was already fixed once by [14](./14-design-system-navigation-drift.md) and has now drifted back to navigation that no built screen has. This is the one section whose entire job is to describe what the apps actually do.

## 1. Client tab bar — wrong labels

The tab bar sample reads **Inicio · Horarios · Reservas · Perfil**. The built client app (`02`, and every other client screen that draws the bar) reads:

**Inicio · Reservar · Mis Reservas · Perfil**

Use those four labels, exactly as capitalised there. "Horarios" and "Reservas" appear on no client screen.

## 2. Staff role chips — Nutricionista is missing

The row under the staff header sample shows three roles: Entrenadora, Asistente, Administración. There are **four**, and the fourth has built screens of its own (`S15`, `S16`, `S17`):

**Entrenadora · Asistente · Nutricionista · Administración**

Put Nutricionista back, third, between Asistente and Administración. Entrenadora stays the selected chip.

## 3. Admin sidebar sample — it is not the admin sidebar

The web sample is captioned "Panel web · barra lateral · 248 px" and shows **Emma Studio** over **Resumen · Horarios · Clientas · Reportes**. None of that exists. The admin sidebar is 236 px wide, is headed **Emma**, and is identical on every admin screen (`AW02`–`AW29`, `AW31`, `AW33`, `AW34`) in this order:

- **Horario** (no section)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos ⟨badge 6⟩ · Insumos ⟨badge 3, warning tint⟩ · Evaluaciones nutricionales · Personal · Nómina · Gastos · Categorías de gasto
- **Reporte** (no section, its own item after Back Office)
- **Promociones**: Promociones · Referidos · Créditos

Redraw the sample from that list. It may abbreviate to fit the frame the way it did before — collapsing a section's tail into "Personal, Nómina…" is fine — but every label it does show must be one of these, and the section headings, the order and the two badges must be the real ones. There is no "Resumen", no "Reportes", no "Clientas", and no "Descuentos" (ADR-0007).

## 4. Sample table — a plan that doesn't exist, and two shortened names

The client table below the sidebar lists "Lucía Mendoza · **Paquete 8**", "Andrea Suárez · **Mensual**" and "Camila Rojas · **Paquete 4**". Plans are written out in full and only the six in the catalogue exist. Use:

| Client | Plan | State |
|---|---|---|
| Lucía Mendoza | Paquete de 8 clases | Activo |
| Andrea Suárez | Mensual 16 clases | Pendiente |
| Camila Rojas | Paquete de 12 clases | Vencido |

The three states, their colours and the row density stay as they are.

## 5. Two additions to the invariants list

- **Point 5** omits one item: after Back Office and before the Promociones section there is a standalone **Reporte** entry (it opens `AW16`). It has always been in the built sidebar and in `design/README.md`; the list simply didn't name it. Read point 5 with Reporte in it from here on.
- **Point 1**, on top of "the six plans are the only ones that exist": plan names are always written **in full** — "Paquete de 8 clases", never "Paquete 8"; "Mensual 16 clases", never "Mensual". An abbreviated name is as wrong as an invented one.

---

Everything else in `Sistema de Diseño` stays untouched — the palette, the type scale, the buttons, the new **Avatar de cuenta** section with its contrast note, the "5 de 8 clases usadas" plan card, the 2 h 30 cancellation window, and the voice-and-tone section. And nothing changes on any other screen: the whole invariants list holds as of this export and must keep holding.
