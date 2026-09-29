import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  AccountClosureController,
  accountClosureOperations,
} from './account-closure.controller';
import { createPrismaAccountClosure } from './prisma-account-closure';

// Kept out of booking.module.ts, which already exceeds the file-size limit.
export const accountClosure = {
  controllers: [AccountClosureController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: accountClosureOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient) =>
        createPrismaAccountClosure(prisma, { now: () => new Date() }),
    },
  ],
};
