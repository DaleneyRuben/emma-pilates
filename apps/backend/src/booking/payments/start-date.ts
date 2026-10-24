import { PaymentRuleError } from './payment-errors';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export type StartDateContext = {
  today: Date;
  requested: Date | null;
  startDateLimitDays: number;
  openingDate: Date | null;
};

export type ResolvedStartDate = {
  startsOn: Date;
  chosen: boolean;
};

const sameDay = (left: Date, right: Date): boolean =>
  left.getTime() === right.getTime();

// booking ADR-0005: today by default, through today plus the Studio Settings
// limit, inclusive. Before the Opening Date, that date itself may be chosen
// even when it sits past the limit. A null Opening Date is no presale.
export const resolveStartDate = (
  context: StartDateContext,
): ResolvedStartDate => {
  const startsOn = context.requested ?? context.today;
  const latest =
    context.today.getTime() + context.startDateLimitDays * dayMilliseconds;
  const insideWindow =
    startsOn.getTime() >= context.today.getTime() &&
    startsOn.getTime() <= latest;
  const presale =
    context.openingDate !== null &&
    context.openingDate.getTime() > context.today.getTime() &&
    sameDay(startsOn, context.openingDate);

  if (!insideWindow && !presale) {
    throw new PaymentRuleError(
      'start_date_out_of_window',
      'Start Date is outside the allowed window',
    );
  }

  return { startsOn, chosen: true };
};
