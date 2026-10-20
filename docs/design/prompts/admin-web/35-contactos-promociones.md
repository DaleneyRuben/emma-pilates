# Prompt AW35 — Contactos para promociones

Admin desktop web. Reached from **Promociones** (AW17) through its
«Contactos para promociones» button (follow-up
[102](../followups/102-aw17-contacts-entry.md)); it has no sidebar entry of its
own. Same shell as Horario (Prompt AW02). Send
[30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Written by BE-022 on 2026-10-20. When a Client closes her own Account, the
app offers an unticked box, «Quiero seguir recibiendo promociones de Emma
Pilates» (follow-up 100). Ticking it keeps her name, email, and phone apart
from her closed Account, with the time she agreed, so the studio can send her
promotions by email or WhatsApp (ADR-0097). Until now those contacts were only
in the database. This page lets an Administrator see them, export them to a
spreadsheet, and act on a «stop» request: the privacy page promises «borramos
tu contacto», so stopping erases the name, email, and phone for good.

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Contactos para promociones** page.

**Language:** neutral Spanish (Bolivia), informal «tú» address, as every
admin screen.

**Sidebar state:** «Promociones» group, «Promociones» item active (this page
belongs to it). The browser address reads
`admin.emmapilates.bo/promociones/contactos`.

## Layout, top to bottom

1. A quiet back link «← Promociones» (Palo de rosa text link, 12.5 px) above
   the title.
2. Title «Contactos para promociones» (Lora 27, as AW21) and the subtitle
   «12 contactos · personas que cerraron su cuenta y pidieron seguir recibiendo
   promociones». On the right of the title row, one compact neutral outline
   button «Exportar CSV» with a 14 px download icon. No primary button: the
   page creates nothing; contacts come only from the Client app.
3. A search field, as AW21's: placeholder «Buscar por nombre, correo o
   teléfono».
4. A table in AW21's card and density, newest consent first. Columns:
   «Nombre» (initials avatar as AW21, name in 14 px medium), «Correo»,
   «Teléfono» (tabular; «—» in Texto tenue when there is none), «Aceptó el»
   (`dd/mm/aaaa`, tabular), and a last narrow column holding, per row, a quiet
   Error-coloured text button «Dejar de enviar». Rows are not links: there is
   no detail panel.
5. AW21's footer: «Mostrando 12 de 12 contactos» and Anterior / Página 1 de 1 /
   Siguiente.

Sample people (fictional, the fixture style): Valeria Quiroga
`valeria.quiroga@gmail.com` +591 700 11 005, 19/10/2026; Daniela Rojas
`daniela.rojas@hotmail.com` (no phone), 17/10/2026; Mónica Salvatierra
`moni.salvatierra@gmail.com` +591 771 40 233, 12/10/2026; and further rows in
the same voice. Never a real person's data.

## Frames

1. **Escritorio · 1440 px** — the list as above, 6 rows visible.
2. **Confirmación · Dejar de enviar** — AW22's confirmation dialog convention
   (scrim, 460 px dialog, Lora 21 title): title «¿Dejar de enviar promociones a
   Valeria Quiroga?», body «Borramos su nombre, correo y teléfono de esta
   lista. Usa esto cuando la persona te pida que paremos.», then «Esta acción no
   se puede deshacer.» in medium weight; buttons **Volver** (neutral) and
   **Borrar contacto** (Error outline).
3. **Escritorio · Después de borrar** — the list with an Éxito result line
   above the table, as AW21's «Cuenta de … cerrada.»: «Borramos el contacto de
   Valeria Quiroga.»; her row is gone and the counts read 11.
4. **Escritorio · Sin contactos** — AW21's empty card with the quiet icon:
   title «Todavía no hay contactos.», note «Aparecen aquí cuando una clienta
   cierra su cuenta y marca que quiere seguir recibiendo promociones.»; the
   «Exportar CSV» button is disabled.
5. **Escritorio · Sin resultados** — AW21's no-results card for a search:
   «No se encontró ningún contacto.» and «Revisa cómo escribiste el nombre, el
   correo o el teléfono.»
6. **Navegador angosto · 420 px** — AW21's narrow shell; the table becomes
   stacked cards: name, then «correo · teléfono», then «Aceptó el dd/mm/aaaa»,
   with «Dejar de enviar» as a quiet Error text button at the card's foot;
   «Exportar CSV» sits full-width under the subtitle.

## Behaviour notes for the handoff

- «Exportar CSV» downloads every contact (not just the visible page) as
  `contactos-promociones-aaaa-mm-dd.csv`, columns Nombre, Correo, Teléfono,
  Aceptó el, in the same order as the table. The export is recorded in the
  audit log. A failed export shows an Error notice above the table, «No
  pudimos exportar los contactos. Inténtalo de nuevo.»
- A failed «Borrar contacto» keeps the dialog open with «No pudimos borrar el
  contacto. Inténtalo de nuevo.» above its buttons.

## Keep consistent

The shell, sidebar, Branch selector, and user menu exactly as AW21; the closed
palette; the table, empty, and no-results conventions of AW21; the dialog
convention of AW22. Touch no other screen (AW17's entry button is follow-up
102).
