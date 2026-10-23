# Prompt AW36 — Reglas del estudio

Admin desktop web. Reached from the **account menu** (AW33) through its
«Reglas del estudio» row (follow-up
[130](../followups/130-aw33-studio-rules-entry.md)); it has no sidebar entry
of its own. Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Written by BKM-004 on 2026-10-23. The studio's rules used to be written into
the code: the 2 h 30 Cancellation Window alone appeared six times, and the
apps carried prices like «Paquetes desde Bs 560». ADR-0101 moves them into
one versioned **Studio Settings** record. The owner's decisions call a few of
them configurable from the web (the Minimum Bookings, the tax rate, the
Coordinator's renewal targets, and the Opening Date); the rest change only
with a release. This page lets the Administrator change the first group and
see the second, and every save is a new version with an audit record of the
old and new value.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Reglas del estudio** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen.

**Sidebar state:** no sidebar item is active (the page belongs to the account
menu). The browser address reads `admin.emmapilates.bo/reglas-del-estudio`.
The Branch selector shows AW34's studio-wide note: «Esta página no se filtra
por sucursal — las reglas son del estudio, no de una sede.»

## Layout, top to bottom

1. Title «Reglas del estudio» (Lora 27, as AW21) and the subtitle «Las reglas
   que siguen las apps y el sistema. Un cambio llega a las apps en un minuto,
   sin actualizarlas.» No button in the title row.
2. A white card (12 px radius, 1 px Borde, 24 px padding) titled «Puedes
   cambiar» (Lora 22) with, under it in Texto tenue 11.5 px, «Versión 3 ·
   guardada el 23/10/2026 por María Fernanda Loza» («Versión 1 · valores
   iniciales» before anyone saved). Inside, the design system's form fields
   (44 px controls, label above, helper below):
   - A two-column row: «Mínimo de reservas por clase» (value 2, helper «Una
     clase con menos reservas se cancela sola 3 h antes de empezar.») and
     «Impuestos sobre las ventas (%)» (value 16, helper «La parte de cada
     venta que se separa para impuestos.»).
   - A group titled «Meta de renovación de la coordinadora» (14 px medium)
     with three fields in one row: «Meses 1 a 6 (%)» 80, «Meses 7 a 12 (%)»
     85, «Desde el mes 13 (%)» 90, and under them «Los meses se cuentan desde
     la fecha de apertura.» in Texto tenue.
   - «Fecha de apertura», a date field half the card's width, empty, helper
     «Déjala vacía hasta conocerla. Antes de esa fecha, las clientas pueden
     comprar con inicio el día de la apertura.»
   - The primary button «Guardar cambios» (46 px, left-aligned).
3. A second white card «Reglas fijas» (Lora 22) with the note «Solo cambian
   con una actualización del sistema.» and a definition list, one row each,
   label in Texto secundario on the left and value in Texto on the right,
   rows divided by 1 px Divisor:
   - Ventana de cancelación — «2 h 30 antes de cada clase»
   - Revisión del mínimo de reservas — «3 h antes de cada clase»
   - Fecha de inicio de un plan — «Hasta 14 días después de la compra»
   - Membresía fundadora — «40 lugares · 15 % de descuento · se pierde con
     más de 7 días sin plan»
   - Invita a una amiga — «1 clase de invitada por persona · 1 invitación al
     mes · +1 clase cuando la amiga compra»
   - Evaluación nutricional pagada — «Bs 70,00 · Bs 50,00 para la
     nutricionista»

## Frames

1. **Escritorio · 1440 px** — the page as above.
2. **Escritorio · Guardado** — after a save: AW21's Éxito result line above
   the first card, «Guardamos las reglas del estudio.»; «Mínimo de reservas
   por clase» reads 3, «Fecha de apertura» 01/12/2026, and the version line
   «Versión 4 · guardada el 23/10/2026 por María Fernanda Loza».
3. **Escritorio · Valores fuera de rango** — «Mínimo de reservas por clase»
   0 and «Impuestos sobre las ventas (%)» 120, each with its Error border and
   message under it: «Entre 1 y 20 reservas.» and «Un porcentaje entre 0 y
   100.»; nothing is sent.
4. **Escritorio · Otra persona guardó antes** — an Advertencia-tinted line
   above the first card: «Alguien guardó otras reglas mientras editabas. Te
   mostramos las actuales: revisa y vuelve a guardar.»; the form shows the
   newer version's values.
5. **Navegador angosto · 420 px** — AW21's narrow shell; every field takes
   the full width, one per row (the three renewal targets stack), «Guardar
   cambios» is full-width, and each «Reglas fijas» row stacks its value under
   its label.

## Behaviour notes for the handoff

- «Guardar cambios» sends the form together with the version it was read
  from. A save over a newer version is refused and the page reloads the
  current values (frame 4), so two people never overwrite each other.
- Saving without a change writes no version.
- Only the Administrator opens this page; another Role sees AW21's «No tienes
  permiso para ver esta sección.» card instead of the form.
- The apps read the Cancellation Window and the «Paquetes desde» price (the
  cheapest visible Plan) from the same record through a public read the API
  caches for a minute (follow-up 131).

## Keep consistent

The shell, sidebar, Branch selector, and user menu exactly as AW21; the closed
palette; AW05's form-field conventions; AW21's result lines and permission
card. Touch no other screen (AW33's entry row is follow-up 130).
