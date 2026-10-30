import type { Prisma } from '../../generated/prisma/client';
import { PaymentRuleError } from './payment-errors';

type Transaction = Prisma.TransactionClient;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

// One pending Payment per Client per kind. A race that passes the read
// still hits the partial unique index, and that is a conflict, not a 500.
export const createPendingPayment = async (
  transaction: Transaction,
  data: Prisma.PaymentCreateArgs['data'],
): Promise<{ id: string }> => {
  try {
    return await transaction.payment.create({ data, select: { id: true } });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    throw new PaymentRuleError(
      'payment_pending_exists',
      'A Payment is pending review',
    );
  }
};
