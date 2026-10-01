import { createHmac, randomUUID } from 'node:crypto';
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  OnApplicationShutdown,
} from '@nestjs/common';
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
import { adminWebProviders } from './admin-web/admin-web-providers';
import { createAdminWebRequestMiddleware } from './admin-web/admin-web-request.middleware';
import { AdminWebSessionController } from './admin-web/admin-web-session.controller';
import { passwordRecoveryDependencies } from './account-security/password-recovery-dependencies';
import type { AuthenticationSurface } from './authentication/create-authentication-session';
import { login } from './authentication/login';
import { loginDependencies } from './authentication/login-dependencies';
import { logout } from './authentication/logout';
import { PrismaAuthenticationGateway } from './authentication/prisma-authentication-gateway';
import { resolveAuthenticatedPrincipal } from './authentication/resolve-authenticated-principal';
import { CancelPendingClientRegistration } from './registration/cancel-pending-client-registration';
import { ClientEmailVerificationController } from './registration/client-email-verification.controller';
import { ClientRegistrationController } from './registration/client-registration.controller';
import { CorrectPendingClientEmail } from './registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from './registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from './registration/register-client';
import {
  cancelClientInvitation,
  correctClientInvitationEmail,
  inviteClient,
  readClientInvitation,
  resendClientInvitation,
} from './invitations/client-invitations';
import {
  AssistantClientInvitationsController,
  clientInvitationOperations,
  type ClientInvitationOperations,
} from './invitations/client-invitations.controller';
import { PrismaClientInvitationUnitOfWork } from './invitations/prisma-client-invitation-unit-of-work';
import { sendClientVerification } from './invitations/client-verification-resend';
import { emailChangeWiring } from './email-change/email-change-wiring';
import { ResendPendingClientVerification } from './registration/resend-pending-client-verification';
import { VerifyClientEmail } from './registration/verify-client-email';
import { argon2PasswordHasher } from './security/argon2-password-hasher';
import { AuthenticationLinkCipher } from './security/authentication-link-cipher';
import { authenticationTokens } from './security/authentication-token-service';
import {
  staffAccountRuntime,
  type StaffAccountRuntime,
} from './staff-accounts/staff-accounts';

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
    AdminWebSessionController,
    AssistantClientInvitationsController,
    AuthenticationController,
    ...emailChangeWiring.controllers,
    ClientEmailVerificationController,
    ClientRegistrationController,
  ],
  providers: [
    ...emailChangeWiring.providers(systemIdentityPrisma),
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
          requestPasswordRecovery(
            command,
            passwordRecoveryDependencies(gateway, linkCipher),
          ),
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
          completePasswordRecovery(
            command,
            passwordRecoveryDependencies(gateway, linkCipher),
          ),
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
          login(command, loginDependencies(gateway, config)),
    },
    ...adminWebProviders({
      authentication: authenticationGateway,
      accountSecurity: accountSecurityGateway,
    }),
    {
      provide: authenticatedPrincipalResolver,
      inject: [authenticationGateway],
      useFactory:
        (gateway: PrismaAuthenticationGateway) =>
        (
          credential: string,
          meaningfulActivity: boolean,
          surface?: AuthenticationSurface,
        ): ReturnType<typeof resolveAuthenticatedPrincipal> =>
          resolveAuthenticatedPrincipal(
            credential,
            meaningfulActivity,
            {
              digestCredential: authenticationTokens.digest,
              findSessionByCredentialDigest: (digest) =>
                gateway.findSessionByCredentialDigest(digest),
              recordMeaningfulActivity: (input) =>
                gateway.recordMeaningfulActivity(input),
              now: () => new Date(),
            },
            surface,
          ),
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
      provide: clientInvitationOperations,
      inject: [
        systemIdentityPrisma,
        registrationPgBoss,
        ConfigService,
        AuthenticationLinkCipher,
      ],
      useFactory: (
        prisma: PrismaClient,
        boss: PgBoss,
        config: ConfigService<Environment, true>,
        linkCipher: AuthenticationLinkCipher,
      ): ClientInvitationOperations => {
        const dependencies = {
          unitOfWork: new PrismaClientInvitationUnitOfWork({
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
          tokenIssuer: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
          newReferralCode: () => `REF-${randomUUID()}`,
        };
        return {
          invite: (command, principal) =>
            inviteClient(command, principal, dependencies),
          read: (command, principal) =>
            readClientInvitation(command, principal, dependencies),
          correctEmail: (command, principal) =>
            correctClientInvitationEmail(command, principal, dependencies),
          resend: (command, principal) =>
            resendClientInvitation(command, principal, dependencies),
          sendVerification: (command, principal) =>
            sendClientVerification(command, principal, dependencies),
          cancel: (command, principal) =>
            cancelClientInvitation(command, principal, dependencies),
        };
      },
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
      provide: staffAccountRuntime,
      inject: [registrationPgBoss, ConfigService, AuthenticationLinkCipher],
      useFactory: (
        boss: PgBoss,
        config: ConfigService<Environment, true>,
        linkCipher: AuthenticationLinkCipher,
      ): StaffAccountRuntime => ({
        boss,
        digestEmail: (email) =>
          createHmac(
            'sha256',
            config.getOrThrow('AUTHENTICATION_EMAIL_DIGEST_KEY'),
          )
            .update(email)
            .digest(),
        linkCipher,
        tokenIssuer: authenticationTokens,
      }),
    },
    {
      provide: SystemIdentityRuntimeCleanup,
      inject: [systemIdentityPrisma, registrationPgBoss],
      useFactory: (prisma: PrismaClient, boss: PgBoss) =>
        new SystemIdentityRuntimeCleanup(prisma, boss),
    },
  ],
  exports: [authenticatedPrincipalResolver, staffAccountRuntime],
})
export class SystemIdentityModule implements NestModule {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        createAdminWebRequestMiddleware(
          this.config.getOrThrow('ADMIN_WEB_TRUSTED_ORIGINS'),
        ),
      )
      .forRoutes('{*splat}');
  }
}
