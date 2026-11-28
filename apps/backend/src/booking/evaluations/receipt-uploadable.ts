// Older builds ignore this field (ADR-0016). Price stays the charged amount
// after confirmation, so the screen cannot infer a pending payment from it.
// Board C13h (owner 2026-11-27): after a rejection the Client sends another
// receipt while the Evaluation is still booked and its slot still bookable.
export const receiptUploadable = (
  payment: {
    state: string;
    receiptImageAssetId: string | null;
  } | null,
  evaluation: { booked: boolean; bookable: boolean } = {
    booked: false,
    bookable: false,
  },
): boolean =>
  (payment?.state === 'PENDING' && payment.receiptImageAssetId === null) ||
  (payment?.state === 'REJECTED' && evaluation.booked && evaluation.bookable);
