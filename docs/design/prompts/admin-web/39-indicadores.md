# Prompt AW39 — Indicadores

Admin desktop web. A new sidebar entry, **Indicadores**, immediately after
**Reporte**. Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt, and read
[204](../followups/204-sidebar-indicadores.md) for the sidebar itself.

---

Written by STU-003 on 2026-10-23 from the diagnosis's section 3.2, the
decisions' section 7, and ADR-0103. The month is a Bolivia calendar month.
The counts come from studio facts. The money figures are the revenue report
the Administrator already has. The Coordinator sees the counts and never an
amount. The Coordinator role is not wired yet (IDN-009); until it is, a
response with no centavo keys hides the money tiles.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Indicadores** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen.

**Sidebar state:** **Indicadores** is active. The browser address reads
`admin.emmapilates.bo/reporte/indicadores`. The Branch selector shows AW34's
studio-wide note: «Esta página no se filtra por sucursal — los indicadores
del mes son del estudio, no de una sede.»

## Layout, top to bottom

1. Title «Indicadores» (Lora 27) and the subtitle «Asistencia, ocupación y
   clientas del mes». At the right, the month stepper of AW16's Finanzas
   section, starting on the current Bolivia month. A later month is disabled.
2. Four count tiles, side by side on the desktop and stacked at 420 px, in
   the same white card as AW16's figures (12 px radius, 1 px Borde):
   - **Ocupación** — «59 %».
   - **Alumnas por clase** — «6,5».
   - **Clientas activas** — «2».
   - **Renovación** — «50 %».
3. Three money tiles, only on the Administrator frame, in the same card:
   - **Cobrado** — «Bs 300,00».
   - **Devengado** — «Bs 120,00».
   - **Diferido** — «Bs 270,00».
4. A bar chart titled «Clases dictadas», three bars for the selected month
   and the two before it, in Palo de rosa. The month names are short
   («Ago», «Sep», «Oct»). No gradient, no value on every bar. The bars are
   the count of classes held, never an amount.

While the month is loading, the main area shows «Cargando los indicadores…».
When the read fails, it shows «No pudimos cargar los indicadores.» and a
«Reintentar» button. When the selected month held no classes, the chart is
absent and the page says «Sin clases dictadas en este mes.»

## Frames

1. **Escritorio · 1440 px · Administradora** — the page as above, with the
   three money tiles and the chart. **Indicadores** is active.
2. **Escritorio · Coordinadora** — the same four count tiles and the same
   chart. No money tiles, no «Bs», no centavos. **Indicadores** is active.
   The Coordinator role does not exist in the product yet (IDN-009); this
   frame is the counts-only response, not a new role chrome.
3. **Móvil · 420 px** — the tiles stack. The sidebar is behind «Abrir menú».
   The money tiles stay, because this frame is the Administrator.
4. **Escritorio · Sin clases** — the four count tiles stay at zero where the
   month has no classes, the chart is gone, and the note «Sin clases
   dictadas en este mes.» replaces it.
5. **Escritorio · Error** — the title and the month stepper stay. The tiles
   and the chart are replaced by «No pudimos cargar los indicadores.» and
   «Reintentar».

## What stays untouched

Every other sidebar entry, in the order follow-up 204 states. AW16, its
figures, and its own chart. No recommendation, no projection, and no amount
on the Coordinator frame.
