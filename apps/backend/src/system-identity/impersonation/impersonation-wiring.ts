import { randomUUID } from 'node:crypto';
import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { endImpersonation, startImpersonation } from './impersonation';
import {
  ImpersonationController,
  impersonationOperations,
  type ImpersonationOperations,
} from './impersonation.controller';
import { PrismaImpersonationGateway } from './prisma-impersonation-gateway';

export const impersonationGateway = Symbol('impersonationGateway');

// FUT-001's slice, wired like email-change so system-identity.module.ts,
// already past the file-size limit, gains two lines.
export const impersonationWiring = {
  controllers: [ImpersonationController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: impersonationGateway,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient) =>
        new PrismaImpersonationGateway(prisma),
    },
    {
      provide: impersonationOperations,
      inject: [impersonationGateway],
      useFactory: (
        gateway: PrismaImpersonationGateway,
      ): ImpersonationOperations => ({
        start: (command, principal) =>
          startImpersonation(command, principal, {
            gateway,
            now: () => new Date(),
            newId: randomUUID,
          }),
        end: (principal) =>
          endImpersonation(principal, { gateway, now: () => new Date() }),
      }),
    },
  ],
};
