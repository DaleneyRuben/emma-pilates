# Prompt AW40 — Recomendaciones

Admin desktop web. A new sidebar entry, **Recomendaciones**, immediately
after **Indicadores**. Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt, and read
[205](../followups/205-sidebar-recomendaciones.md) for the sidebar itself.

---

Written by STU-006 on 2026-10-23 from the diagnosis's section 3.5 and the
decisions' section 7 and section 13. The month is a Bolivia calendar month.
The findings come from studio facts. v1 ships two rules: a weak schedule
and an inactive client. Neither names a Client. The subject is an id the
page does not resolve. Amounts never appear: the rules that mention money
are not in v1. The Coordinator sees the same list and no «Descartar». The
Coordinator role is not wired yet (IDN-009); until it is, a read-only prop
hides the button.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Recomendaciones** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen.

**Sidebar state:** **Recomendaciones** is active. The browser address reads
`admin.emmapilates.bo/recomendaciones`. The Branch selector shows AW34's
studio-wide note: «Esta página no se filtra por sucursal — las
recomendaciones del mes son del estudio, no de una sede.»

## Layout, top to bottom

1. Title «Recomendaciones» (Lora 27) and the subtitle «Hallazgos del mes a
   partir de los hechos del estudio». At the right, the month stepper of
   AW16's Finanzas section, starting on the current Bolivia month. A later
   month is disabled.
2. A list of findings, each a white card (12 px radius, 1 px Borde). The
   card shows the Spanish sentence and the state «Nueva», «Vista»,
   «Descartada», or «Resuelta». It does not show a name. Sample sentences:
   - «Revisa el horario del martes: promedia 1,7 alumnas.»
   - «Contacta a la clienta: tiene un plan vigente y no reservó este mes.»
3. On the Administrator frame, a «Descartar» button on a finding that is
   not already discarded. The Coordinator frame has no button.

While the month is loading, the main area shows «Cargando las
recomendaciones…». When the read fails, it shows «No pudimos cargar las
recomendaciones.» and a «Reintentar» button. When the month has no
findings, the list is absent and the page says «Nada que revisar este mes.»

## Frames

1. **Escritorio · 1440 px · Administradora** — two findings, both «Nueva»,
   each with «Descartar». **Recomendaciones** is active.
2. **Escritorio · Coordinadora** — the same two sentences and the same
   states. No «Descartar». No amount, no «Bs». The Coordinator role does
   not exist in the product yet (IDN-009); this frame is the read-only
   list, not a new role chrome.
3. **Móvil · 420 px** — the cards stack. The sidebar is behind «Abrir menú».
   «Descartar» stays, because this frame is the Administrator.
4. **Escritorio · Vacío** — the title and the month stepper stay. The list
   is replaced by «Nada que revisar este mes.»
5. **Escritorio · Error** — the title and the month stepper stay. The list
   is replaced by «No pudimos cargar las recomendaciones.» and «Reintentar».

## What stays untouched

Every other sidebar entry, in the order follow-up 205 states. AW39, its
tiles, and its chart. No amount, no Client name, and no projection.
