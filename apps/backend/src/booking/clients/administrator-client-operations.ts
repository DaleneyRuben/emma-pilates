import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  listAdministratorClients,
  readAdministratorClient,
} from './administrator-clients';
import {
  administratorClientOperations,
  type AdministratorClientOperations,
} from './administrator-clients.controller';
import { createPrismaAdministratorClients } from './prisma-administrator-clients';

// Kept out of booking.module.ts, which already exceeds the file-size limit.
export const administratorClientProvider = (prismaToken: symbol): Provider => ({
  provide: administratorClientOperations,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient): AdministratorClientOperations => {
    const dependencies = {
      directory: createPrismaAdministratorClients(prisma),
      now: () => new Date(),
    };
    return {
      list: (query, principal) =>
        listAdministratorClients(query, principal, dependencies),
      read: (command, principal) =>
        readAdministratorClient(command, principal, dependencies),
    };
  },
});
