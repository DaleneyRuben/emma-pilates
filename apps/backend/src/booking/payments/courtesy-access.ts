import { PaymentRuleError } from './payment-errors';
import {
  evaluateAllocationEligibility,
  isSubscriptionEffective,
  type PurchaseEligibility,
  type PurchaseEligibilityContext,
} from './purchase-eligibility';

// REL-011 (booking ADR-0012), read through BKM-005: the hidden Bs 0 Plan an
// Administrator grants so a closed-test tester or a store reviewer can book
// without paying. Its catalog validity is 30 days, the day count that
// replaced the one-month placeholder; the Subscription still ends on the
// date the Administrator chooses. Clients see its name on Inicio, so it never
// says «prueba»: App Review rejects anything that reads as a trial or beta.
export const courtesyAccessPlan = {
  name: 'Plan de cortesía',
  classAllowance: 16,
  durationDays: 30,
  priceCentavos: 0,
} as const;

/** The name the hidden Plan had before 2026-11-22; a grant renames it. */
export const legacyCourtesyPlanName = 'Acceso de prueba';

const longestAccessDays = 365;
const dayMilliseconds = 24 * 60 * 60 * 1_000;

export type CourtesyGrantContext = Omit<PurchaseEligibilityContext, 'plan'> & {
  /** Bolivia civil date at UTC midnight: the last day of access. */
  endsOn: Date;
};

export const evaluateCourtesyGrant = (
  context: CourtesyGrantContext,
): PurchaseEligibility => {
  const latest = context.today.getTime() + longestAccessDays * dayMilliseconds;
  if (
    context.endsOn.getTime() < context.today.getTime() ||
    context.endsOn.getTime() > latest
  ) {
    throw new PaymentRuleError(
      'courtesy_end_date_invalid',
      'Access must end between today and one year from today',
    );
  }
  const allocation = evaluateAllocationEligibility(context);
  // Courtesy Access is not a renewal. A Plan still in use blocks it; a
  // purchase of a real Plan continues and shortens that Plan instead.
  if (
    context.activeSubscription !== null &&
    isSubscriptionEffective(context.activeSubscription, context.today)
  ) {
    throw new PaymentRuleError(
      'subscription_not_expired',
      'The current Subscription is still active',
    );
  }
  return allocation;
};

// The start is only known once it is allocated (a later Start Date, or the
// day after a Plan in force): an end before it is refused, not a 500.
export const assertCourtesyTerm = (startsOn: Date, endsOn: Date): void => {
  if (endsOn.getTime() < startsOn.getTime()) {
    throw new PaymentRuleError(
      'courtesy_end_date_invalid',
      'Access must not end before it starts',
    );
  }
};
