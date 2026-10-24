# Prompt S26 — Reportar una falla (Entrenadora)

Staff app, Trainer role. Reached from the «Reportar una falla» link that [follow-up 171](../followups/171-s03-report-fault-entry.md) adds to the attendance list (Prompt S03), which the Trainer opens from her agenda (Prompt S02). The studio has numbered reformers, cadillacs, and mats; when one breaks during or before a class, the Trainer tells the studio here. An Administrator then sees the fault on the admin web's «Equipos» page (Prompt AW37) and resolves it ([ADR-0106](../../../adr/0106-log-equipment-faults.md), back-office glossary «Equipment» and «Equipment Issue»).

Written by BKO-004 on 2026-10-23. Send [30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same header-with-back-arrow pattern as the attendance list (Prompt S03), design the **Reportar una falla** screen of the staff app, as seen by a Trainer.

**Language:** all visible copy is neutral Spanish (Bolivia), informal «tú» address.

**Navigation chrome:** a back arrow that returns to S03, then the title «Reportar una falla» in Lora 27 px and, under it, the Session line in the Nota style: «Reformer Intermedio · Sucursal Equipetrol · 07:00 – 08:00». No tab bar.

**Layout, top to bottom:**

1. An eyebrow «¿Qué equipo?» (12 px uppercase 0.14em `#766D69`, as S24's group eyebrows).
2. The Branch's Equipment as wrapping chips, one per piece, grouped by kind with a small 13 px `#766D69` label above each group: the Session's own kind first («Reformers»), then the others («Cadillacs», «Mats»). Each chip reads the kind and number («Reformer 3»), 40 px tall, 1 px `#D8C9BB` border, radius full, 14 px `#4A4A4A` text on Blanco; the selected chip is filled Palo de rosa `#B78380` with white text. A piece already out of service keeps its chip but adds «· fuera de servicio» in 12 px `#B25D4B` after the name (it can still be chosen: a new fault on it is still news). Only one chip can be selected.
3. A multiline field «¿Qué pasó?» (the design system's text area, 4 lines, 500 characters at most) with the placeholder «Ej.: el resorte rojo se soltó».
4. A checkbox row «No se puede usar» with the helper «Márcalo si nadie debería usarlo hasta que lo arreglen.» in the Nota style. Unticked to start.
5. The sticky action zone (as S03's «Guardar asistencia»): primary button «Enviar reporte», disabled until a chip is chosen and the text holds something.

**Sent:** the form is replaced by the plain success state: a 40 px Éxito check, title «Gracias por avisar» in Lora 21 px, the line «Administración ya puede ver la falla de Reformer 3.» in the Nota style, and a primary button «Volver a la lista» that returns to S03.

**Refused:** when sending fails, an inline Error line above the button: «No pudimos enviar el reporte. Inténtalo de nuevo.»; the form keeps what she typed.

**Empty state** (the Branch has no Equipment registered): the bare empty state of the README's «Cards» section, title «Sin equipos registrados» in Lora 19 px and the line «Administración todavía no cargó los equipos de esta sucursal.».

**Loading and failure:** the branded loading state of section 08 while the list loads; «No pudimos cargar los equipos.» with «Reintentar» on failure.

Show these frames:

- **iOS · Elegir equipo** — Reformer Intermedio at Equipetrol: Reformers 1–8 (Reformer 5 marked «fuera de servicio»), Cadillacs 1–8, Mats 1–10; Reformer 3 selected, «¿Qué pasó?» filled with «El resorte rojo se soltó y la plataforma no frena.», «No se puede usar» ticked, the button enabled.
- **iOS · Enviado** — the success state for Reformer 3.
- **Android · Elegir equipo** — Mat Pilates at Urubó, nothing chosen yet, the button disabled; Mats first.
- **Tablet · Elegir equipo** — the iPad Pro 11 frame: the same content as the first frame centred in a 560 px column.
- **iOS · Sin equipos** — the empty state.

Generous whitespace, calm tone, consistent with S03. Fictional names and data only.
