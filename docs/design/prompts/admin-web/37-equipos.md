# Prompt AW37 — Equipos

Admin desktop web. A new sidebar entry «Equipos» in the Back Office group, right after «Insumos» ([follow-up 170](../followups/170-aw02-equipment-flags.md) draws it in the shell). Same shell as Horario (Prompt AW02). Send [30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Written by BKO-004 on 2026-10-23. The studio has 8 reformers, 8 cadillacs, and a mat area, and the owner wants faults recorded ([ADR-0106](../../../adr/0106-log-equipment-faults.md), back-office glossary «Equipment» and «Equipment Issue»). Each piece is registered here per Branch with its kind and number; mats are registered one per place. A Trainer reports a fault from the Staff app (Prompt S26); the Administrator sees it here, can also record one herself, and marks it resolved once fixed. A piece with an open fault marked «fuera de servicio» stops counting as working, and Horario (AW02) flags the Sessions with more places than working machines of their kind (follow-up 170).

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Equipos** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every admin screen.

**Sidebar state:** Back Office group, «Equipos» active. The browser address reads `admin.emmapilates.bo/back-office/equipos`. The page follows the selected Branch (AW34's selector in the top bar).

## Layout, top to bottom

1. Title «Equipos» (Lora 27, as AW08) and the subtitle «Sucursal Equipetrol · 26 equipos · 1 fuera de servicio». On the right of the title row, the primary button «Nuevo equipo» with a 16 px plus.
2. **Fallas** card (AW08's card treatment): a header row with the title «Fallas» (Lora 19) and, on its right, a two-option segmented control «Abiertas · Resueltas» (Abiertas selected). Under it, one row per fault, newest first:
   - the equipment name in 14 px medium («Reformer 5»);
   - the description in 14 px `#4A4A4A`, wrapping;
   - the line «Reportó Camila Rojas · 22/10/2026 08:10» in 12.5 px `#766D69`, tabular;
   - on the right, the pill «Fuera de servicio» (Error tint `rgba(178,93,75,0.10)` / `#B25D4B`) when it was marked so, otherwise the pill «Se puede usar» (Advertencia tint, as AW08's low-stock pill);
   - a quiet outline button «Marcar resuelta».
   With «Resueltas» selected, the rows lose the button and gain «Resuelta por Paola Suárez · 23/10/2026 10:40» under the reporter line; the pills stay. The «Abiertas» empty line, inside the card: «No hay fallas abiertas.» in Texto tenue.
3. **One section per kind**, in the order Reformers, Cadillacs, Mats, each a card with the heading «Reformers · 8» (Lora 19, the count in Texto tenue) and a dense table (AW08's density) with the columns «Equipo» («Reformer 1», 14 px medium), «Estado» (the Éxito pill «Funciona», the Error pill «Fuera de servicio», or the Advertencia pill «Con falla» when an open fault does not take it out of service), and a last narrow column with two quiet text actions «Registrar falla» and «Dar de baja». A kind with no Equipment shows its card with the line «Sin reformers registrados.» in Texto tenue.

Sample data (fictional): Reformers 1–8 at Equipetrol with Reformer 5 «Fuera de servicio» (fault «El resorte rojo se soltó y la plataforma no frena.», reported by Camila Rojas on 22/10/2026 08:10) and Reformer 2 «Con falla» («La correa del pie derecho está gastada.», reported by Emma Vargas, «Se puede usar»); Cadillacs 1–8 all «Funciona»; Mats 1–10 all «Funciona».

## Dialogs

AW09's dialog convention (scrim, 460 px dialog, Lora 21 title, footer buttons right-aligned):

- **Nuevo equipo** — «Tipo» as three chip radios «Reformer · Cadillac · Mat» (Reformer selected), «Número» as a small numeric input (1–99), the helper «Se mostrará como Reformer 9.» updating with the choice; buttons «Cancelar» and «Guardar». A taken number shows the field error «Ya hay un Reformer 3 en esta sucursal.».
- **Registrar falla · Reformer 3** — the text area «¿Qué pasó?» (500 characters) and the checkbox «No se puede usar» with the helper «Márcalo si nadie debería usarlo hasta que lo arreglen.»; buttons «Cancelar» and «Registrar».
- **¿Marcar resuelta la falla de Reformer 5?** — body «Reformer 5 vuelve a contar como disponible si no tiene otra falla abierta que lo deje fuera de servicio.»; buttons «Volver» and «Marcar resuelta» (primary).
- **¿Dar de baja Reformer 8?** — body «Deja de aparecer en la lista y de contar para las clases. Sus fallas quedan en el historial.»; buttons «Volver» and «Dar de baja» (Error outline).

After each action a Éxito result line above the Fallas card, as AW21's: «Agregamos Reformer 9.», «Registramos la falla de Reformer 3.», «Marcamos resuelta la falla de Reformer 5.», «Dimos de baja Reformer 8.».

## Frames

1. **Escritorio · 1440 px** — the page as above with «Abiertas» selected.
2. **Escritorio · Resueltas** — the Fallas card on «Resueltas» with two resolved faults.
3. **Nuevo equipo** — the dialog over frame 1, with the taken-number error drawn.
4. **Registrar falla** — the dialog over frame 1 for Reformer 3, filled and ticked.
5. **Marcar resuelta** — the confirmation over frame 1.
6. **Escritorio · Sin equipos** — AW08's empty card with the quiet icon: title «Todavía no hay equipos en esta sucursal.», note «Registra cada reformer, cadillac y mat con su número para llevar sus fallas.», and the «Nuevo equipo» button in the card.
7. **Navegador angosto · 420 px** — AW08's narrow shell; the fault rows and the tables become stacked cards (name and pill on the first line, then the description or the actions), «Nuevo equipo» full-width under the subtitle.

## Behaviour notes for the handoff

- Numbers are unique per Branch and kind among Equipment not retired; a retired number can be reused.
- «Dar de baja» is one-way, never a deletion: the Equipment and its faults stay in the database (ADR-0086).
- A resolved fault cannot be reopened; a new fault is a new row.
- Only an Administrator uses this page for now; the Coordinator Role (IDN-009) will resolve faults too.
