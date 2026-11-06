# Follow-up — Verification findings 42–46: month on the start strip, sign out and close account, PDF invoice, short auth screens (proposals)

Targets: **C09 Detalle del plan** (renewal) and **S10 Registrar pago** (the
shared «Fecha de inicio» strip), **C18 Perfil**, **C22 Editar perfil** and
**S23 Perfil** (Staff), the Client's invoice detail (K2/K3, follow-up on
FIX-044) and the Staff's invoice of a payment (E5), and the short
authentication screens **C01c Revisa tu correo**, **C20b**, **C21b**,
**C21c** and their Staff twins **S18**/**S19**, as proposals only, on a
canvas of their own exported to `design/v2/propuestas-verificacion/`. Read
with [225](./225-visual-system-v2.md), [252](./252-second-walkthrough-chosen-proposals.md)
and [254](./254-paso9-approved-options.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: follow-up 256 records what the owner chose.

---

Written on 2026-11-06 for DES-014 (verification of the second walkthrough,
findings 42–46).

## Why

- **n.º 42.** The next plan's strip runs from the day after the current end
  through 28 days later (booking ADR-0013), so it crosses months (6 Dec …
  2 Jan). Each day shows only the weekday and the number; nobody can tell
  which month a day belongs to until the line below names the chosen one.
- **n.º 43.** On C18, «Cerrar mi cuenta» is red loose text right under
  «Cerrar sesión». It only opens C24, which asks for the password, but the
  owner fears a wrong tap. It needs less weight.
- **n.º 44.** «Cerrar sesión» looks different in each app: Staff draws the
  Error last row (follow-up 225), the Client app a neutral row. Both open
  the same «¿Cerrar sesión?» sheet. Unify, together with n.º 43.
- **n.º 45.** An invoice uploaded as a PDF shows a generic icon and the
  file name on an empty white card; a photo shows the invoice. The owner:
  show the first page and open the whole PDF inside the app, with Descargar
  and Compartir. The Staff app today says «El PDF se abre desde la web de
  administración»; the admin web opens it in the browser.
- **n.º 46.** The app draws «Revisa tu correo» with everything in the top
  third. The C01c board already centres the text and keeps the buttons at
  the bottom, like C11 «Tu pago está en revisión»; the other short auth
  screens share the layout.

## The canvas

`Main.dc.html` (1440 wide) with one section per finding, three cards each
(A recommended), each card linking to clickable 390 × 844 boards, and a
«Hoy» board per finding. A rose band at the top of each board explains it
and is not part of the design.

1. **Strip (F-…)**: A · the month under each day number («dom · 6 · dic»),
   chips 72 high. B · the days as today, with a vertical «DICIEMBRE» /
   «ENERO» label at the start of the strip and where the month changes.
   C · the visible month(s) at the right of the section title («Diciembre
   2026», «Diciembre – enero») and «ene» under the 1st. Two boards each: on
   opening, and scrolled to 2 January.
2. **Sign out and close account (P-…)**: A · «Cerrar sesión» the neutral
   last row of Cuenta in both apps; «Cerrar mi cuenta» leaves Perfil for
   the end of C22 Editar perfil, muted and underlined, with «Borra tus datos
   y deja de recibir avisos. Te pediremos tu contraseña.» B · «Cerrar
   sesión» an outlined button under the groups in both apps; «Cerrar mi
   cuenta» a neutral chevron row in Cuenta. C · the Staff's Error row in
   both apps; «Cerrar mi cuenta» a small muted link beside the version.
   All keep the «¿Cerrar sesión?» sheet and C24 as they are.
3. **PDF invoice (V-…)**: A · the first page as a large thumbnail, like a
   photo, with a «Ver · 2 páginas» pill; tapping opens a dark full-screen
   viewer (✕, «Factura · 1 de 2», pages stacked, pinch to zoom, «Compartir»
   and «Descargar» at the bottom); the Staff app gets the thumbnail and the
   same viewer. B · an attachment row (small thumbnail, «PDF · 2 páginas»,
   «Ver factura») opening the viewer in a sheet with Compartir in its
   header. C · every page inline at full width with Compartir and Descargar
   in the footer, the details last. The admin web keeps the browser's own
   PDF view.
4. **Short auth screens (R-…)**: A · the text block centred, the buttons at
   the bottom (C01c and C11 as drawn). B · icon, text and buttons centred
   together. C · the «Emma Pilates Studio» wordmark on top, the text
   centred, the buttons at the bottom. Shown on «Revisa tu correo» and
   «Este enlace ya no es válido».

Untouched: copy, the v2 tokens, every other row of Perfil, C24's password
step, the brand «Emma Pilates Studio» without tagline.
