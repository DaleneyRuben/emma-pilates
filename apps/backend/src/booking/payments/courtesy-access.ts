import { PaymentRuleError } from './payment-errors';
import {
  evaluateAllocationEligibility,
  type PurchaseEligibility,
  type PurchaseEligibilityContext,
} from './purchase-eligibility';

// REL-011 (booking ADR-0012): the hidden Bs 0 Plan an Administrator grants so
// a closed-test tester or a store reviewer can book without paying. The
// one-month duration is only the catalog value; the Subscription ends on the
// date the Administrator chooses.
export const courtesyAccessPlan = {
  name: 'Acceso de prueba',
  classAllowance: 16,
  durationMonths: 1,
  priceCentavos: 0,
} as const;

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
  return evaluateAllocationEligibility(context);
};
