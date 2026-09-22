export type CreditLedgerKind =
  | 'referral_award'
  | 'payment_reservation'
  | 'payment_spend'
  | 'payment_release';

export type CreditLedgerLine = {
  kind: CreditLedgerKind;
  amountCentavos: number;
};

export type CreditSummary = {
  availableCentavos: number;
  reservedCentavos: number;
};

// The append-only ledger is the only balance source: awards and releases add
// available Credit, reservations hold it, spends consume what was held.
export const summarizeCredit = (
  entries: readonly CreditLedgerLine[],
): CreditSummary => {
  const totals = entries.reduce<Record<CreditLedgerKind, number>>(
    (sum, entry) => ({
      ...sum,
      [entry.kind]: sum[entry.kind] + entry.amountCentavos,
    }),
    {
      referral_award: 0,
      payment_reservation: 0,
      payment_spend: 0,
      payment_release: 0,
    },
  );

  return {
    availableCentavos:
      totals.referral_award +
      totals.payment_release -
      totals.payment_reservation,
    reservedCentavos:
      totals.payment_reservation -
      totals.payment_spend -
      totals.payment_release,
  };
};
