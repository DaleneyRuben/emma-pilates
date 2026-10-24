import { PaymentRuleError } from './payment-errors';
import { isSubscriptionEffective } from './purchase-eligibility';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export type RenewalSubscription = {
  id: string;
  startsOn: Date;
  endsOn: Date;
  remainingClassAllowance: number;
  futureBookedCount: number;
};

export type RenewalDecision = {
  startsOn: Date;
  chosen: boolean;
  subscriptionIdToEndEarly: string | null;
  endsOn?: Date;
};

// booking ADR-0005: with classes left (base allowance or a future booked
// Session, the same facts isSubscriptionEffective uses), the next Plan starts
// the day after the current one ends and no date is chosen. With none left,
// it starts on the chosen Start Date and the current one ends the day before.
// Only one future Subscription may exist.
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

  if (isSubscriptionEffective(context.current, context.today)) {
    return {
      startsOn: new Date(context.current.endsOn.getTime() + dayMilliseconds),
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
