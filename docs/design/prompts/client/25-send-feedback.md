# Prompt 25 — Enviar comentarios

Client mobile app. Reached from Perfil (Prompt 18) through a new
«Enviar comentarios» row (follow-up
[165](../followups/165-perfil-feedback-row.md)); returns to Perfil. The Staff
app has the same screen as `S27` ([staff/27](../staff/27-send-feedback.md)):
both apps draw it from one shared component, so keep the two identical except
for the platform chrome. Send [30](../followups/30-invariants-checklist.md)
alongside this prompt.

---

Written by REL-012 on 2026-10-23. Google asks, before a Play app leaves the
closed test, what the testers said and what changed because of it. Testers
and, later, Clients need one plain way to say «esto falló» or «esto
mejoraría»; the studio reads it on the admin web («Comentarios», `AW38`).
The glossary term is **Feedback** (system-identity `CONTEXT.md`); never
«ticket» or «reseña».

Using the Emma Pilates Studio design system (Prompt 00) and consistent with
Cambiar contraseña (Prompt 23), design the **Enviar comentarios** screen.

**Language:** neutral Spanish (Bolivia), informal «tú».

**Navigation chrome:** the child-screen header of Prompt 23: back arrow to
Perfil, title «Enviar comentarios». No tab bar.

## Layout, top to bottom

1. A body line: «Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de
   Emma Pilates.»
2. A field label «TIPO» (the 11 px uppercase field label of the design
   system) over three equal pill chips in one row: «Problema», «Sugerencia»,
   «Otro». Unselected: Blanco with the strong border and secondary text;
   selected: Palo de rosa tinte fill, Palo de rosa border, Palo de rosa
   profundo text in medium weight. None is selected at first.
3. A multi-line field «COMENTARIO», 160 pt tall, top-aligned, placeholder
   «Escribe aquí tu comentario». Under it, one row: «Mínimo 10 caracteres.»
   on the left and the live count «0 / 2000» on the right, both 13 px Texto
   tenue.
4. A flat card on Superficie (no shadow), 12 pt padding, 13 px secondary
   text: «Junto con tu comentario enviamos la versión de la app (1.0.1,
   compilación 3), el sistema (Android 14) y tu rol. No enviamos capturas de
   pantalla.» The values are the device's own.
5. The primary button «Enviar comentario», pinned above the bottom edge as in
   Prompt 23, disabled until a type is chosen and the text has at least 10
   characters.

## Frames

1. **iOS · Vacío** — nothing chosen, button disabled.
2. **iOS · Listo** — «Problema» chosen, a two-line comment typed («No puedo
   ver mis reservas de mañana en la lista.»), count «48 / 2000», button
   enabled.
3. **iOS · Límite del día** — the same, with an Error-tone line above the
   button: «Ya enviaste 10 comentarios hoy. Puedes enviar otro mañana.»
4. **iOS · Enviado** — the form is replaced by a centred thank-you: Lora 22
   «¡Gracias por tu comentario!», the body line «Lo recibió el equipo de Emma
   Pilates y lo vamos a revisar.», and a primary button «Volver al perfil».
5. **Android · Listo** — frame 2 with Android's header height and «Android
   14» in the card.
6. **iPad · Listo** — frame 2 on the iPad Pro 11-inch canvas, the form held
   to the client app's tablet column width, not stretched.

A failed send keeps the text and shows «No pudimos enviar tu comentario.
Inténtalo de nuevo.» in the same place as frame 3.

## Keep consistent

Prompt 23's header, field, and pinned-button conventions; the closed palette;
nothing else on Perfil changes here (the row is follow-up 165).
