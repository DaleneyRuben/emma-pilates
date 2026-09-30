# Follow-up — `design/README.md` still offers «Restablecer contraseña» on `AW24`

Targets: **generated handoff `design/README.md`** (the `AW24` bullet under the
flows). Send [30](./30-invariants-checklist.md) alongside this follow-up; it
applies §11 to a leftover of [54](./54-people-administration-controls.md).

---

Follow-up 54 removed **Restablecer contraseña** from `AW24`, and the export of
2026-09-30 applied it: the screen has no such action, its «Al editar» note says
so, and the README's screen table ends the `AW24` row with «no «Restablecer
contraseña»». The flow bullet for `AW24` still says «An activated member's edit
mode offers **Restablecer contraseña**», which describes an action that is not
drawn (checklist 30 §11) and contradicts ADR-0029: no one resets another
Account's password; each Account recovers its own from `AW30`/`S18`.

## 1. The `AW24` flow bullet

Replace that sentence with: an activated member's edit mode shows «Nombre»,
«Correo», and «Teléfono» as read-only rows and changes only the Role and the
Branches; there is no «Restablecer contraseña», because every Account recovers
its own password by email (`AW30`/`S18`). Keep the rest of the bullet,
including the warning that removing a Branch does not reassign its Sessions.

## Preserve everything else

Do not change any screen, the `AW24` table row, or any other line of the
README.
