import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import {
  readAssistantLastInvoiceData,
  readClientLastInvoiceData,
} from './invoice-data';
import {
  AssistantInvoiceDataController,
  ClientInvoiceDataController,
  invoiceDataOperations,
  type InvoiceDataOperations,
} from './invoice-data.controller';
import { createPrismaInvoiceData } from './prisma-invoice-data';

// PAY-007's slice, wired here so booking.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const invoiceDataWiring = {
  controllers: [ClientInvoiceDataController, AssistantInvoiceDataController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: invoiceDataOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): InvoiceDataOperations => {
        const gateway = createPrismaInvoiceData(prisma);
        return {
          readClient: (principal) =>
            readClientLastInvoiceData(principal, { gateway }),
          readAssistant: (command, principal) =>
            readAssistantLastInvoiceData(command, principal, { gateway }),
        };
      },
    },
  ],
};
