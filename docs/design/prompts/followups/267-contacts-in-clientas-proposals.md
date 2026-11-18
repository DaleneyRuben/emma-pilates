# Follow-up — Walkthrough finding 91: Contactos inside Clientas (proposals)

Targets: **P03 Clientas › Todas** (1440) and **P11 Clientas móvil** (420),
with **P04 Promociones** losing its «Contactos» tab, as proposals only, on a
canvas of their own exported to `design/v2/propuestas-contactos/`. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md) and
[104](./104-aw35-live-clients.md). Send [30](./30-invariants-checklist.md)
alongside this follow-up. No exported screen is regenerated here: a later
follow-up records what the owner chose.

---

Written on 2026-11-17 for DES-019 and FIX-065 (walkthrough finding 91).

## Why

Since FIX-060 (walkthrough finding 85) every active Client is a promotions
contact, so **Promociones › Contactos** (AW35) lists the same people as
**Clientas**. The owner: «¿para qué necesito la página de contactos si en
clientas puedo ver la misma info?». The page only adds two things: the
former Clients who ticked «Quiero seguir recibiendo promociones» when they
closed their account (with **Dejar de enviar**), and **Exportar CSV**. It
is also reached two ways (the «Contactos para promociones» button and the
«Contactos» tab). Her decision (2026-11-17), «Filtro + CSV en Clientas»:

- the Contactos page goes away: no tab, no button, its address opens
  Clientas › Cuenta cerrada;
- Clientas gets a sixth filter, **Cuenta cerrada**, after Todas / Con plan /
  Sin plan / Expirado / Fundadora. It lists only those former Clients and
  keeps **Dejar de enviar**. A closed account never shows under the other
  filters (Todas included);
- Clientas gets **Exportar CSV**, which downloads what the current filter
  and search show: Nombre, Estado, Correo, Teléfono, Desde.

## What every option keeps

- P03's page, rail, title, subtitle («5 clientas · 3 con plan activo · 2
  fundadoras»: closed accounts are not counted), search and the five chips
  as they are. Rows of live Clients open the ficha as today.
- A former Client has no ficha: her row never opens anything.
- **Dejar de enviar** confirms first, with AW35's dialog: «¿Dejar de enviar
  promociones a Andrea Salinas?», «Borramos su nombre, correo y teléfono de
  esta lista. Usa esto cuando la persona te pida que paremos.», «Esta acción
  no se puede deshacer.», buttons «Cancelar» and «Borrar contacto». After it:
  «Borramos el contacto de Andrea Salinas.»
- The CSV: `Nombre, Estado, Correo, Teléfono, Desde`. Estado is the row's
  pill («Activo», «Expirado», «Sin plan», «Cuenta cerrada»); Desde is when a
  Client joined, or when a former Client asked to keep hearing from the
  studio, «dd/mm/aaaa». The file is named after the filter, for example
  `clientas-con-plan-2026-11-17.csv`; exporting is audited as AW35's was.
- Empty «Cuenta cerrada»: «Nadie cerró su cuenta pidiendo seguir recibiendo
  promociones.»
- Both roles that see Clientas (Administración, Coordinación) see the chip,
  the action and the export, as both saw AW35.

## The canvas

`Main.dc.html` states the three options (A recommended). Each option has a
clickable board at 1440 and one at 420. A dark strip at the top of each
board is the prototype's control and not part of the design; its chips jump
to «Todas», «Cuenta cerrada», «Dejar de enviar», «Exportar» and «Cuenta
cerrada vacía»; the page's own chips and buttons work too.

1. **A · Un filtro más** (recommended). «Cuenta cerrada» is the sixth chip,
   drawn like the others. «Exportar CSV» is a secondary button in the title
   row. With «Cuenta cerrada» chosen, one line under the chips explains the
   list and the table shows only what a former Client has: Nombre, Contacto,
   «Recibe promociones desde», the «Cuenta cerrada» pill and «Dejar de
   enviar». Exporting downloads at once and says so in a notice.
2. **B · Aparte, al final**. The five chips, a hairline, then «Cuenta
   cerrada» with its count. The table keeps P03's seven columns for every
   filter, «—» where a former Client has nothing, plus «Dejar de enviar» at
   the end of her row. «Exportar CSV · 5» sits at the right end of the
   filter row and counts what it will download.
3. **C · Con resumen antes de exportar**. Chips as A. «Cuenta cerrada»
   opens a short explanation card above a list of rows like «Para
   contactar», each with «Dejar de enviar». «Exportar CSV» opens a small
   dialog naming what will be downloaded (how many, the filter, the search,
   the columns) with **Descargar CSV**; at 420 it is a sheet.

At 420 the chips scroll sideways as P11 draws them; the export is a button
under the title (A, C) or under the list (B).

## Keep

P03's other tabs (Para contactar, Congelamientos), the ficha, P04's other
tabs; the brand, colours and type of 225.
