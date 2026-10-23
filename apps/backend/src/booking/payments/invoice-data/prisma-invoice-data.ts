import type { PrismaClient } from '../../../generated/prisma/client';
import type { InvoiceDataGateway } from './invoice-data';

export const createPrismaInvoiceData = (
  prisma: PrismaClient,
): InvoiceDataGateway => {
  void prisma;
  return {
    lastFor: () => Promise.reject(new Error('Not implemented')),
    setIssued: () => Promise.reject(new Error('Not implemented')),
  };
};
