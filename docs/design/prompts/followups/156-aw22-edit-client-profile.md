# Follow-up — «Editar perfil» on the Client detail, and the Coordinator's detail

Targets: **AW22 (Detalle de cliente)** and the **generated handoff
`design/README.md`** (the `AW22` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by IDN-009 on 2026-10-23
([ADR-0102](../../../adr/0102-coordinator-role-without-money.md)). AW22 has
been read-only since WEB-004. The Administrator and the Coordinator now
correct a Client's **name and phone** from it. The login email stays the
Client's own (she changes it from her app, IDN-008), so it is shown but not
editable.

## 1. The «Editar perfil» action

In the panel's header row, left of «Cerrar cuenta», a compact neutral outline
button **«Editar perfil»** with a 14 px pencil icon. It turns the contact
block into a form in place (no second panel):

- **Nombre** — text field, required, prefilled.
- **Teléfono** — text field, optional, prefilled, helper «Opcional».
- **Correo** — read-only row with the helper «La clienta cambia su correo
  desde su app.» in Texto tenue.
- Buttons at the block's foot: **Cancelar** (neutral) and **Guardar
  cambios** (primary Palo de rosa).

New frames:

1. **«Panel · Editando perfil»** — the form as above for Lucía Fernández.
2. **«Panel · Nombre vacío»** — the name field in its error state with
   «Escribe el nombre de la clienta.».
3. **«Panel · Perfil guardado»** — the panel back to read-only with the
   corrected name and an Éxito result line above the contact block:
   «Guardamos los cambios del perfil.».

A failed save keeps the form and shows «No pudimos guardar los cambios.
Inténtalo de nuevo.» above its buttons.

## 2. The Coordinator's detail

A frame **«Panel · Coordinadora»**: the same panel without any amount and
without the actions that are the Administrator's:

- the **Crédito** row is absent (no «Bs» anywhere on the panel);
- **«Cerrar cuenta»** is absent; «Editar perfil» stays;
- the Plan card, remaining classes, dates, referral code, and «Cliente
  desde» are unchanged.

## 3. README

The `AW22` row gains «; «Editar perfil» corrects the name and phone for the
Administrator and the Coordinator; the Coordinator's panel has no Crédito
row and no «Cerrar cuenta» (IDN-009)».

## What must remain untouched

AW21, every existing AW22 frame (including «Cerrar cuenta» and its dialog for
the Administrator), and the panel's width and narrow full-screen behaviour.
