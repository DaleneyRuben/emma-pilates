# Follow-up — Resync the design system's navigation section with the built apps

Targets: **Sistema de Diseño (Prompt 00)**, section "06 Navegación" (and the sample data around it). Send as a follow-up.

---

The handoff tells implementers to start with this file, but its navigation section still describes an earlier shape of the product. Four corrections:

1. **Client tab bar labels.** It shows "Inicio · Horarios · Reservas · Perfil". Every built client screen uses "Inicio · Reservar · Mis Reservas · Perfil". Use the built labels.

2. **Staff roles.** The staff-app example lists three roles — "Entrenadora · Asistente · Administración". There are four: the **Nutricionista** was added to the staff app and has three screens of her own (`S15`, `S16`, `S17`), plus her own notification type on `S20`. Add her to the list, keeping the same "la app de staff se enruta por rol" note.

3. **Web sidebar.** The example draws a 248px sidebar with "Emma Studio · Resumen · Horarios · Clientas · Reportes". The built admin shell (`AW02`, and every screen after it) is **236px** wide, the wordmark is **"Emma"**, and the nav is: **Horario** · *Catálogo* (Tipos de clase, Planes, Sucursales) · *Back Office* (Clientes, Pagos, Insumos, Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de gasto) · **Reporte** · *Promociones* (Promociones, Referidos, Créditos). Redraw the example with the real width and a truncated but accurate slice of that nav. There is no "Resumen" / dashboard page in the admin web — Horario is where an administrator lands — so don't show one. Do not add "Descuentos": it was dropped for good, see ADR-0007.

4. **"Sesiones" used for the class allowance.** The sample cards say "5 de 8 sesiones usadas" and "Paquete 4 / Paquete 8". In `booking/CONTEXT.md` a Session is a scheduled occurrence on the calendar; what a Plan grants and a Booking consumes is a **class**. Change the allowance wording to "clases" ("5 de 8 clases usadas"), matching the client app.

Everything else in the file — the palette, type scale, spacing, radii, elevation, status pills, buttons and the writing rules — is correct and stays as it is. This follow-up is only about the navigation section and the sample copy inside it.
