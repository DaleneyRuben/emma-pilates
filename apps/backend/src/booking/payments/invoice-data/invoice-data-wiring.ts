import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import {
  markInvoiceIssued,
  readAssistantLastInvoiceData,
  readClientLastInvoiceData,
  unmarkInvoiceIssued,
} from './invoice-data';
import {
  AdministratorInvoiceIssuedController,
  AssistantInvoiceDataController,
  ClientInvoiceDataController,
  invoiceDataOperations,
  type InvoiceDataOperations,
} from './invoice-data.controller';
import { createPrismaInvoiceData } from './prisma-invoice-data';

// PAY-007's slice, wired here so booking.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const invoiceDataWiring = {
  controllers: [
    ClientInvoiceDataController,
    AssistantInvoiceDataController,
    AdministratorInvoiceIssuedController,
  ],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: invoiceDataOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): InvoiceDataOperations => {
        const gateway = createPrismaInvoiceData(prisma);
        const now = () => new Date();
        return {
          readClient: (principal) =>
            readClientLastInvoiceData(principal, { gateway }),
          readAssistant: (command, principal) =>
            readAssistantLastInvoiceData(command, principal, { gateway }),
          mark: (command, principal) =>
            markInvoiceIssued(command, principal, { gateway, now }),
          unmark: (command, principal) =>
            unmarkInvoiceIssued(command, principal, { gateway, now }),
        };
      },
    },
  ],
};
