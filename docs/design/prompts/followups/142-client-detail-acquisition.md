# Follow-up — «¿Cómo nos conociste?» on the Client detail

Targets: **AW22 (Detalle de cliente · Web Admin)** and the **generated
handoff `design/README.md`** (the `AW22` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-011 on 2026-10-23. The Administrator (and the Coordinator,
once IDN-009 adds that Role) can correct how a Client found the studio on
the Client detail (Booking ADR-0009; glossary «Acquisition Channel»). `AW22`
stays a read-only summary with one exception: this block has its own
«Corregir».

## 1. The block

In «Escritorio · 1440 px», «Escritorio · Sin plan activo», and «Navegador
angosto · 420 px», after the «Referidos» block, add a block titled **«¿Cómo
nos conociste?»** in the same block-title style (11px uppercase, letter
spacing 0.14em, `#766D69`), with a quiet link button **«Corregir»** (13px,
Palo de rosa `#B78380`, no border) at the right end of the title line.

Its rows use the summary-row style of «Referidos» (Superficie card, 1px
`#F2EBE2` dividers, label 13px `#766D69` left, value right):

- **Canal** · «Una instructora», and under it in 12px `#766D69` «Ella
  respondió: Instagram» when her answer differs from the attribution.
- **Código** · «CARLA» in the monospace chip of the «Código» row of
  «Referidos».
- **La trajo la instructora** · «Carla Ríos» (for a Client's code the label
  is «La recomendó» and the value the Client's name).

«Escritorio · Sin plan activo» shows a Client registered before the
question: one row, **Canal** · «Sin dato» in `#7A716D`, without Código or
referrer.

## 2. Correcting

Add a frame **«Escritorio · Corregir canal»** after «Escritorio · Cuenta
desactivada»: the 1440 px panel with the block opened as a small form on
Superficie with a 1px `#F2EBE2` border and 12px padding:

- **Canal**: a native select in the form's select style (44px, 1px
  `#D8C9BB`, chevron) listing the eight answers of follow-up 140, showing
  «Instagram».
- **Código (opcional)**: a 44px text field showing «CARLA», with the helper
  «De una clienta o de una instructora. Si lo escribes, decide el canal.» in
  12px `#766D69`.
- Two small buttons: **«Guardar»** (Palo de rosa fill) and **«Cancelar»**
  (ghost).

A code nobody holds leaves the form open with **«No encontramos ese código.
Revísalo o déjalo vacío.»** in 12px `#94493A` under the field; draw it as a
second state in the notes card rather than another frame.

## 3. README

In the `AW22` inventory row, replace «Read-only side panel: contacto, plan,
crédito, referidos; **no Guardar**» with «Side panel: contacto, plan,
crédito, referidos, and «¿Cómo nos conociste?» (canal, código, quién la
trajo) whose own «Corregir» is the only edit; **no panel Guardar**».

## What must remain untouched

The contact, Plan, Crédito, and Referidos blocks, the pending and
deactivated states, the «Cerrar cuenta» footer and its three confirmation
frames.
