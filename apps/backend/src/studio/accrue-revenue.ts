// STU-002 / decisions section 11. A Plan Payment accrues across the
// Subscription's validity days, startsOn through endsOn inclusive. Each month
// takes the rounded cumulative share at its end (today while it runs) minus
// the share at its start,
// so the months always sum to the amount paid. An Evaluation is one service
// on its decision date: «Caja» and «Devengado» in that month, never deferred,
// as the income report counts it. Money is centavos; dates are civil dates.

export type AccrualPayment = {
  id: string;
  kind: 'plan' | 'evaluation';
  amountCentavos: number;
  decidedOn: Date;
  startsOn: Date | null;
  endsOn: Date | null;
  state: 'confirmed' | 'voided';
  excludedFromAnalytics: boolean;
};

const dayMilliseconds = 86_400_000;

const dayCount = (from: Date, until: Date) =>
  Math.round((until.getTime() - from.getTime()) / dayMilliseconds);

const nextMonth = (monthStart: Date) =>
  new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
  );

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

// The rounded share of the amount for the days before `until`.
const accruedBefore = (
  amountCentavos: number,
  startsOn: Date,
  span: number,
  until: Date,
) =>
  Math.round(
    (amountCentavos * clamp(dayCount(startsOn, until), 0, span)) / span,
  );

export const accrueRevenue = (
  payments: AccrualPayment[],
  monthStart: Date,
  today: Date,
) => {
  const monthEnd = nextMonth(monthStart);
  // Both are measured when the month closes, or today while it runs, so a
  // running month's «Devengado» and «Diferido» add up (FIX-022). A month not
  // yet started accrues nothing.
  const asOf = today < monthEnd ? today : monthEnd;
  const accrualEnd = asOf < monthStart ? monthStart : asOf;
  let accruedCentavos = 0;
  let cashCentavos = 0;
  let deferredCentavos = 0;
  for (const payment of payments) {
    if (payment.state !== 'confirmed' || payment.excludedFromAnalytics)
      continue;
    const decidedInMonth =
      payment.decidedOn >= monthStart && payment.decidedOn < monthEnd;
    if (decidedInMonth) cashCentavos += payment.amountCentavos;
    if (
      payment.kind === 'evaluation' ||
      payment.startsOn === null ||
      payment.endsOn === null
    ) {
      if (decidedInMonth) accruedCentavos += payment.amountCentavos;
      continue;
    }
    const { startsOn } = payment;
    const span = Math.max(1, dayCount(startsOn, payment.endsOn) + 1);
    const share = (until: Date) =>
      accruedBefore(payment.amountCentavos, startsOn, span, until);
    accruedCentavos += share(accrualEnd) - share(monthStart);
    if (payment.decidedOn <= today && payment.decidedOn < monthEnd) {
      // What is not yet accrued, from the same rounding, so the two never
      // pass the amount by a centavo.
      deferredCentavos += payment.amountCentavos - share(asOf);
    }
  }
  return { accruedCentavos, cashCentavos, deferredCentavos };
};
