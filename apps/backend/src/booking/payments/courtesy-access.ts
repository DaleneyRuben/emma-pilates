import type {
  PurchaseEligibility,
  PurchaseEligibilityContext,
} from './purchase-eligibility';

export const courtesyAccessPlan = {} as const;

export type CourtesyGrantContext = Omit<PurchaseEligibilityContext, 'plan'> & {
  endsOn: Date;
};

export const evaluateCourtesyGrant = (
  context: CourtesyGrantContext,
): PurchaseEligibility => {
  throw new Error(`Not implemented for ${context.endsOn.toISOString()}`);
};
