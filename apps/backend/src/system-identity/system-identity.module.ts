import { createHmac, randomUUID } from 'node:crypto';
import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PgBoss } from 'pg-boss';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { createPgBoss } from '../jobs/pg-boss-runtime';
import { CancelPendingClientRegistration } from './registration/cancel-pending-client-registration';
import { ClientEmailVerificationController } from './registration/client-email-verification.controller';
import { ClientRegistrationController } from './registration/client-registration.controller';
import { CorrectPendingClientEmail } from './registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from './registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from './registration/register-client';
import { ResendPendingClientVerification } from './registration/resend-pending-client-verification';
import { VerifyClientEmail } from './registration/verify-client-email';
import { Argon2PasswordHasher } from './security/argon2-password-hasher';
import { AuthenticationLinkCipher } from './security/authentication-link-cipher';
import { AuthenticationTokenService } from './security/authentication-token-service';

const registrationGateway = Symbol('registrationGateway');
const registrationPgBoss = Symbol('registrationPgBoss');
const systemIdentityPrisma = Symbol('systemIdentityPrisma');

class SystemIdentityRuntimeCleanup implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
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
      useFactory: (config: ConfigService<Environment, true>) =>
        createPgBoss(config.getOrThrow('DATABASE_URL')),
    },
    {
      provide: AuthenticationTokenService,
      useFactory: () => new AuthenticationTokenService(),
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
      provide: Argon2PasswordHasher,
      useFactory: () => new Argon2PasswordHasher(),
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
      inject: [
        registrationGateway,
        Argon2PasswordHasher,
        AuthenticationTokenService,
        AuthenticationLinkCipher,
      ],
      useFactory: (
        unitOfWork: PrismaClientRegistrationUnitOfWork,
        passwordHasher: Argon2PasswordHasher,
        tokenIssuer: AuthenticationTokenService,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new RegisterClient({
          unitOfWork,
          passwordHasher,
          tokenIssuer,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
          newReferralCode: () => `REF-${randomUUID()}`,
        }),
    },
    {
      provide: CorrectPendingClientEmail,
      inject: [
        registrationGateway,
        AuthenticationTokenService,
        AuthenticationLinkCipher,
      ],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        tokens: AuthenticationTokenService,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new CorrectPendingClientEmail({
          gateway,
          tokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: ResendPendingClientVerification,
      inject: [
        registrationGateway,
        AuthenticationTokenService,
        AuthenticationLinkCipher,
      ],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        tokens: AuthenticationTokenService,
        linkCipher: AuthenticationLinkCipher,
      ) =>
        new ResendPendingClientVerification({
          gateway,
          tokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: CancelPendingClientRegistration,
      inject: [registrationGateway, AuthenticationTokenService],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        tokens: AuthenticationTokenService,
      ) =>
        new CancelPendingClientRegistration({
          gateway,
          tokens,
          now: () => new Date(),
          newId: randomUUID,
        }),
    },
    {
      provide: VerifyClientEmail,
      inject: [registrationGateway, AuthenticationTokenService],
      useFactory: (
        gateway: PrismaClientRegistrationUnitOfWork,
        tokens: AuthenticationTokenService,
      ) =>
        new VerifyClientEmail({
          gateway,
          tokens,
          now: () => new Date(),
        }),
    },
    {
      provide: SystemIdentityRuntimeCleanup,
      inject: [systemIdentityPrisma],
      useFactory: (prisma: PrismaClient) =>
        new SystemIdentityRuntimeCleanup(prisma),
    },
  ],
})
export class SystemIdentityModule {}
