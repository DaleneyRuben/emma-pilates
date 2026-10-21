# Follow-up — The recovery state for the admin web («Algo salió mal»)

Targets: **generated handoff `design/README.md`** (a «### Recovery state»
subsection in «Admin web — shell», after «### Side-panel form convention»).
No numbered screen changes. Send [30](./30-invariants-checklist.md) alongside
this follow-up.

---

Written by WEB-032 on 2026-10-21. The admin web has no state for a failure of
a page itself. Every page already answers a failed read with the white card
«No pudimos cargar …» and a «Reintentar» neutral button (README «Admin web —
shell»), and the startup probe has its own full-viewport «No pudimos conectar
con el servidor» page; but a defect that throws while a page draws lands on
that startup page, which blames the connection and hides the sidebar. WEB-032
adds an error boundary around the content area that catches the throw and
shows a recovery state in its place, on every page. No prompt draws such a
state, so this follow-up proposes it, as follow-up
[89](./89-recovery-screen.md) does for the Client and Staff apps; the admin
web is built from the copy below, and the export is a design-accuracy change
only.

## 1. The state

The recovery state replaces only the content area of the page that failed.
The sidebar, the top bar with the Branch selector and the account cell, and
the «Saltar al contenido» link stay where they were; «Reintentar» draws the
failed page again from scratch (its reads run again from what is cached).
Moving to another page through the sidebar leaves the state behind.

It is the plain empty state with an action, drawn directly on the main area's
Superficie `#FAF7F2`, centred horizontally, with no card, no box, and no icon
(no line icon in the set means «error», and a decorative one would compete
with the title):

- **Title:** «Algo salió mal», Lora 22 weight 400 `#4A4A4A`, centred, the
  page's only `h1`.
- **Note:** «No pudimos mostrar esta página. Inténtalo de nuevo; si vuelve a
  pasar, recarga la página.», Work Sans 15/24 `#766D69`, centred, up to
  360 px wide, 8 px under the title.
- **Action:** «Reintentar», the large 46 px primary button (Palo de rosa
  `#B78380`, white label), at least 220 px wide, 16 px under the note.

The block sits 64 px under the top of the main area at 1440 px and 40 px at
420 px, where the note wraps to three lines and the button keeps its width.
The copy follows the admin web's tone («No pudimos cargar las sucursales.
Inténtalo de nuevo.», «Revisa tu conexión e inténtalo de nuevo.»): tú, no
apology, no technical detail, no error code. Nothing else is shown: no
«Volver» (the sidebar still works), no «Reportar», no second line about what
went wrong.

The startup page «No pudimos conectar con el servidor» is unchanged and keeps
its one job: the session probe could not reach the backend, so neither the
sidebar nor any page can be drawn.

## 2. README — «Recovery state»

After «### Side-panel form convention», add:

> ### Recovery state
>
> - When a page fails while drawing, the main area shows the plain empty
>   state in its place, directly on Superficie with no card and no icon:
>   «Algo salió mal» in Lora 22, the 15px `#766D69` note «No pudimos mostrar
>   esta página. Inténtalo de nuevo; si vuelve a pasar, recarga la página.»
>   up to 360px wide, and the large «Reintentar» primary button at least
>   220px wide, centred. It replaces only the content area (the sidebar and
>   the top bar stay) and «Reintentar» draws the page again; the sidebar
>   still moves to any other page. The startup page «No pudimos conectar con
>   el servidor» stays for the session probe alone.

## What must remain untouched

Every numbered screen; the «No pudimos cargar …» card and the startup page;
the primary button; every other README section and every card of the design
system.
