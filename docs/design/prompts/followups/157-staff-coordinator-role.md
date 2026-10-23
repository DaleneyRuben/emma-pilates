# Follow-up — The «Coordinador» Role in Personal

Targets: **AW23 (Personal)**, **AW24 (Formulario de personal)**, and the
**generated handoff `design/README.md`** (the `AW23` and `AW24` rows). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by IDN-009 on 2026-10-23
([ADR-0102](../../../adr/0102-coordinator-role-without-money.md)). The
Administrator invites the Coordinator from Personal like any Staff Member.
The Coordinator, signed in, reads Personal for the schedule but never
invites, changes a Role or Branches, or deactivates anyone.

## 1. `AW23` — the Role filter and tag

- The Role filter chips become **Todos · Entrenador · Asistente ·
  Administrador · Nutricionista · Coordinador** (the new chip last), in the
  labels AW23 already uses.
- A sample row «Carolina Rivas · carolina.rivas@example.com · Coordinador ·
  Todas · Activo», with the neutral Role tag and «Todas» in the Sucursales
  column like the Administrator's.

## 2. `AW24` — the Role choice

The Role choice grows from four to five options; the 2×2 grid becomes a
3-column grid (Entrenador, Asistente, Administrador / Nutricionista,
Coordinador). Choosing **Coordinador** swaps the Branch chips for the
read-only row «Todas las sucursales (implícito por el rol)», exactly as
Administrador does. New frame **«Panel · Nueva coordinadora»** with the
form filled for Carolina Rivas and Coordinador selected.

## 3. The Coordinator reading Personal

A frame **«Escritorio · Coordinadora»** of AW23: the same list without the
«Nuevo miembro» button, and a panel frame **«Panel · Solo lectura»** of AW24:
name, contact, Role, and Branches as read-only rows, no buttons other than
closing the panel, and the quiet note «Solo administración invita y cambia
roles.» in Texto tenue.

## 4. README

The `AW23` row gains «; the Coordinador Role (IDN-009) and a read-only view
for the Coordinator»; the `AW24` row gains «; five Roles, Coordinador with
every Branch implicitly».

## What must remain untouched

Every other AW23/AW24 frame, the pending-invitation box, «Desactivar
cuenta», and the warnings.
