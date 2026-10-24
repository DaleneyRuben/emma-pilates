# Prompt S27 — Enviar comentarios (todos los roles)

Staff mobile app. Reached from Perfil (`S23`) through a new «Enviar
comentarios» row (follow-up [165](../followups/165-perfil-feedback-row.md));
returns to Perfil. Every Role sees it: Entrenadora, Asistente, Nutricionista,
and Administración. Send [30](../followups/30-invariants-checklist.md)
alongside this prompt.

---

Written by REL-012 on 2026-10-23. This is the Client app's Prompt 25
([client/25](../client/25-send-feedback.md)) in the Staff app: both apps draw
it from one shared component, so copy Prompt 25's layout, copy, chips,
counter, attached-details card, and thank-you exactly, with the Staff app's
child-screen header of `S19`/`S20` (back arrow to Perfil, title «Enviar
comentarios»). The card's sentence ends «… y tu rol.» for every Role; the
Role itself is attached by the server, never shown as a choice.

## Frames

1. **iOS · Listo · Entrenadora** — «Sugerencia» chosen, the comment «Sería
   útil ver la lista de la clase siguiente.», button enabled, «iOS 18.2» in
   the card.
2. **iOS · Enviado** — Prompt 25's thank-you with «Volver al perfil».
3. **iOS · Viendo como** — frame 1 under follow-up 108's impersonation
   banner, with the Error-tone line «Mientras ves la app como otra persona no
   puedes enviar comentarios.» above the button (the server refuses it: a
   comment is the Staff Member's own words).
4. **Android · Listo · Asistente** — frame 1 with Android's header height and
   «Android 14».
5. **iPad · Listo** — frame 1 on the iPad Pro 11-inch canvas, the form held
   to the Staff app's tablet column.

## Keep consistent

`S19`'s header and pinned button; Prompt 25's copy word for word; the closed
palette. Nothing else on `S23` changes here (the row is follow-up 165).
