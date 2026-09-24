import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  administratorPaymentOperations,
  type AdministratorPaymentOperations,
} from './administrator-payment-list.controller';
import { listAdministratorPayments } from './administrator-payments';
import { createPrismaAdministratorPayments } from './prisma-administrator-payments';

export const administratorPaymentProvider = (
  prismaToken: symbol,
): Provider => ({
  provide: administratorPaymentOperations,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient): AdministratorPaymentOperations => {
    const ledger = createPrismaAdministratorPayments(prisma);
    return {
      list: (query, principal) =>
        listAdministratorPayments(query, principal, { ledger }),
    };
  },
});
