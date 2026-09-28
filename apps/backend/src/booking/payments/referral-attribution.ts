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
// is immutable afterwards (PAY-001). The code belongs to the referring Client.
export const attributeReferral = async (
  transaction: Prisma.TransactionClient,
  input: { referredClientId: string; referralCode: string },
): Promise<void> => {
  const referrer = await transaction.client.findFirst({
    where: { referralCode: input.referralCode, deletedAt: null },
    select: { id: true },
  });
  if (referrer === null) {
    throw new PaymentRuleError(
      'referral_code_invalid',
      'Unknown referral code',
    );
  }
  if (referrer.id === input.referredClientId) {
    throw new PaymentRuleError(
      'referral_self_reference',
      'A Client cannot refer themselves',
    );
  }

  await transaction.referral.create({
    data: {
      referrerClientId: referrer.id,
      referredClientId: input.referredClientId,
    },
  });
};
