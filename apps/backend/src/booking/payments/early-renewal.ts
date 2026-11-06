import { PaymentRuleError } from './payment-errors';
import { isSubscriptionEffective } from './purchase-eligibility';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export type RenewalSubscription = {
  id: string;
  startsOn: Date;
  endsOn: Date;
  remainingClassAllowance: number;
  extraClasses: number;
  futureBookedCount: number;
  courtesy: boolean;
};

export type RenewalDecision = {
  startsOn: Date;
  chosen: boolean;
  subscriptionIdToEndEarly: string | null;
  endsOn?: Date;
};

// booking ADR-0013: the next Plan of a Subscription that still holds classes
// starts on a chosen day from the day after its end through this many days
// after it.
export const nextPlanStartWindowDays = 28;

// No date, or one before the window (older builds send today), is the day
// after the end; a date past the window is refused.
const nextPlanStart = (currentEndsOn: Date, requested: Date | null): Date => {
  const earliest = new Date(currentEndsOn.getTime() + dayMilliseconds);
  if (requested === null || requested.getTime() < earliest.getTime()) {
    return earliest;
  }
  const latest =
    currentEndsOn.getTime() + nextPlanStartWindowDays * dayMilliseconds;
  if (requested.getTime() > latest) {
    throw new PaymentRuleError(
      'start_date_out_of_window',
      'Start Date is outside the next Plan window',
    );
  }
  return requested;
};

// booking ADR-0005: with classes left (base allowance, extra classes, or a
// future booked Session, the same facts isSubscriptionEffective uses), the
// next Plan starts after the current one ends, inside ADR-0013's window.
// With none left, it starts on the chosen Start Date and the current one ends
// the day before. A Guest Pass or Courtesy Access is never renewed: the paid
// Plan starts on its chosen date and the courtesy one ends (H17). Only one
// future Subscription may exist.
export const decideRenewal = (context: {
  today: Date;
  current: RenewalSubscription;
  futureSubscriptionId: string | null;
  requested: Date | null;
}): RenewalDecision => {
  if (context.futureSubscriptionId !== null) {
    throw new PaymentRuleError(
      'future_subscription_exists',
      'A future Subscription already exists',
    );
  }

  if (
    !context.current.courtesy &&
    isSubscriptionEffective(context.current, context.today)
  ) {
    return {
      startsOn: nextPlanStart(context.current.endsOn, context.requested),
      chosen: false,
      subscriptionIdToEndEarly: null,
    };
  }

  const startsOn = context.requested ?? context.today;
  return {
    startsOn,
    chosen: true,
    subscriptionIdToEndEarly: context.current.id,
    endsOn: new Date(startsOn.getTime() - dayMilliseconds),
  };
};
