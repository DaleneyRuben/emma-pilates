# Follow-up — The erasure line in `AW22`'s «Cerrar cuenta» dialog

Targets: **AW22 Detalle de cliente** (the three confirmation dialog frames:
with a plan, reservas, and crédito; with no plan; and refused by a transfer in
review). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-029 on 2026-10-20. Since ADR-0097 (BE-021), closing a Client
Account also erases the Client's name, email, phone, and profile photo, while
the studio keeps the Payments and classes without them. The dialog's last
consequence line, «Su historial se conserva, pero deja de verse en la app y en
las listas.», is still true but leaves the erasure out, so an Administrator
confirming the closure does not learn that the person's details are gone for
good. Follow-up [100](./100-close-account-promotions-consent.md) already says
the same thing to the Client on `24`.

## 1. The last consequence line

In every dialog frame, the bullet «Su historial se conserva, pero deja de
verse en la app y en las listas.» becomes:

«Se borran su nombre, correo, teléfono y foto. Sus pagos y clases se conservan
sin sus datos, para la contabilidad del estudio.»

Same bullet, style, and position (the last bullet, after «Se cierra su sesión
en todos sus dispositivos y su correo queda libre.»). It may wrap to two lines;
the dialog grows with it and shortens no other copy.

The Administrator's dialog gets no promotions box: nobody consented, so
nothing is kept (ADR-0097).

## Leave untouched

The title, every other consequence line, «Esta acción no se puede deshacer.»,
the refusal notice and «Ir a Pagos», the **Volver** and **Cerrar cuenta**
buttons, the panel behind the dialog, `AW21`, every other screen, and the
generated handoff `design/README.md` (its `AW22` rows do not quote this line).
