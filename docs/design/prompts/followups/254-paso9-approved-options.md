# Follow-up — Second walkthrough, Paso 9: the approved options

Targets: the boards of [253](./253-paso9-phone-gallery-tab-bar-proposals.md)
in `design/v2/propuestas-paso9/`, which are from here on the reference for
the screens below. No other export changes. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-06 for DES-013. The owner chose on 2026-11-06.

## 1. Phone prompt (n.º 34): option A, «Hoja al abrir»

- Client app. When she opens the app (after sign-in or coming back to it) and
  her stored number is missing or is not a valid mobile for its country, a
  sheet over Inicio: «Agrega tu celular» (none) or «Revisa tu celular»
  (invalid, the number prefilled with the error under the field), the line
  «El estudio te escribe por WhatsApp si cambia una clase o hay un aviso de
  tu plan.», the C22 phone field, «Guardar» and «Ahora no».
- «Ahora no» closes it for this app session; it comes back on the next open
  until a valid number is saved. It never blocks booking.
- «Guardar» saves through the same profile update as C22 and shows the
  «Celular guardado» notice on Inicio.

## 2. Receipt from the gallery (n.º 38): option A, «Dos botones»

- Staff app, S10 › QR, before a receipt is chosen: the receipt card shows
  «Comprobante» and «Fotografíalo o elígelo de la galería si llegó por
  WhatsApp», then «Fotografiar comprobante» and «Elegir de la galería» one
  under the other, both secondary.
- After either, the card reads «Comprobante listo · Todavía no se envió» with
  «Cambiar», which brings back the two buttons.

## 3. Staff and Client tab bars: «Barra al navegar»

- Staff app: the bar stays on browsing screens (client file, reservas,
  historial, horario and its details, invoices) and hides only inside task
  flows: Registrar pago, Reservar para…, Nuevo cliente, Cerrar caja.
- Client app, same rule (owner 2026-11-06): the bar stays on class detail,
  Mi plan, Mis pagos, Mis facturas, Notificaciones, Mis evaluaciones,
  historial and booking detail; it hides inside buying a plan (choose, start
  date, invoice, pay, upload receipt), booking an evaluation, Editar perfil,
  Cambiar contraseña and Cerrar mi cuenta.
- On a child screen the current tab stays marked; tapping it returns to the
  tab's root.

## 4. Common part

As 253 § 4 drew it: the «Fecha de inicio» strip for a next plan (day after
the current end through 28 days after it, the day after preselected, with
the line naming both ends), «Comprobante enviado» naming the scheduled start,
and «Registrar pago» on the client file.
