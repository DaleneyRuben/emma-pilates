# Follow-up — Fix the "toca para abrirla" caption on Mi agenda (Nutricionista)

Targets: **S15 (Mi agenda, Nutricionista)**. Send as a follow-up.

---

S15's frame is captioned "Toca una tarjeta para abrirla · interactivo", but tapping a card only moves its border to `#B78380`. There is no evaluation detail screen to open, in this surface or any other — `AW25` states the same thing from the admin side ("Filas sin clic: no son enlaces, no hay pantalla de detalle a la que ir desde acá"), and `booking/CONTEXT.md` models an Evaluation as an appointment only: client, nutritionist, time, kind. It records no notes, measurements or outcome, so there is nothing behind the card to show.

The behaviour is right; the caption oversells it. Change the frame caption from "Toca una tarjeta para abrirla · interactivo" to **"Toca una tarjeta para destacarla · interactivo"**, and add a note to the frame's notes grid, alongside "Raíz del rol" and "Agrupación por día":

> **Sin detalle** — La tarjeta se destaca al tocarla, para no perder el lugar al recorrer el día; no abre nada. Una evaluación registra la cita, no su contenido, así que no hay pantalla detrás.

Nothing else on S15 changes — the day grouping, the "Hoy"/"Mañana" labels, the hour-first card hierarchy, the selection highlight itself, the empty state and the header path to `S16` all stay as they are.
