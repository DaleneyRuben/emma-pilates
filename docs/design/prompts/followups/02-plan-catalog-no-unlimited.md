# Follow-up — Remove unlimited plans and the 15-day pass from the Plan catalog

Targets: **AW04 (Planes)**, **08 (Elige tu plan)**, **S09 (Elige un plan, Asistente)**. Send as a follow-up — don't restate Prompt 00.

---

`booking/CONTEXT.md`'s Plan entry is explicit: every Plan grants a **fixed** class allowance (there is no unlimited Plan), and duration is always **1, 3, 6, or 12 months** (no other span, e.g. no 15-day pass). The generated screens drifted from this — AW04 has three "libre"/"ilimitadas" rows, and 08/S09 sell a 15-day single class and an "ilimitado" monthly plan. Fix all three to use one consistent, compliant catalog:

**AW04 — Planes table**, replace the three unlimited rows in place (same position, same Visibilidad):
- "Mensual libre" → **"Mensual 16 clases"**, drop the "Sin límite de reservas" sub-line, "Ilimitadas" → **"16 clases"**, price unchanged (Bs 1.050).
- "Semestral libre" → **"Semestral 90 clases"**, drop the "Incluye 1 evaluación nutricional" sub-line (Evaluations are free to any active subscriber regardless of Plan — this line is redundant and misleading), "Ilimitadas" → **"90 clases"**, price unchanged (Bs 5.400).
- "Anual libre" → **"Anual 180 clases"**, "Ilimitadas" → **"180 clases"**, price unchanged (Bs 9.600).

Do the same in AW04's narrow-browser (420px) card variant, which repeats these same rows.

**08 (client) and S09 (staff/assistant)** currently show a disjoint, non-compliant catalog ("Clase suelta · válida por 15 días", "Mensual ilimitado"). Replace their plan card lists with a subset of AW04's real catalog instead of inventing separate content — e.g. "Paquete de 8 clases · 8 clases · 1 mes · Bs 560", "Paquete de 12 clases · 12 clases · 1 mes · Bs 780", "Mensual 16 clases · 16 clases · 1 mes · Bs 1.050", "Trimestral 36 clases · 36 clases · 3 meses · Bs 2.100" — same names, durations, class counts and prices as AW04, so the catalog reads as one system across surfaces. Keep both existing frames (with/without Credit) on both screens, just with corrected card content.

Nothing else on any of these screens changes.
