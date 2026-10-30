// Older builds ignore this field (ADR-0016). Price stays the charged amount
// after confirmation, so the screen cannot infer a pending payment from it.
export const receiptUploadable = (
  payment: {
    state: string;
    receiptImageAssetId: string | null;
  } | null,
): boolean =>
  payment?.state === 'PENDING' && payment.receiptImageAssetId === null;
