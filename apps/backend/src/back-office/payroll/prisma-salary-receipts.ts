import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  receiptObject,
  receiptObjectSelect,
  type ReceiptVariant,
} from '../../uploads/private-image-object';
import {
  BackOfficeError,
  requireAdministrator,
  requireTrainer,
} from '../back-office-errors';

type ReceiptCommand = { salaryPaymentId: string; variant: ReceiptVariant };

// BKO-008: Nómina reads any Salary Payment's receipt for the Administrator;
// «Mis pagos» reads a Trainer's own, and someone else's reads as missing.
export const createPrismaSalaryReceipts = (prisma: PrismaClient) => {
  const read = async (
    command: ReceiptCommand,
    staffMemberId: string | null,
  ) => {
    const payment = await prisma.salaryPayment.findFirst({
      where: {
        id: command.salaryPaymentId,
        ...(staffMemberId === null ? {} : { staffMemberId }),
      },
      select: {
        receiptImageAsset: { select: receiptObjectSelect(command.variant) },
      },
    });
    if (payment === null) {
      throw new BackOfficeError('salary_payment_not_found');
    }
    const receipt = receiptObject(payment.receiptImageAsset);
    if (receipt === null) {
      throw new BackOfficeError('salary_receipt_not_found');
    }
    return receipt;
  };

  return {
    readAnySalaryReceipt: async (
      command: ReceiptCommand,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      return read(command, null);
    },
    readOwnSalaryReceipt: async (
      command: ReceiptCommand,
      principal: AuthenticatedPrincipal,
    ) => read(command, requireTrainer(principal)),
  };
};

export type SalaryReceipts = ReturnType<typeof createPrismaSalaryReceipts>;
