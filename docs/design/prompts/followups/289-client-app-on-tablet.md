# Follow-up — The client app on iPad and Android tablets

Targets: every main client screen, `01`–`25` (the root files) in their v3 look
(`design/v3/cliente/`), redrawn for tablet as `design/NNT … (Tablet).dc.html`.
Read with [285](./285-rosa-emma-type-scale.md) and
[288](./288-login-sheet-with-logo.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-24. The client app shipped iPhone-only; the owner wants
clients to use it on iPads and Android tablets, where it now shows the phone
layout stretched. Run on a Claude Design canvas in two rounds (the ten main
screens, then the other fifteen); the owner approved both and the three open
points below.

## Shared rules

- Tablet layout from 768 px wide (the Staff app's breakpoint), portrait and
  landscape; iPad Pro 11 portrait (834×1194) is the reference, with one
  landscape board (`03T`, 1194×834) and one Android board (`02T`, 800×1280).
- Keep the bottom tab bar, 84 px, the four tabs centred with the icon beside
  the label. No side navigation, as in the Staff app.
- Rubor header band as on the phone, 40 px side padding, Lora 36 title.
- Centred columns of 480, 560, 640 and 720 px for single-purpose screens; two
  columns elsewhere.
- List and detail screens use `S04`'s fixed 392 px left panel: Reservar with
  Detalle de sesión in the right panel, and Mis facturas.
- Login, recovery and account creation use the approved Login A layout (288).

## Decisions

- `17` Mi crédito was retired (PAY-005), so `17T` is Mis facturas, the v3 C17.
- `09T` says «Cancela sin costo hasta 2 h 30 antes» (the phone v3 board said
  3 h); the value comes from the Studio Settings as «Studio rules in copy» says.
- `17T`'s «En preparación» and «Pago anulado» detail lines are new short copy.
- Error, empty and loading states keep each screen's tablet layout and need no
  boards of their own.
