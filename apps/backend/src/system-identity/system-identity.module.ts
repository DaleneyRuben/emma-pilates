import { createHmac, randomUUID } from 'node:crypto';
import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaAdapter } from '../database/prisma-adapter';
import type { PgBoss } from 'pg-boss';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { createPgBoss, startInstalledPgBoss } from '../jobs/pg-boss-runtime';
import { isOpenApiGeneration } from '../openapi/openapi-generation';
import {
  AccountSecurityController,
  accountActivation,
  authenticationLinkInspection,
  currentPasswordChange,
  passwordRecoveryCompletion,
  passwordRecoveryRequest,
} from './account-security/account-security.controller';
import {
  activateAccount,
  inspectAuthenticationLink,
} from './account-security/authentication-links';
import { changePassword } from './account-security/change-password';
import {
  completePasswordRecovery,
  requestPasswordRecovery,
} from './account-security/password-recovery';
import { PrismaAccountSecurityGateway } from './account-security/prisma-account-security-gateway';
import {
  authenticatedPrincipalResolver,
  AuthenticationController,
  currentSessionLogout,
  mobileLogin,
} from './authentication/authentication.controller';
import { login } from './authentication/login';
import { logout } from './authentication/logout';
import { PrismaAuthenticationGateway } from './authentication/prisma-authentication-gateway';
import { resolveAuthenticatedPrincipal } from './authentication/resolve-authenticated-principal';
import { CancelPendingClientRegistration } from './registration/cancel-pending-client-registration';
import { ClientEmailVerificationController } from './registration/client-email-verification.controller';
import { ClientRegistrationController } from './registration/client-registration.controller';
import { CorrectPendingClientEmail } from './registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from './registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from './registration/register-client';
import { ResendPendingClientVerification } from './registration/resend-pending-client-verification';
import { VerifyClientEmail } from './registration/verify-client-email';
import { argon2PasswordHasher } from './security/argon2-password-hasher';
import { dummyPasswordHash } from './security/argon2-password-hasher';
import { AuthenticationLinkCipher } from './security/authentication-link-cipher';
import { authenticationTokens } from './security/authentication-token-service';

const registrationGateway = Symbol('registrationGateway');
const registrationPgBoss = Symbol('registrationPgBoss');
const systemIdentityPrisma = Symbol('systemIdentityPrisma');
const authenticationGateway = Symbol('authenticationGateway');
const accountSecurityGateway = Symbol('accountSecurityGateway');

const openApiPgBoss: Pick<PgBoss, 'stop'> = {
  stop: () => Promise.resolve(),
};

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
    AccountSecurityController,
    AuthenticationController,
    ClientEmailVerificationController,
    ClientRegistrationController,
  ],
  providers: [
    {
      provide: systemIdentityPrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: createPrismaAdapter(config.getOrThrow('DATABASE_URL')),
        }),
    },
    {
      provide: registrationPgBoss,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Environment, true>) => {
        if (isOpenApiGeneration(process.env)) {
          return openApiPgBoss as PgBoss;
        }
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
      provide: authenticationGateway,
      inject: [systemIdentityPrisma],
      useFactory: (prisma: PrismaClient) =>
        new PrismaAuthenticationGateway(prisma),
    },
    {
      provide: accountSecurityGateway,
      inject: [systemIdentityPrisma, registrationPgBoss, ConfigService],
      useFactory: (
        prisma: PrismaClient,
        boss: PgBoss,
        config: ConfigService<Environment, true>,
      ) =>
        new PrismaAccountSecurityGateway(prisma, {
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
      provide: authenticationLinkInspection,
      inject: [accountSecurityGateway],
      useFactory: (gateway: PrismaAccountSecurityGateway) => (token: string) =>
        inspectAuthenticationLink(token, {
          gateway,
          digestToken: authenticationTokens.digest,
          hashPassword: argon2PasswordHasher.hash,
          now: () => new Date(),
        }),
    },
    {
      provide: accountActivation,
      inject: [accountSecurityGateway],
      useFactory:
        (gateway: PrismaAccountSecurityGateway) =>
        (command: Parameters<typeof activateAccount>[0]) =>
          activateAccount(command, {
            gateway,
            digestToken: authenticationTokens.digest,
            hashPassword: argon2PasswordHasher.hash,
            now: () => new Date(),
          }),
    },
    {
      provide: passwordRecoveryRequest,
      inject: [accountSecurityGateway, AuthenticationLinkCipher],
      useFactory:
        (
          gateway: PrismaAccountSecurityGateway,
          linkCipher: AuthenticationLinkCipher,
        ) =>
        (command: Parameters<typeof requestPasswordRecovery>[0]) =>
          requestPasswordRecovery(command, {
            gateway,
            issueLinkToken: authenticationTokens.issue,
            issueSessionCredential: authenticationTokens.issue,
            digestToken: authenticationTokens.digest,
            encryptLinkSecret: (secret) => linkCipher.encrypt(secret),
            hashPassword: argon2PasswordHasher.hash,
            now: () => new Date(),
            newTokenId: randomUUID,
            newSessionId: randomUUID,
            newAuditRecordId: randomUUID,
          }),
    },
    {
      provide: passwordRecoveryCompletion,
      inject: [accountSecurityGateway, AuthenticationLinkCipher],
      useFactory:
        (
          gateway: PrismaAccountSecurityGateway,
          linkCipher: AuthenticationLinkCipher,
        ) =>
        (command: Parameters<typeof completePasswordRecovery>[0]) =>
          completePasswordRecovery(command, {
            gateway,
            issueLinkToken: authenticationTokens.issue,
            issueSessionCredential: authenticationTokens.issue,
            digestToken: authenticationTokens.digest,
            encryptLinkSecret: (secret) => linkCipher.encrypt(secret),
            hashPassword: argon2PasswordHasher.hash,
            now: () => new Date(),
            newTokenId: randomUUID,
            newSessionId: randomUUID,
            newAuditRecordId: randomUUID,
          }),
    },
    {
      provide: currentPasswordChange,
      inject: [accountSecurityGateway],
      useFactory:
        (gateway: PrismaAccountSecurityGateway) =>
        (command: Parameters<typeof changePassword>[0]) =>
          changePassword(command, {
            gateway,
            verifyPassword: argon2PasswordHasher.verify,
            hashPassword: argon2PasswordHasher.hash,
            now: () => new Date(),
            newAuditRecordId: randomUUID,
          }),
    },
    {
      provide: mobileLogin,
      inject: [authenticationGateway, ConfigService],
      useFactory:
        (
          gateway: PrismaAuthenticationGateway,
          config: ConfigService<Environment, true>,
        ) =>
        (command: Parameters<typeof login>[0]) =>
          login(command, {
            findAccountByEmail: (email) => gateway.findAccountByEmail(email),
            verifyPassword: argon2PasswordHasher.verify,
            dummyPasswordHash,
            digestSignal: (value) =>
              createHmac(
                'sha256',
                config.getOrThrow('AUTHENTICATION_EMAIL_DIGEST_KEY'),
              )
                .update(value)
                .digest(),
            readThrottleEvents: (input) => gateway.readThrottleEvents(input),
            recordFailedCredentialCheck: (input) =>
              gateway.recordFailedCredentialCheck(input),
            completeLogin: (input) => gateway.completeLogin(input),
            issueCredential: authenticationTokens.issue,
            now: () => new Date(),
            newId: randomUUID,
          }),
    },
    {
      provide: authenticatedPrincipalResolver,
      inject: [authenticationGateway],
      useFactory:
        (gateway: PrismaAuthenticationGateway) =>
        (
          credential: string,
          meaningfulActivity: boolean,
        ): ReturnType<typeof resolveAuthenticatedPrincipal> =>
          resolveAuthenticatedPrincipal(credential, meaningfulActivity, {
            digestCredential: authenticationTokens.digest,
            findSessionByCredentialDigest: (digest) =>
              gateway.findSessionByCredentialDigest(digest),
            recordMeaningfulActivity: (input) =>
              gateway.recordMeaningfulActivity(input),
            now: () => new Date(),
          }),
    },
    {
      provide: currentSessionLogout,
      inject: [authenticationGateway],
      useFactory:
        (gateway: PrismaAuthenticationGateway) =>
        (authenticationSessionId: string): Promise<void> =>
          logout(authenticationSessionId, {
            now: () => new Date(),
            revokeSession: (input) => gateway.revokeSession(input),
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
  exports: [authenticatedPrincipalResolver],
})
export class SystemIdentityModule {}
