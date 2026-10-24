# Follow-up — A Trainer's personal code on the staff form

Targets: **AW24 (Formulario de personal · Web Admin)** and the **generated
handoff `design/README.md`** (the `AW24` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-011 on 2026-10-23. Every Trainer holds a personal Referral
Code, created by the Administrator; a Client who registers with it is the
Trainer's, which Trainer pay (BKO-006) counts (Booking ADR-0009, glossary
«Referral Code», [ADR-0105](../../../adr/0105-calculate-staff-pay-in-the-system.md)).

## 1. The field

In «Escritorio · Editar miembro» (a Trainer), after the Branches and their
note and before the footer, add:

- Label **«Código personal»** in the field-label style.
- A row: a 44px text field in a monospace face with letter spacing 0.06em,
  placeholder «Ej. CARLA», showing «CARLA»; beside it a secondary button
  **«Guardar código»** (Palo de rosa outline, 44px tall). The field saves on
  its own: the panel's «Guardar» still saves only Role and Branches.
- Under the row, the helper «Las clientas que se registran con este código
  quedan como traídas por ella.» in 12px `#766D69`.

Only Trainers get the field: «Editar miembro · pendiente de activación»
shows it when the pending member is a Trainer; the Assistant, Nutritionist,
and Administrator frames do not.

## 2. States

Add a frame **«Escritorio · Código personal · en uso»** after «Escritorio ·
Editar miembro · sucursal con sesiones»: the same panel with «LUZ» typed, the
field's border in Error `#B25D4B`, and **«Ese código ya lo tiene otra clienta
o instructora.»** in 12px `#94493A` in place of the helper. Note in the notes
card the other two messages: a saved code reads «Código guardado: CARLA.» in
Éxito texto `#5F7457`, an emptied one «Quitamos el código.», and a malformed
one «Usa de 3 a 20 letras, números o guiones, sin empezar con REF-.».

## 3. README

In the `AW24` inventory row, after «edit shows the contact read-only and
changes only Role and Branches», add «; a Trainer's edit also holds her
«Código personal» with its own «Guardar código»».

## What must remain untouched

The create frames, the Role grid, Branches, the pending card and its
states, «Desactivar cuenta», and the read-only frames.
