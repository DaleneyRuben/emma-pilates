import { civilText } from './pay-period';

/** A statement's dates as the civil `YYYY-MM-DD` text its DTO carries. */
export const civilStatement = <
  Statement extends {
    month: Date;
    periodStart: Date;
    periodEnd: Date;
    approvableOn: Date;
  },
>(
  statement: Statement,
) => ({
  ...statement,
  month: civilText(statement.month),
  periodStart: civilText(statement.periodStart),
  periodEnd: civilText(statement.periodEnd),
  approvableOn: civilText(statement.approvableOn),
});

/**
 * «Mis pagos»: a Salary Payment with its receipt link on the route the
 * caller read it from (BKO-008), or none when it has no photo.
 */
export const ownSalaryPayment = (
  {
    receiptImageAssetId,
    ...payment
  }: {
    id: string;
    amountCentavos: number;
    paidOn: Date;
    receiptImageAssetId: string | null;
  },
  receiptsPath: string,
) => ({
  ...payment,
  paidOn: payment.paidOn.toISOString().slice(0, 10),
  receiptUrl:
    receiptImageAssetId === null
      ? null
      : `${receiptsPath}/${payment.id}/receipt`,
});
