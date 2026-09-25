import { randomUUID } from 'node:crypto';
import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { AuthenticationLinkCipher } from '../security/authentication-link-cipher';
import { authenticationTokens } from '../security/authentication-token-service';
import {
  staffAccountRuntime,
  type StaffAccountRuntime,
} from '../staff-accounts/staff-accounts';
import {
  cancelEmailChange,
  completeEmailChange,
  readPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
  type EmailChangeDependencies,
} from './email-change';
import {
  EmailChangeController,
  emailChangeOperations,
  type EmailChangeOperations,
} from './email-change.controller';
import { createPrismaEmailChangeGateway } from './prisma-email-change-gateway';

// IDN-008's slice, wired here so system-identity.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const emailChangeWiring = {
  controllers: [EmailChangeController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: emailChangeOperations,
      inject: [prismaToken, staffAccountRuntime, AuthenticationLinkCipher],
      useFactory: (
        prisma: PrismaClient,
        runtime: StaffAccountRuntime,
        linkCipher: AuthenticationLinkCipher,
      ): EmailChangeOperations => {
        const dependencies: EmailChangeDependencies = {
          gateway: createPrismaEmailChangeGateway(prisma, {
            boss: runtime.boss,
            digestEmail: runtime.digestEmail,
          }),
          tokens: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        };
        return {
          request: (command, principal) =>
            requestEmailChange(command, principal, dependencies),
          resend: (principal) => resendEmailChange(principal, dependencies),
          cancel: (principal) => cancelEmailChange(principal, dependencies),
          readPending: (principal) =>
            readPendingEmailChange(principal, dependencies),
          complete: (command) => completeEmailChange(command, dependencies),
        };
      },
    },
  ],
};
