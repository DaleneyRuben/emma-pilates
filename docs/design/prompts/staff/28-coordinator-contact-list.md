# Prompt S28 — Para contactar (Coordinación)

Staff app, Coordinator role. Reached from her root, Buscar cliente (Prompt
S04), through the «Para contactar» button that follow-up
[186](../followups/186-s04-para-contactar-entry.md) adds under «Cancelar una
clase». Send [30](../followups/30-invariants-checklist.md) alongside this
prompt.

---

Written by BKM-013 on 2026-10-23 (the decisions' section 12, glossary
«Contact Alert», ADR-0102). The same list as the admin web's AW39: the new
Clients the studio should write to during their first 90 days, because they
have not booked in 7 days, took fewer than 2 classes by day 15, or fewer than 4
in their first 30 days. The Coordinator writes to each by WhatsApp by hand
from her phone and marks her contacted. A Client leaves the list on her own
when she books.

Using the Emma Pilates Studio design system (Prompt 00) and the same
header-with-back-arrow pattern as Cancelar una clase (Prompt S13), design the
**Para contactar** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal «tú»
address; the people listed are «clientas».

**Navigation chrome:** a back arrow returns to Buscar cliente (S04); title
«Para contactar». No tab bar.

**Layout, top to bottom:**

1. An intro note in the Nota style (13 px, `#7A716D`), no card: «Clientas
   nuevas que conviene escribir por WhatsApp. Salen solas de la lista cuando
   reservan una clase.»
2. One white card per Client (the README's card surface, radius 16, 1 px
   `#D8C9BB`), oldest alert first:
   - the 42 px initials avatar (as S04's results) and the name in 16 px
     `#4A4A4A`, with her phone under it in 13 px `#766D69` («Sin teléfono»
     when there is none);
   - the reason lines, 14 px `#4A4A4A`, each with a 6 px Palo de rosa dot:
     «7 días sin reservar», «Menos de 2 clases a los 15 días», «Menos de 4
     clases en su primer mes»;
   - «Empezó el 2 de octubre» in 13 px `#766D69`;
   - two buttons side by side at the card's foot, 48 px high: an outline
     **«Abrir WhatsApp»** (opens WhatsApp with her number; absent when there is
     no phone) and a primary filled **«Contactada»**.
3. Nothing else: no search (the list is short), no filter.

**Marking:** «Contactada» shows the busy state of the README's buttons, then
the card leaves the list and a quiet success line appears above the cards:
«Marcaste a Valeria Quiroga como contactada.» A failure keeps the card and
shows «No pudimos marcar a Valeria Quiroga. Inténtalo de nuevo.» in the error
tone above the cards.

**Empty state:** the bare empty list of the README (34 px `#C4BAB6` line icon,
Lora 21 title, 14 px note): «Nadie para contactar por ahora.» and «Aquí
aparecen las clientas nuevas que dejan de reservar o toman pocas clases.»

**Loading and failure:** the branded loading state while the list loads;
«No pudimos cargar la lista.» with «Reintentar» on failure, as every other
list in the staff app. Pull to refresh reloads it.

Show these frames, with the sample Clients of AW39 (Valeria Quiroga, Daniela
Rojas without a phone and with two reasons, Mónica Salvatierra):

- **iOS · Lista**
- **iOS · Después de marcar** — Valeria's card gone, the success line on top.
- **iOS · Vacía**
- **Android · Lista** — Android header height.
- **Tablet · Lista** — the iPad Pro 11 frame: the cards in a 560 px centred
  column.

Generous whitespace, calm tone. No amount anywhere: she never sees money.
