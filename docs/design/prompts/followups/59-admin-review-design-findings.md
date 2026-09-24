# Follow-up — Design findings from the 2026-09-24 admin web review

Targets: **Sistema de Diseño (Prompt 00)**, **AW03 (Formulario de sesión)**,
**AW16 (Reporte de ingresos y gastos)**, **AW22 (Detalle de cliente)**,
**AW23 (Personal)**, **AW28 (Pagos)**, **AW29 (Revisar pago)**, and the
still-pending [49](./49-supply-form-archive.md), [51](./51-report-salary-all-branches.md),
and [58](./58-report-controls.md), which this follow-up corrects (a sent
follow-up is never edited). Send [30](./30-invariants-checklist.md) alongside,
with the corrections carried by [31](./31-plan-naming-leftovers.md),
[40](./40-cancellation-window-wording.md), and [48](./48-insumos-record-restock.md) §6.

---

WEB-011 reviewed the built admin web against the design system, the prompts,
and the glossaries. The code deviations were fixed in the app; the points
below are the design's own, or contradictions between prompts, and need the
design session. Apply only the changes below.

## 1. `Sistema de Diseño` — Contrast of the two quiet text tones

Texto tenue `#8A807C` on Blanco is about 3.9:1 and Texto muy tenue `#A79E9A`
about 2.6:1; WCAG AA asks 4.5:1 for text below 24 px (3:1 for large text).
The design system uses them for subtitles, labels, helper text, placeholders,
meta lines, and footnotes at 10.5–13 px, so most of the admin web's secondary
copy fails.

- Darken both tokens until they pass on Blanco and on Superficie sutil
  (table headers), keeping the palette closed: propose the two new values
  in the palette table and use them everywhere the old ones appear.
- The focus ring `0 0 0 3px rgba(183,131,128,0.15)` is invisible on a solid
  Palo de rosa button (the same hue at 15 %). Give solid buttons a visible
  focus state: a 2 px Blanco inset ring plus the outer ring, or the ring in
  Plomo cálido at a higher alpha, drawn on the primary button in the Buttons
  section and on `AW03`'s **Guardar**.

## 2. `AW28`/`AW29` — «Pendiente» as a Payment state

`booking/CONTEXT.md` (Payment) lists «pendiente / completado» among the
avoided UI labels for pending / confirmed, yet `AW28`'s Estado filter and
pills read «Pendiente», and the built app follows the prompt. Whether the
glossary's avoided term or the prompts change is an **open question for the
product owner**, recorded in WEB-011; do not change the label in this
export. Note it in the frames so the next decision finds it.

## 3. `Sistema de Diseño` — List pages do not sort

The list-pages convention says «dense data table with sortable columns». No
admin list sorts by column: the backend allowlists filters only and orders
each list itself (ADR-0061/0062), and the built tables draw no sort
affordance. Replace «sortable columns» with «a fixed order and one
allowlisted filter», so the convention describes the built lists.

## 4. `AW23` — No name search

`AW23` draws a «Buscar por nombre» field. The app has no staff name search
(WEB-004: the backend has none and the Role filter covers a handful of
people). Remove the field and keep the **Rol** filter as the only filter.

## 5. Checklist 30 §5 — Reporte

Point 5 lists the sidebar without **Reporte**, which `AW02` and the design
system order between Back Office and Promociones and every built screen
draws (WEB-001's open question). Carry the correction: the sidebar reads
Horario · Catálogo · Back Office · **Reporte** · Promociones; 30 is not
edited.

## 6. `AW03` — «Entrenador» beside feminine copy

The field is labelled **Entrenador** while its helper and choices are
feminine («Solo entrenadoras asignadas a esta sucursal», «Elige una
entrenadora», «Si cambias de entrenadora…»). Label the field **Entrenadora**
on `AW03` and in the design system's sample forms, matching the feminine
register the other screens use for staff and Clients.

## 7. `AW16` — Where the single-Branch caption sits

Follow-up 51 puts «La nómina y los ingresos por transferencia se ven solo en
«Todas las sucursales»» **under** the stat tiles; follow-up 58 §2 says
**above** the figures. The built page draws it above the figures, under
the header. Keep 58's placement and note that 51 §2 is superseded on this
point only.

## 8. Follow-up 49 — Dialog buttons

Follow-up 49's confirmation offers «Cancelar» (secondary) and «Archivar»
(destructive). Follow-ups 53 and 55 settled the convention for every
confirmation: **Volver** (compact neutral) and the acting button (Error
outline, or Palo de rosa fill for a non-destructive irreversible action).
Draw 49's dialog as **Volver** / **Archivar** (Error outline).

## 9. `AW22` — A deactivated Client Account

`AW22` draws active and pending Accounts (follow-up 54 §2) but no
deactivated one. The built panel shows a neutral pill «Cuenta desactivada»
under «Cliente desde…» for an Account that was switched off. Add that state
to the panel: the neutral pill, no box, everything else read-only as drawn.

## 10. `AW16` — The 32 px figure

The three stat figures are Lora 32 px. The type scale has no such step
(Título 1 is 30, Display 44, the admin page title 27). Either add a
«Cifra» step (Lora 500 · 32/1.2 · tabular) to the scale in the design
system, or draw the figures at Título 1 (30). Say which in the frame; the
app keeps 32 px until the export decides.

## Preserve everything else

Do not change the shell, the sidebar, the Branch selector, the closed
palette beyond the two tones in §1, follow-ups 53–58 elsewhere, or any
screen not named in Targets.
