import { decideRenewal } from './early-renewal';
import { PaymentRuleError } from './payment-errors';

export type PurchasablePlan = {
  hiddenAt: Date | null;
  priceCentavos: number;
};

export type ActiveSubscriptionFacts = {
  id: string;
  startsOn: Date;
  endsOn: Date;
  remainingClassAllowance: number;
  futureBookedCount: number;
};

export type PurchaseEligibilityContext = {
  today: Date;
  plan: PurchasablePlan | null;
  activeSubscription: ActiveSubscriptionFacts | null;
  futureSubscriptionId: string | null;
  openPurchaseIntentId: string | null;
  pendingPaymentId: string | null;
};

export type PurchaseEligibility = {
  subscriptionIdToExpire: string | null;
};

// A Subscription is effective while it is paid through today and still has
// classes to use or future booked Sessions; otherwise the purchase expires it.
export const isSubscriptionEffective = (
  subscription: Pick<
    ActiveSubscriptionFacts,
    'endsOn' | 'remainingClassAllowance' | 'futureBookedCount'
  >,
  today: Date,
): boolean =>
  subscription.endsOn.getTime() >= today.getTime() &&
  (subscription.remainingClassAllowance > 0 ||
    subscription.futureBookedCount > 0);

// What blocks any new Subscription for the Client, however it is granted: an
// open Intent, a pending Payment, or a future Subscription already queued.
// An effective Subscription no longer blocks a purchase (booking ADR-0005):
// it is an Early Renewal. subscription_not_expired stays in the error catalog
// so older store builds still parse it, and nothing here raises it.
export const evaluateAllocationEligibility = (
  context: Omit<PurchaseEligibilityContext, 'plan'>,
): PurchaseEligibility => {
  if (context.openPurchaseIntentId !== null) {
    throw new PaymentRuleError(
      'purchase_intent_open_exists',
      'An open Purchase Intent already exists',
    );
  }
  if (context.pendingPaymentId !== null) {
    throw new PaymentRuleError(
      'payment_pending_exists',
      'A Payment is pending review',
    );
  }
  if (context.activeSubscription === null) {
    return { subscriptionIdToExpire: null };
  }
  if (context.futureSubscriptionId !== null) {
    throw new PaymentRuleError(
      'future_subscription_exists',
      'A future Subscription already exists',
    );
  }
  // A Subscription that still holds is shortened by the renewal when it has
  // no classes left, not expired. One whose paid-through date has passed is
  // reported so the caller expires it. Ending it early is only the renewal
  // that starts today, and that still needs the row active.
  if (
    isSubscriptionEffective(context.activeSubscription, context.today) ||
    context.activeSubscription.endsOn.getTime() >= context.today.getTime()
  ) {
    return { subscriptionIdToExpire: null };
  }

  return { subscriptionIdToExpire: context.activeSubscription.id };
};

export const renewalOf = (
  context: PurchaseEligibilityContext,
  requested: Date | null,
) =>
  context.activeSubscription === null
    ? null
    : decideRenewal({
        today: context.today,
        current: context.activeSubscription,
        futureSubscriptionId: context.futureSubscriptionId,
        requested,
      });

export const evaluatePurchaseEligibility = (
  context: PurchaseEligibilityContext,
): PurchaseEligibility => {
  if (
    context.plan === null ||
    context.plan.hiddenAt !== null ||
    context.plan.priceCentavos <= 0
  ) {
    throw new PaymentRuleError(
      'plan_not_purchasable',
      'Plan is not available for purchase',
    );
  }
  return evaluateAllocationEligibility(context);
};
