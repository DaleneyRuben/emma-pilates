import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ReceiptVariant } from '../../uploads/private-image-object';
import { BackOfficeError } from '../back-office-errors';

export const createPrismaSalaryReceipts = (prisma: PrismaClient) => ({
  readSalaryReceipt: (
    command: { salaryPaymentId: string; variant: ReceiptVariant },
    principal: AuthenticatedPrincipal,
  ): Promise<{ objectKey: string; mediaType: string }> =>
    Promise.reject(
      new BackOfficeError(
        prisma === undefined || command === undefined || principal === undefined
          ? 'salary_receipt_not_found'
          : 'salary_receipt_not_found',
      ),
    ),
});

export type SalaryReceipts = ReturnType<typeof createPrismaSalaryReceipts>;
