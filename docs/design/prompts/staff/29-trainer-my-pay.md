# Prompt S29 — Mis pagos (Entrenadora)

Staff app, Trainer role. Reached from Perfil (Prompt S23) through the row
**Mis pagos** that follow-up
[224](../followups/224-mis-pagos-and-salary-receipts.md) adds above
«Notificaciones». Send [30](../followups/30-invariants-checklist.md)
alongside this prompt.

---

Written on 2026-11-02 from decisions section 8 («Cada instructora ve solo el
suyo en "Mis pagos"»), ADR-0105, BKO-006, and the owner's request of
2026-11-01: «yo debería poder subir un comprobante del pago y este debería
poder verse en la app de staff». It replaces the one paragraph follow-up 202
§2 gave this screen.

A Trainer reads what the studio owes her each month and what it paid her.
Nothing on the screen is editable. She sees only her own pay: the
Assistant, the Nutritionist, Administración, and the Coordinator do not get
this screen (ADR-0102: the Coordinator sees no money).

Using the Emma Pilates Studio design system (Prompt 00) and the same
header-with-back-arrow pattern as Para contactar (Prompt S28), design the
**Mis pagos** screen of the staff app.

**Language:** neutral Spanish (Bolivia), informal «tú».

**Money:** centavos, as the Cash Close (S25) and the admin web write them:
`Bs 322,00`, `Bs 1.234,50`, tabular figures.

**Navigation chrome:** a back arrow returns to Perfil; title «Mis pagos». No
tab bar.

**Layout, top to bottom:**

1. **Liquidaciones**, one white card per month, newest first (the README's
   card surface):
   - the month in Lora 19 («Noviembre 2026») on one line and, under it, a
     state pill: «Aprobado» on the success tint, «Borrador» on the warning
     tint;
   - the month's total right-aligned, Lora 22;
   - on a draft only, a Nota line: «Puede cambiar hasta que administración lo
     apruebe.»;
   - a summary by concept, one row each, the count in the label and the
     subtotal right-aligned: «Clases dictadas · 18», «Canceladas por
     mínimo · 1», «Comisiones · 1». A concept with nothing does not appear;
   - a quiet text button «Ver cada clase» that expands the card to the
     statement's lines, one row each: the concept («Clase», «Clase
     cancelada por mínimo», «Comisión»), its detail under it in 13 px
     muted («6 alumnas, 2 extra», «Mínimo no alcanzado», «Primer plan»),
     and the amount. «Ocultar detalle» folds it again.
2. **Pagos recibidos**, a section label, then one grouped white list of the
   Salary Payments administración recorded for her in Nómina, newest
   first: the amount in 15 px with the date under it in 13 px muted («1 de
   noviembre de 2026»). A payment with a receipt starts with a 40 px
   thumbnail of it and ends with «Ver» and the quiet chevron; tapping the
   row opens the receipt full screen. A payment without one starts with a
   dashed placeholder, ends with «Sin comprobante» in muted text, and is
   not tappable.

**Receipt full screen:** the same viewer as S12's «Comprobante ampliado»:
the dark scrim, the payment's date at the top left («Pago del 1 de
noviembre de 2026»), a 44 px close X at the top right, the photo at the
screen's width with pinch to zoom, closed by the X or a downward swipe. No
actions inside.

**Empty state:** the bare empty list of the README: a 34 px `#C4BAB6`
card glyph, «Todavía no tienes pagos.» in Lora 21, and «Aquí verás cada
mes lo que te corresponde y lo que se te pagó.»

**Loading and failure:** the branded loading state; «No pudimos cargar tus
pagos.» with «Reintentar» on failure. Pull to refresh reloads both lists.

**Tablet:** the iPad Pro 11 frame keeps one centred column of 560 px, as
S28.

**Frames:** iOS with a draft and an approved month and two payments (one
with a receipt, one without); iOS with an approved month expanded by «Ver
cada clase»; iOS receipt full screen; iOS empty; Android list; tablet list.
