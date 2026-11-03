import type { Prisma } from '../../generated/prisma/client';
import { PaymentRuleError } from './payment-errors';

export type ReferralProblem = { code: string; detail: string; status: number };

// Lets the registration transport report attribution failures without
// depending on the wider payment error module.
export const referralProblem = (error: unknown): ReferralProblem | null =>
  error instanceof PaymentRuleError
    ? { code: error.code, detail: error.message, status: error.status }
    : null;

// Referral attribution happens once, inside the registration transaction, and
// is immutable afterwards (PAY-001). It names the Client who holds the code
// (BKM-017), found by the acquisition record, never the code's text.
export const attributeReferral = async (
  transaction: Prisma.TransactionClient,
  input: { referredClientId: string; referrerClientId: string },
): Promise<void> => {
  if (input.referrerClientId === input.referredClientId) {
    throw new PaymentRuleError(
      'referral_self_reference',
      'A Client cannot refer themselves',
    );
  }

  await transaction.referral.create({
    data: {
      referrerClientId: input.referrerClientId,
      referredClientId: input.referredClientId,
    },
  });
};
