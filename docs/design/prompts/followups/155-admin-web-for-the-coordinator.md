# Follow-up — The admin web for the Coordinator

Targets: **AW02 (Horario)**, **AW33 (Menú de usuario)**, the **Sistema de Diseño (Prompt 00)** (the sidebar sample in
«06 · Navegación»), and the **generated handoff `design/README.md`** (the
admin navigation bullets). Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by IDN-009 on 2026-10-23
([ADR-0102](../../../adr/0102-coordinator-role-without-money.md), the
decisions' section 7). The studio has a Coordinator, a Staff Role of her own
under one line: operations yes, money no. She signs in to the admin web with
the same Login as the Administrator and sees only the operational sections.
Nothing on her screens shows an amount: no «Bs» anywhere.

## 1. `AW02` — a new frame «Escritorio · Coordinadora»

Copy the first desktop frame exactly and change only the shell:

- The sidebar keeps **Horario** (active) and, under «Back Office», only
  **Clientes** and **Personal**, in that order. The groups «Catálogo»,
  «Promociones», and the entries Pagos (with its count), Insumos (with its
  count), Evaluaciones nutricionales, Nómina, Gastos, Categorías de gasto, and
  Reporte are absent, not disabled: she never sees them.
- The user menu cell at the foot of the sidebar shows her initials «CR»,
  «Carolina Rivas», and the Role line **«Coordinación»** where the
  Administrator's reads «Administración».
- The week grid, the Branch selector, «Nueva sesión», and the session panel
  are unchanged: she runs the schedule exactly as the Administrator does.

## 2. `AW02` — the notice for a section she cannot open

A second new frame, **«Escritorio · Coordinadora · Sección sin acceso»**: the
same page with an informative page notice above the grid (the PageNotice
convention of AW21's «Cuenta de … cerrada.», Info tones): **«Esa sección es
solo para administración.»** It appears when she follows an old link to a
money page (Pagos, Reporte, Nómina…); the address returns to Horario.

## 3. `AW33` — the menu shows her Role

In the open-menu frame, the header line under the name reads «Coordinación»
for her. «Cambiar contraseña» and «Cerrar sesión» are unchanged.

AW01 does not change: she signs in with the same form.

## 4. README

Under the admin navigation bullets add: «The Coordinator (ADR-0102) sees
Horario, Clientes, and Personal only; a money page opened by address returns
to Horario with «Esa sección es solo para administración.» No amount («Bs»)
appears on any page she can open.»

## What must remain untouched

Every Administrator frame of AW02 and AW33, the sidebar order and labels for
the Administrator, the closed palette, and every other screen.
