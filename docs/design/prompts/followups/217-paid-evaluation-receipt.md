# Follow-up — `14` asks for the transfer receipt

Targets: **14 (Confirmar evaluación)**, its phone, Android, and tablet frames;
the **generated handoff `design/README.md`** (`14` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-003 on 2026-10-28. A paid Evaluation is a transfer of its own
(booking ADR-0011) and has no Purchase Intent, so the Plan receipt screen
never runs. The Client still has to attach the same transfer receipt before
the studio can review it.

## 1. Paid confirmation

On the frame where the Evaluation is not included:

- Keep the price line. Replace «La pagas por QR o en recepción.» with
  «Transfiere el monto y sube tu comprobante.»
- Under that line, draw the same receipt control `10` uses: a tappable
  area labelled «Sube tu comprobante de transferencia», and a second state
  «Comprobante listo. Toca para cambiarlo.» with the thumbnail.
- «Confirmar» stays disabled until the receipt is attached. Once it is,
  confirming books the Evaluation and sends the receipt.

## 2. Included confirmation

An included Evaluation draws no receipt control and no price. «Confirmar»
stays enabled. The rest of `14` stays.

## 3. Untouched

`10` stays the Plan receipt. `AW29` stays the review. Do not add a new
screen or a new native module.
