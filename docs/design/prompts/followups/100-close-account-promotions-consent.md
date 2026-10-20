# Follow-up — Promotions box and erasure note on «Cerrar mi cuenta»

Targets: **24 Cerrar Mi Cuenta** (the «iOS · Con plan, reservas y crédito»,
«iOS · Sin nada pendiente», «iOS · Contraseña incorrecta», «iOS · No se pudo
cerrar», and «Android · Campos llenos» frames). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BE-021 on 2026-10-19. Google Play's User Data policy says that
closing an account must delete the data linked to it, so closing a Client
Account now erases the name, email, phone, password, and profile photo, while
the studio keeps the Payments and classes without them (ADR-0097). The studio
owner also wants to keep sending promotions to former Clients who agree, so
the screen offers an unticked box that keeps their contact for that purpose
only. The quiet note under the consequence card still says the old rule (the
studio «conserva el registro», which reads as keeping the person).

## 1. The note under the card

In every frame that shows the consequence card, the quiet note becomes:
«Borramos tu nombre, correo, teléfono y foto. El estudio conserva tus pagos y
tus clases sin tus datos, para su contabilidad.» Same style and position.

## 2. The promotions box

Between that note and the «Contraseña» field, add one row:

- A square checkbox, 22 × 22 pt, corner radius 6, on the left. Unticked: a
  1.5 pt border in the field border colour on Blanco. Ticked: filled with
  Palo de rosa (the primary) and a white check mark.
- To its right, the label «Quiero seguir recibiendo promociones de Emma
  Pilates» in body text, and under it the helper «Guardamos solo tu nombre,
  correo y teléfono para enviarte promociones. Puedes pedir que paremos
  cuando quieras.» in the same quiet note style as the password's helper.
- The whole row is the tap target (at least 44 pt tall) and toggles the box.
  It starts unticked every time the screen opens; nothing is pre-ticked.

Frame states: the box is unticked in «Con plan, reservas y crédito», «Sin
nada pendiente», «Contraseña incorrecta», and «No se pudo cerrar», and ticked
in «Android · Campos llenos». If a frame's content no longer fits above the
pinned button, let the content area scroll under it as the Android frame
already does with the keyboard open; shorten no copy.

## Leave untouched

The header, the lead line, every consequence line (including «Tu correo queda
libre por si quieres registrarte de nuevo.»), the password field and its
helper and error, the pinned «Cerrar mi cuenta» button and «Cancelar», the
«iOS · Pago en revisión» frame (no box there: closure is refused), the
«iOS · Después de cerrar» frame, every other screen, and the generated
handoff `design/README.md` except the row for 24.
