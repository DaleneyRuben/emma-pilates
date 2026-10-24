// STU-002 / decisions section 11. A Payment accrues across the Subscription's
// validity days. Each month rounds half up, and the last month absorbs the
// remainder so the months sum to the amount paid. Money is centavos.

export type AccrualPayment = {
  id: string;
  amountCentavos: number;
  decidedOn: Date;
  startsOn: Date;
  endsOn: Date;
  state: 'confirmed' | 'voided';
  excludedFromAnalytics: boolean;
};

const dayCount = (from: Date, until: Date) =>
  Math.round((until.getTime() - from.getTime()) / 86_400_000);

const monthEnd = (monthStart: Date) =>
  new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
  );

const overlapDays = (from: Date, until: Date, monthStart: Date) => {
  const start = from > monthStart ? from : monthStart;
  const end = until < monthEnd(monthStart) ? until : monthEnd(monthStart);
  if (end < start) return 0;
  return dayCount(start, end);
};

export const accrueRevenue = (
  payments: AccrualPayment[],
  monthStart: Date,
  today: Date,
) => {
  let accruedCentavos = 0;
  let cashCentavos = 0;
  let deferredCentavos = 0;
  for (const payment of payments) {
    if (payment.state !== 'confirmed' || payment.excludedFromAnalytics)
      continue;
    const span = dayCount(payment.startsOn, payment.endsOn);
    const daysBefore = dayCount(payment.startsOn, monthStart);
    const daysThroughMonthEnd = dayCount(
      payment.startsOn,
      monthEnd(monthStart) < payment.endsOn
        ? monthEnd(monthStart)
        : payment.endsOn,
    );
    const accruedThroughMonthEnd = Math.round(
      (payment.amountCentavos * Math.max(daysThroughMonthEnd, 0)) / span,
    );
    const accruedBefore = Math.round(
      (payment.amountCentavos * Math.max(daysBefore, 0)) / span,
    );
    const isLastMonth = monthEnd(monthStart) >= payment.endsOn;
    // A month after the Subscription ended has no days left. Rounding the
    // earlier months half up can already equal the amount, so absorbing a
    // remainder here would make the month negative.
    if (daysBefore < span) {
      accruedCentavos += isLastMonth
        ? payment.amountCentavos - accruedBefore
        : accruedThroughMonthEnd - accruedBefore;
    }
    if (
      payment.decidedOn >= monthStart &&
      payment.decidedOn <= monthEnd(monthStart)
    ) {
      cashCentavos += payment.amountCentavos;
    }
    const accruedDays = overlapDays(
      payment.startsOn,
      payment.endsOn < today ? payment.endsOn : today,
      payment.startsOn,
    );
    deferredCentavos +=
      payment.amountCentavos -
      Math.round((payment.amountCentavos * accruedDays) / span);
  }
  return { accruedCentavos, cashCentavos, deferredCentavos };
};
