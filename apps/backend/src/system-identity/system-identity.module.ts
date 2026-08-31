import { createHmac, randomUUID } from 'node:crypto';
import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PgBoss } from 'pg-boss';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { createPgBoss, startInstalledPgBoss } from '../jobs/pg-boss-runtime';
import { CancelPendingClientRegistration } from './registration/cancel-pending-client-registration';
import { ClientEmailVerificationController } from './registration/client-email-verification.controller';
import { ClientRegistrationController } from './registration/client-registration.controller';
import { CorrectPendingClientEmail } from './registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from './registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from './registration/register-client';
import { ResendPendingClientVerification } from './registration/resend-pending-client-verification';
import { VerifyClientEmail } from './registration/verify-client-email';
import { argon2PasswordHasher } from './security/argon2-password-hasher';
import { AuthenticationLinkCipher } from './security/authentication-link-cipher';
import { authenticationTokens } from './security/authentication-token-service';

const registrationGateway = Symbol('registrationGateway');
const registrationPgBoss = Symbol('registrationPgBoss');
const systemIdentityPrisma = Symbol('systemIdentityPrisma');

class SystemIdentityRuntimeCleanup implements OnApplicationShutdown {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly boss: PgBoss,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.boss.stop({ graceful: true });
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

@Module({
  controllers: [
    ClientEmailVerificationController,
    ClientRegistrationController,
  ],
  providers: [
    {
      provide: systemIdentityPrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: new PrismaPg({
            connectionString: config.getOrThrow('DATABASE_URL'),
          }),
        }),
    },
    {
      provide: registrationPgBoss,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Environment, true>) => {
        const boss = await createPgBoss(config.getOrThrow('DATABASE_URL'));
        await startInstalledPgBoss(boss);
        return boss;
      },
    },
    {
      provide: AuthenticationLinkCipher,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new AuthenticationLinkCipher(
          config.getOrThrow<string>('AUTHENTICATION_LINK_ENCRYPTION_KEY_ID'),
          Buffer.from(
            config.getOrThrow<string>('AUTHENTICATION_LINK_ENCRYPTION_KEY'),
            'base64',
          ),
        ),
    },
    {
      provide: registrationGateway,
      inject: [systemIdentityPrisma, registrationPgBoss, ConfigService],
      useFactory: (
        prisma: PrismaClient,
        boss: PgBoss,
        config: ConfigService<Environment, true>,
      ) =>
        new PrismaClientRegistrationUnitOfWork({
          prisma,
          boss,
          digestEmail: (email) =>
            createHmac(
              'sha256',
              config.getOrThrow('AUTHENTICATION_EMAIL_DIGEST_KEY'),
            )
              .update(email)
              .digest(),
        }),
    },
    {
      provide: RegisterClient,
      inject: [registrationGateway, AuthenticationLinkCipher],
      useFactory: (
        unitOfWork: PrismaClientRegistrationUnitOfWork,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new RegisterClient({
          unitOfWork,
          passwordHasher: argon2PasswordHasher,
          tokenIssuer: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
          newReferralCode: () => `REF-${randomUUID()}`,
        }),
    },
    {
      provide: CorrectPendingClientEmail,
      inject: [registrationGateway, AuthenticationLinkCipher],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new CorrectPendingClientEmail({
          gateway,
          tokens: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: ResendPendingClientVerification,
      inject: [registrationGateway, AuthenticationLinkCipher],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new ResendPendingClientVerification({
          gateway,
          tokens: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: CancelPendingClientRegistration,
      inject: [registrationGateway],
      useFactory: (gateway: PrismaClientRegistrationUnitOfWork) =>
        new CancelPendingClientRegistration({
          gateway,
          tokens: authenticationTokens,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: VerifyClientEmail,
      inject: [registrationGateway],
      useFactory: (gateway: PrismaClientRegistrationUnitOfWork) =>
        new VerifyClientEmail({
          gateway,
          tokens: authenticationTokens,
          now: () => new Date(),
        }),
    },
    {
      provide: SystemIdentityRuntimeCleanup,
      inject: [systemIdentityPrisma, registrationPgBoss],
      useFactory: (prisma: PrismaClient, boss: PgBoss) =>
        new SystemIdentityRuntimeCleanup(prisma, boss),
    },
  ],
})
export class SystemIdentityModule {}
