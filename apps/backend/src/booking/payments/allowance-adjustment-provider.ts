import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import {
  allowanceAdjustmentCommand,
  type AllowanceAdjustmentCommand,
} from './allowance-adjustment.controller';
import { recordAdministratorAdjustment } from './record-allowance-adjustment';

export const allowanceAdjustmentProvider = (prismaToken: symbol): Provider => ({
  provide: allowanceAdjustmentCommand,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient): AllowanceAdjustmentCommand => {
    return (command, principal: AuthenticatedPrincipal) =>
      prisma.$transaction((transaction) =>
        recordAdministratorAdjustment(command, {
          principal,
          now: new Date(),
          findSubscription: async (clientId) => {
            const active = await transaction.subscription.findFirst({
              where: {
                clientId,
                state: 'ACTIVE',
                startsOn: { lte: boliviaDate(new Date()) },
                endsOn: { gte: boliviaDate(new Date()) },
              },
              select: { id: true },
            });
            return active;
          },
          record: (input) =>
            recordAllowanceAdjustment(transaction, {
              ...input,
              author: {
                accountId: input.authorAccountId,
                role: 'ADMINISTRATOR',
              },
              correlationId: input.subscriptionId,
            }),
        }),
      );
  },
});
