import { randomUUID } from 'node:crypto';
import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import type { PrismaClient } from '../../generated/prisma/client';
import { PrismaAuthenticationGateway } from '../authentication/prisma-authentication-gateway';
import { authenticationDigest } from '../security/authentication-digest';
import { authenticationTokens } from '../security/authentication-token-service';
import {
  exchangeBiometricKey,
  issueBiometricKey,
  revokeBiometricKey,
  type BiometricKeyDependencies,
} from './biometric-keys';
import {
  BiometricKeysController,
  biometricKeyOperations,
  type BiometricKeyOperations,
} from './biometric-keys.controller';
import { createPrismaBiometricKeyGateway } from './prisma-biometric-key-gateway';

// MOB-006's slice, wired like email-change so system-identity.module.ts,
// already past the file-size limit, gains two lines.
export const biometricKeysWiring = {
  controllers: [BiometricKeysController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: biometricKeyOperations,
      inject: [prismaToken, ConfigService],
      useFactory: (
        prisma: PrismaClient,
        config: ConfigService<Environment, true>,
      ): BiometricKeyOperations => {
        // Failed exchanges count against Login's own throttle lanes.
        const logins = new PrismaAuthenticationGateway(prisma);
        const dependencies: BiometricKeyDependencies = {
          gateway: {
            ...createPrismaBiometricKeyGateway(prisma),
            readThrottleEvents: (input) => logins.readThrottleEvents(input),
            recordFailedCredentialCheck: (input) =>
              logins.recordFailedCredentialCheck(input),
          },
          digestSignal: authenticationDigest(config),
          tokens: authenticationTokens,
          now: () => new Date(),
          newId: randomUUID,
        };
        return {
          issue: (principal, command) =>
            issueBiometricKey(principal, command, dependencies),
          exchange: (command) => exchangeBiometricKey(command, dependencies),
          revoke: (command) => revokeBiometricKey(command, dependencies),
        };
      },
    },
  ],
};
