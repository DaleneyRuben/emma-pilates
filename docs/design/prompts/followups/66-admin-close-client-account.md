# Follow-up — `AW22` gains «Cerrar cuenta» (BE-007)

Targets: **AW22 (Detalle de cliente)**. Send [30](./30-invariants-checklist.md)
alongside this follow-up, with the corrections it carries in
[31](./31-plan-naming-leftovers.md) and
[40](./40-cancellation-window-wording.md).

---

BE-007 G2 lets an Administrator close a Client's Account
(`docs/implementation/BE-007-data-governance-proposal.md`, G2–G6). The panel
was a read-only summary with no footer button; it now has one action, and the
rest stays read-only.

## 1. `AW22` — A quiet footer action

- A footer appears under the panel body with one compact button,
  **Cerrar cuenta**, Error outline, left-aligned. No primary button and no
  «Guardar»: the panel's fields stay read-only in the `#FAF7F2` row
  treatment.
- It appears for an active, a pending, and a deactivated Account (follow-ups 54
  §2 and 59 §9), and is hidden for a Client whose Account is already closed
  (a closed Client no longer appears in `AW21`, so the panel cannot be
  opened for her).

## 2. `AW22` — The confirmation dialog

Closing an Account cannot be undone from the app, so **Cerrar cuenta** opens
the standard confirmation (the 53/55 convention: **Volver** compact neutral,
the destructive action in Error outline):

- Title «¿Cerrar la cuenta de Valeria Terceros?»
- Body, one short line per consequence that applies, with this panel's values:
  - «Se cancelan sus {n} reservas futuras y su evaluación nutricional, sin
    descontar nada.»
  - «Sale de {n} listas de espera.»
  - «Su plan {nombre} termina hoy, sin reembolso; pierde las {n} clases que le
    quedan.»
  - «Pierde su crédito de Bs {monto}.»
  - Always: «Se cierra su sesión en todos sus dispositivos y su correo queda
    libre.»
  - Always: «Su historial se conserva, pero deja de verse en la app y en las
    listas.»
  - Closing line: «Esta acción no se puede deshacer.»
- Buttons **Volver** and **Cerrar cuenta**.
- Draw one frame with a plan, reservas, and crédito, and one for a Client with
  no plan (only the two «Siempre» lines and the closing line).

## 3. `AW22` — After confirming

- **Refused:** when the Client has a transfer payment awaiting review, the
  dialog stays open and shows an Error notice above its buttons, «No se puede
  cerrar todavía: tiene un pago por transferencia en revisión. Confírmalo o
  recházalo en Pagos y vuelve a intentarlo.», with a text link **Ir a Pagos**
  (to `AW28`); the **Cerrar cuenta** button is disabled. Draw this frame.
- **Failed:** a network failure keeps the dialog open with «No pudimos cerrar
  la cuenta. Inténtalo de nuevo.» in the same place.
- **Done:** the dialog and the panel close, `AW21` reloads without her, and an
  Éxito line appears above the table, «Cuenta de Valeria Terceros cerrada.»
  The subtitle counts drop by one («147 clientas · 95 con plan activo» if she
  had an active Plan). Draw `AW21` with that line.

## Preserve everything else

Do not change the panel's header, contact, plan, crédito, and referidos
blocks, the pending and deactivated boxes, the shell, the sidebar, the Branch
selector, the closed palette, or any screen not named in Targets.
