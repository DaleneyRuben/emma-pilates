# Prompt AW37 — Simulador

Admin desktop web. A new sidebar entry, **Simulador**, after **Reporte** and
before **Promociones**. Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt, and read
[202](../followups/202-sidebar-simulador.md) for the sidebar itself.

---

Written by STU-004 on 2026-10-23 from the diagnosis's section 3.4, the Studio
Management glossary, and ADR-0103. The diagnosis asks for a what-if screen
with an immediate result and no save. This first page edits five numbers and
shows the month's result and the break-even with the derivation the shared
package returns. Plan prices, occupancy as a percent, the plan mix, and the
fixed-cost lines one by one are later items.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Simulador** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen.

**Sidebar state:** **Simulador** is active. The browser address reads
`admin.emmapilates.bo/simulador`. The Branch selector shows AW34's
studio-wide note: «Esta página no se filtra por sucursal — el simulador no
lee una sede.» Only the Administrator sees the entry and the page. Another
role sees the refusal of the other money pages, «No tienes permiso para ver
esta sección.», and no fields. The Coordinator role is not wired yet
(IDN-009); until it is, the page hides from every role that is not the
Administrator.

## Layout, top to bottom

1. Title «Simulador» (Lora 27) and the subtitle «Prueba un mes con otros
   números. Nada se guarda: es un cálculo de este momento.» No button in the
   title row: there is nothing to save.
2. A white card (12 px radius, 1 px Borde, 24 px padding) with the design
   system's fields (44 px controls, label above), two columns on the desktop
   and one at 420 px:
   - «Clases por semana», value 33.
   - «Alumnas por clase», value 4.
   - «Precio por clase (Bs)», value 65.
   - «Costos fijos (Bs)», value 21175.
   - «Impuestos (%)», value 16.
3. Two figures, as AW16's Finanzas figures (follow-up 201), side by side on
   the desktop and stacked at 420 px:
   - **Resultado** (Éxito when it is not negative, Error when it is). With
     the opening values it reads «Bs 761,20». The line under it is «143
     clases · ingreso Bs 37.180,00».
   - **Punto de equilibrio** (Plomo cálido). It reads «Bs 36.273,81». The
     line is «Ingreso en caja que cubre los costos fijos, el pago a
     instructoras y el impuesto».
4. Under the figures, in Texto tenue and tabular figures, the derivation the
   package returns for the numbers on screen: «(21175 + 9295) / 0.84 =
   36273.81». Changing any field recalculates at once. A value that is not a
   whole number, or a tax of 100 or more, replaces the figures with «Escribe
   números enteros. El impuesto tiene que ser menor que 100.»

A month is the weekly schedule times 4.33, rounded. Trainer pay is the only
variable cost: the classes in the month times the price per class. The
package's own check uses variable costs of Bs 9.290 and derives
«(21175 + 9290) / 0.84 = 36267.86»; 143 classes at Bs 65 come to Bs 9.295,
so the page's derivation differs by those Bs 5. Do not invent a second line
to force the package's string onto the screen.

## Frames

1. **Escritorio · 1440 px** — the page as above, **Simulador** active.
2. **Escritorio · Impuesto más alto** — «Impuestos (%)» reads 20 and **Punto
   de equilibrio** reads «Bs 38.087,50», higher than the opening figure.
3. **Móvil · 420 px** — the fields and the two figures stack. The sidebar is
   behind «Abrir menú».
4. **Escritorio · Sin permiso** — the title stays and the card is replaced
   by «No tienes permiso para ver esta sección.» The sidebar does not list
   **Simulador**.

## What stays untouched

Every other sidebar entry, in the order follow-up 202 states. AW16, its
Reporte and Finanzas tabs, and the Branch selector's behaviour on every
other page. No save button, no month stepper, and no server call for the
calculation.
