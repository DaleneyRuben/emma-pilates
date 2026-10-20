# Follow-up — `AW35` lists live Clients too

Targets: **AW35 Contactos para promociones** (every frame) and the generated
handoff `design/README.md` (its `AW35` row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BE-023 on 2026-10-20. Clients with an open Account can now agree
to promotions from Perfil (follow-up 103, ADR-0098), so AW35 lists them beside
the former Clients who ticked the box when closing. For a live Client,
«Dejar de enviar» only takes her off the list: her Account and data stay, and
she can agree again from her profile. For a former Client it still erases the
contact, as built.

## 1. The subtitle

In the four desktop frames the subtitle after the count becomes «clientas que
aceptaron recibir promociones, activas o con la cuenta cerrada» (the count
keeps its number: 12, 11, 0, 12). The narrow frame keeps «12 contactos».

## 2. A «Tipo» column

In every desktop table, add a column **Tipo** between «Nombre» and «Correo»,
holding one pill per row (12 px medium, 22 px tall, radius 999, 10 px side
padding):

- **Activa** — a live Client: Palo de rosa tinte (`#EFE0DC`) with
  `#7A4F4B` text.
- **Cuenta cerrada** — a former Client: the neutral pill
  `rgba(216,201,187,0.34)` with Texto secundario (`#6E6663`) text.

Sample rows: Paula Antelo and Natalia Vaca are **Activa**; Valeria Quiroga,
Daniela Rojas, Mónica Salvatierra, and Carla Justiniano are **Cuenta
cerrada**. In the narrow frame each card shows the same pill to the right of
the name. Squeeze the other columns, not the pill; shorten no email.

## 3. A second confirmation

Add a frame **Confirmación · Clienta activa** after «Confirmación · Dejar de
enviar», in the same dialog convention, for Paula Antelo: title «¿Dejar de
enviar promociones a Paula Antelo?», body «Su cuenta no cambia: solo sale de
esta lista. Puede volver a aceptar las promociones desde su perfil en la
app.», no «no se puede deshacer» line, and buttons **Volver** (neutral) and
**Dejar de enviar** (Error outline). Its caption: «Para una clienta activa ·
su cuenta no cambia».

## 4. The empty state and the notes

- «Sin contactos»'s note becomes «Aparecen aquí cuando una clienta acepta
  recibir promociones en su perfil o al cerrar su cuenta.»
- In the notes card, «De dónde salen» says both sources (Perfil's switch and
  the closure box); «Exportar CSV» lists the columns Nombre, Tipo, Correo,
  Teléfono, Aceptó el; «Dejar de enviar» says that a live Client only leaves
  the list (success line «Paula Antelo ya no recibirá promociones.») while a
  former Client's contact is erased.

## 5. The handoff README

The `AW35` row says the list holds live Clients (ADR-0098) and former Clients
(ADR-0097), with a «Tipo» column, and that «Dejar de enviar» closes a live
Client's consent or erases a former Client's contact.

## Leave untouched

The shell and sidebar, the title row and «Exportar CSV», the search field,
the other columns and their order, «Dejar de enviar» in each row, the
«Confirmación · Dejar de enviar» frame, «Después de borrar» except its new
column and subtitle, «Sin resultados» except its subtitle, the footer, every
other screen, and every other line of the README.
