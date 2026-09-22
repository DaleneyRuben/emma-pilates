import { PaymentRuleError } from './payment-errors';

export type PurchasablePlan = {
  hiddenAt: Date | null;
  priceCentavos: number;
};

export type ActiveSubscriptionFacts = {
  id: string;
  endsOn: Date;
  remainingClassAllowance: number;
  futureBookedCount: number;
};

export type PurchaseEligibilityContext = {
  today: Date;
  plan: PurchasablePlan | null;
  activeSubscription: ActiveSubscriptionFacts | null;
  openPurchaseIntentId: string | null;
  pendingPaymentId: string | null;
};

export type PurchaseEligibility = {
  subscriptionIdToExpire: string | null;
};

// A Subscription is effective while it is paid through today and still has
// classes to use or future booked Sessions; otherwise the purchase expires it.
const isEffective = (
  subscription: ActiveSubscriptionFacts,
  today: Date,
): boolean =>
  subscription.endsOn.getTime() >= today.getTime() &&
  (subscription.remainingClassAllowance > 0 ||
    subscription.futureBookedCount > 0);

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
  if (isEffective(context.activeSubscription, context.today)) {
    throw new PaymentRuleError(
      'subscription_not_expired',
      'The current Subscription is still active',
    );
  }

  return { subscriptionIdToExpire: context.activeSubscription.id };
};
