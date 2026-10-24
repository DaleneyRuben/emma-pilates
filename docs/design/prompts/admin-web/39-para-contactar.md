# Prompt AW39 — Para contactar

Admin desktop web, for the Administrator and the Coordinator. Reached from
the sidebar entry «Para contactar» under «Back Office», right after
«Clientes» (follow-up [185](../followups/185-aw02-para-contactar-entry.md)).
Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Written by BKM-013 on 2026-10-23 (the decisions' section 12, glossary
«Contact Alert» in `booking/CONTEXT.md`, ADR-0102). The studio follows every
new Client through her first 90 days, counted from the start of her first
real Plan (a courtesy never counts). Three things put her on this list, each
once per stretch:

- **no Booking in 7 days**: seven days pass without her booking a class and
  she has nothing booked ahead;
- **fewer than 2 classes by day 15**: a risk, early;
- **fewer than 4 classes in her first 30 days**.

The Coordinator (or the Administrator) writes to her by WhatsApp by hand: the
page only opens WhatsApp with her number (a `wa.me` link, no integration) and
records «Contactada». A Client leaves the list on her own the moment she books
a class.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Para contactar** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen. The people on the list are Clients, written «clienta» as
the studio speaks of them.

**Sidebar state:** «Back Office» group, «Para contactar» item active. The
browser address reads `admin.emmapilates.bo/back-office/para-contactar`. No
amount appears anywhere on the page: the Coordinator sees it as it is.

## Layout, top to bottom

1. Title «Para contactar» (Lora 27, as AW21) and the subtitle «3 clientas ·
   seguimiento de sus primeros 90 días». No button on the title row: nothing
   is created here.
2. One quiet Nota line under the subtitle (13 px, Texto tenue): «Escríbeles
   por WhatsApp y márcalas como contactadas. Salen solas de la lista cuando
   reservan una clase.»
3. A table in AW21's card and density, oldest alert first (who has waited
   longest is on top). Columns:
   - «Clienta» — the initials avatar as AW21 and the name in 14 px medium;
   - «Teléfono» — tabular; «Sin teléfono» in Texto tenue when there is none;
   - «Motivo» — one line per reason, 13 px Texto secundario: «7 días sin
     reservar», «Menos de 2 clases a los 15 días», «Menos de 4 clases en su
     primer mes»; a Client with two reasons shows two lines;
   - «Empezó el» — the start of her first Plan, `dd/mm/aaaa`, tabular;
   - a last column, right-aligned, with two compact buttons side by side:
     a neutral outline **«Abrir WhatsApp»** with a 14 px message icon (opens
     `wa.me/591…` in a new tab; disabled with the title «Sin teléfono» when
     there is no phone), and a primary-outline **«Contactada»**.
   Rows are not links: there is no detail panel.

Sample people (fictional, the fixture style): Valeria Quiroga +591 700 11
005, «7 días sin reservar», empezó el 02/10/2026; Daniela Rojas (no phone),
«Menos de 2 clases a los 15 días» and «7 días sin reservar», empezó el
05/10/2026; Mónica Salvatierra +591 771 40 233, «Menos de 4 clases en su
primer mes», empezó el 20/09/2026. Never a real person's data.

## Frames

1. **Escritorio · 1440 px** — the list as above, three rows.
2. **Escritorio · Después de marcar** — an Éxito result line above the table,
   as AW21's «Cuenta de … cerrada.»: «Marcaste a Valeria Quiroga como
   contactada.»; her row is gone and the subtitle reads «2 clientas».
   No confirmation dialog: marking is quick and harmless.
3. **Escritorio · Sin clientas** — AW21's empty card with the quiet icon:
   title «Nadie para contactar por ahora.», note «Aquí aparecen las clientas
   nuevas que dejan de reservar o toman pocas clases en sus primeros 90
   días.»
4. **Escritorio · Coordinadora** — frame 1 in the Coordinator's sidebar
   (follow-up 155: Horario, Clientes, Para contactar, Personal) with «CR
   · Carolina Rivas · Coordinación» in the user menu cell.
5. **Navegador angosto · 420 px** — AW21's narrow shell; the table becomes
   stacked cards: name, then the phone, then the reason lines, then «Empezó el
   dd/mm/aaaa»; the two buttons sit side by side, full width, at the card's
   foot.

## Behaviour notes for the handoff

- «Contactada» marks every open reason of that Client at once and records who
  marked her and when (audited). A failed mark shows an Error notice above the
  table, «No pudimos marcar a Valeria Quiroga. Inténtalo de nuevo.», and the
  row stays.
- The list is short (only Clients in their first 90 days), so it has no
  search and no pages.
- The page reads the list again when it gets focus, so a Client who booked
  meanwhile is gone.

## Keep consistent

The shell, sidebar, Branch selector (the page is studio-wide: AW34 frame 2's
note «Esta página no se filtra por sucursal — las clientas son del estudio, no
de una sede.»), and user menu exactly as AW21; the closed palette; AW21's
table, empty, and result-line conventions. Touch no other screen (the
sidebar entry is follow-up 185).
