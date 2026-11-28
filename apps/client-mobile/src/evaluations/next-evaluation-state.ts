import type { ClientEvaluationDto } from "@pilates/api-contracts";
import { formatBolivianos } from "@pilates/mobile-core";

import { paidEvaluationLabel } from "./evaluation-format";

export type CardState = {
  chip: string;
  line: string;
  released: boolean;
  canCancel: boolean;
  canMove: boolean;
  needsReceipt: boolean;
};

/** What the card says and offers for one booked Evaluation (follow-up 264 §1). */
export function nextEvaluationState(evaluation: ClientEvaluationDto, shownAt: number): CardState {
  // The server's flags are a snapshot; the 3-hour limit is judged again here.
  const open = new Date(evaluation.cancellableUntil).getTime() > shownAt;
  const amount = formatBolivianos(evaluation.priceCentavos);
  const base = { canCancel: false, canMove: false, needsReceipt: false, released: false };
  if (evaluation.slotReleased === true) {
    return {
      ...base,
      chip: "El estudio liberó tu turno",
      line: `Tu pago de ${amount} sigue vigente: elige otro turno y no pagas de nuevo.`,
      released: true,
    };
  }
  if (evaluation.included) {
    const canCancel = evaluation.cancellable && open;
    return {
      ...base,
      canCancel,
      chip: "Gratis con tu plan",
      line: canCancel ? "Puedes cancelarla hasta 3 horas antes." : "Ya no se puede cancelar.",
    };
  }
  // Finding 64: the server says what a paid one allows; with the transfer in
  // review she may move it and, while the studio has not confirmed, cancel it.
  const canMove = evaluation.reschedulable === true && open;
  const canCancel = evaluation.cancellable && open;
  const needsReceipt = evaluation.receiptUploadable === true;
  const chip = paidEvaluationLabel(evaluation.paymentState);
  // C13h (owner 2026-11-27): a rejected receipt says so first, even while
  // she may send another one.
  const line =
    evaluation.paymentState === "rejected"
      ? `El estudio no aprobó tu comprobante de ${amount}.`
      : needsReceipt
        ? `Sube tu comprobante de ${amount} para que el estudio revise tu pago.`
        : evaluation.paymentState === "pending"
          ? `El estudio revisa tu comprobante de ${amount} y te avisa por la app.`
          : canMove
            ? "Puedes reprogramarla hasta 3 horas antes. El pago sigue con ella."
            : canCancel
              ? "Puedes cancelarla hasta 3 horas antes."
              : "Ya no se puede reprogramar.";
  return { ...base, canCancel, canMove, chip, line, needsReceipt };
}
