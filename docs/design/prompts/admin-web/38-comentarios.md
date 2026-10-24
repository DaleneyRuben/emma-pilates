# Prompt AW38 — Comentarios

Admin desktop web. A new sidebar entry «Comentarios», alone in the last group
after Promociones (follow-up
[166](../followups/166-admin-comentarios-entry.md)). Same shell as Horario
(Prompt AW02). Send [30](../followups/30-invariants-checklist.md) alongside
this prompt.

---

Written by REL-012 on 2026-10-23. Clients and Staff send **Feedback** from
«Enviar comentarios» in either app (Prompts 25 and `S27`): a type (Problema,
Sugerencia, Otro), the text, and the app version, build, system, and Role
attached on their own. The Administrator reads it here, moves it from Nuevo to
Revisado or Resuelto, writes the internal note «Qué cambiamos», and exports
everything as CSV: Google's production questionnaire asks what the testers
said and what changed because of it.

**Language:** neutral Spanish (Bolivia), informal «tú».

**Sidebar state:** «Comentarios» active. The address reads
`admin.emmapilates.bo/comentarios`. The page is studio-wide: the Branch
selector shows AW34 frame 2's note «Esta página no se filtra por sucursal —
los comentarios llegan de las apps, no de una sede.»

## Layout, top to bottom

1. Title «Comentarios» (Lora 27, as AW28) and the subtitle «Desde las dos apps
   · 3 comentarios nuevos» («· ninguno nuevo» when there are none). On the
   right of the title row, the compact neutral outline button «Exportar CSV»
   with a 14 px download icon, as AW35. No primary button.
2. Two allowlisted filters side by side, AW28's «Estado» select convention:
   «ESTADO» (Todos, Nuevo, Revisado, Resuelto; Todos by default) and «APP»
   (Las dos, App de clientas, App del personal).
3. AW28's table, newest first. Columns: «Fecha» (`dd/mm/aaaa · hh:mm`,
   tabular), «Tipo» (Problema / Sugerencia / Otro, secondary text),
   «Comentario» (the text in 14 px medium, at most two lines then an
   ellipsis; it is the row's link into the panel), «App» (App de clientas /
   App del personal), «Versión» («1.0.1 (3) · Android 14», tabular), «Estado»
   (status pill: Nuevo on Advertencia, Revisado neutral, Resuelto on Éxito).
   The whole row opens the panel.
4. AW28's footer: «Mostrando 3 de 3 comentarios» and the pager.

Sample rows (fictional): «No puedo ver mis reservas de mañana en la lista.»
(Problema, App de clientas, 1.0.1 (3) · Android 14, Nuevo); «Sería útil ver la
lista de la clase siguiente.» (Sugerencia, App del personal, 1.0.1 (4) · iOS
18.2, Resuelto); «La foto de perfil tarda en cargar.» (Problema, App de
clientas, 1.0.1 (3) · iOS 18.2, Revisado).

## The panel «Comentario»

The design system's 408 px side panel. Title «Comentario», description
«Problema · App de clientas». Body, top to bottom:

- the full text in a Blanco box with the divider border, 15 px, line breaks
  kept;
- AW29's read-only summary block «DATOS»: Fecha, App, Rol (Clienta,
  Entrenador, Asistente, Nutricionista, Administrador), Correo (the sender's
  login email), Versión («1.0.1 (3)»), Sistema («Android 14»);
- «ESTADO»: three chips in a row (AW24's chip convention), Nuevo, Revisado,
  Resuelto;
- the field «Qué cambiamos», a 4-line textarea with the placeholder «Ej.:
  Arreglamos la lista de reservas en la versión 1.0.2.» and the help «Nota
  interna: la clienta o el equipo no la ven. Va en el CSV.»

Footer: the primary «Guardar». Saving closes the panel and shows the Éxito
line «Guardamos el comentario.» above the table.

## Frames

1. **Escritorio · 1440 px** — the list as above, filters on Todos / Las dos.
2. **Escritorio · Panel** — the first row's panel open over the dimmed list,
   «Resuelto» chosen and a note typed.
3. **Escritorio · Guardado** — the list with «Guardamos el comentario.» and
   that row now «Resuelto».
4. **Escritorio · Sin comentarios** — AW28's empty card: «Todavía no hay
   comentarios.» and the note «Llegan desde «Enviar comentarios», en el
   Perfil de las dos apps.»; «Exportar CSV» disabled. With a filter on, the
   first line reads «Ningún comentario con estos filtros.»
5. **Navegador angosto · 420 px** — AW28's narrow shell: stacked cards (the
   text, then «Fecha · Tipo · App», then the version and the pill); the panel
   becomes the full-screen sheet; «Exportar CSV» full width under the
   subtitle.

## Behaviour notes for the handoff

- «Exportar CSV» downloads every comment, not just the page, as
  `comentarios-aaaa-mm-dd.csv` with the columns Fecha, App, Tipo, Comentario,
  Versión, Estado, Qué cambiamos. The export is recorded in the audit log. A
  failed export shows «No pudimos exportar los comentarios. Inténtalo de
  nuevo.» above the table.
- A failed save keeps the panel open with «No pudimos guardar. Inténtalo de
  nuevo.» above the footer.
- Only the Administrator sees this page; every other Role gets the shell's
  «Sin acceso» state.

## Keep consistent

The shell, sidebar, Branch selector, and user menu exactly as AW28; the table,
filter, empty, side-panel, and pill conventions of AW28/AW29; the closed
palette. Touch no other screen (the sidebar entry is follow-up 166).
