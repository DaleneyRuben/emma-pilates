# Follow-up — Verification finding 63: the studio QR on a paid Evaluation (proposals)

Targets: **C14 Confirmar evaluación**, its paid case only, as proposals
only, on the same canvas as [260](./260-availability-time-picker-proposals.md),
exported to `design/v2/propuestas-hora/`. Read with
[95](./95-payment-qr-expand-and-save.md) (the studio QR card: whole at its
own proportions, «Ampliar», «Guardar QR») and
[225](./225-visual-system-v2.md). Send [30](./30-invariants-checklist.md)
alongside this follow-up. No exported screen is regenerated here: a later
follow-up records what the owner chose.

---

Written on 2026-11-15 for DES-016 (walkthrough verification finding 63).

## Why

With a 30-day plan, the Evaluation costs Bs 70. Lucía's «Confirma tu cita»
(Gabriela, lunes 16, 9:00) says «Cuesta Bs 70: transfiere y sube tu
comprobante» and offers «Elegir comprobante», but never shows the studio's
QR or where to transfer. Buying a plan (C10) shows the QR card with
«Ampliar» and «Guardar QR»; C14 does not. The walkthrough guide promises
«Bs 70, por QR en la app».

The rules every option keeps (`book-evaluation-screen.tsx`):

- the free Evaluation (a plan that includes it) shows no QR and no
  receipt: C14 as exported;
- a paid Evaluation needs the receipt attached before **Confirmar
  evaluación** turns on; the booking and the receipt go together;
- the QR is the same studio QR as C10, with «Ampliar» and «Guardar QR».

## The canvas

`Main.dc.html` names the options for both findings. One 390 × 844
clickable board per option shows Lucía's paid «Confirma tu cita»: attach
a receipt (and remove it), enlarge the QR, and watch **Confirmar
evaluación** turn on. `Hoy-evaluacion.dc.html` shows today's screen; C14
and C10 are on the canvas unchanged as references.

### A · Pasos como en la compra (recommended)

C14 keeps its hero and rows; the cost row reads «Cuesta Bs 70 · se paga
por transferencia». Below come C10's two numbered sections, «1 · Paga con
el QR del estudio» (the QR card) and «2 · Sube tu comprobante». Above the
button, C10's note «Adjunta tu comprobante para continuar».

### B · QR en una hoja

The screen stays as short as today. The cost row becomes a Lino card
«Paga Bs 70 con el QR del estudio» with a **Ver QR** button; it opens a
bottom sheet holding the QR card («Ampliar», «Guardar QR») and «Listo».
The receipt row stays under the card.

### C · Pago en un segundo paso

C14 stays as today without the receipt row, with **Continuar al pago**.
It opens «Pago de la evaluación», C10's layout for the Evaluation: «Monto
exacto a transferir» Bs 70 with «Evaluación · lunes 16 de noviembre,
9:00», the QR card, the receipt, and **Confirmar evaluación**.

## Out of scope, noted

Mis evaluaciones (C15) lets a paid Evaluation upload its receipt later
(«Sube tu comprobante de transferencia») and shows no QR either. Whichever
option the owner picks can carry the QR there; the choice follow-up says so.

## Preserve everything else

The hero, the reminder and cancellation rows, the free case and the
problem messages stay as exported.
