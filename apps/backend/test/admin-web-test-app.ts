import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type request from 'supertest';
import type { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { emailSourceAdmission } from '../src/system-identity/email-source-budget/email-source-budget.guard';
import {
  AccountSecurityController,
  accountActivation,
  authenticationLinkInspection,
  currentPasswordChange,
  passwordRecoveryCompletion,
  passwordRecoveryRequest,
} from '../src/system-identity/account-security/account-security.controller';
import {
  adminWebLogin,
  adminWebPasswordRecoveryCompletion,
  AdminWebSessionController,
} from '../src/system-identity/admin-web/admin-web-session.controller';
import { createAdminWebRequestMiddleware } from '../src/system-identity/admin-web/admin-web-request.middleware';
import {
  authenticatedPrincipalResolver,
  currentSessionLogout,
} from '../src/system-identity/authentication/authentication.controller';
import type { LoginCommand } from '../src/system-identity/authentication/login';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

export const trustedOrigin = 'http://localhost:5173';
export const credential = 'c'.repeat(43);
export const sessionCookie = `__Host-emma-admin-session=${credential}`;
export const administrator: AuthenticatedPrincipal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-member-id',
    role: 'administrator',
    branchIds: [],
  },
};

type LoginFunction = (command: LoginCommand) => Promise<{ credential: string }>;
type ResolveFunction = (
  credential: string,
  meaningfulActivity: boolean,
  surface?: 'mobile' | 'admin_web',
) => Promise<AuthenticatedPrincipal>;
type LogoutFunction = (authenticationSessionId: string) => Promise<void>;
type RecoveryFunction = (command: {
  token: string;
  password: string;
}) => Promise<{ status: string; credential?: string }>;
type ChangePasswordFunction = (command: unknown) => Promise<void>;

export const executeLogin: jest.Mock<LoginFunction> = jest.fn<LoginFunction>();
export const resolvePrincipal: jest.Mock<ResolveFunction> =
  jest.fn<ResolveFunction>();
export const executeLogout: jest.Mock<LogoutFunction> =
  jest.fn<LogoutFunction>();
export const completeRecovery: jest.Mock<RecoveryFunction> =
  jest.fn<RecoveryFunction>();
export const changePassword: jest.Mock<ChangePasswordFunction> =
  jest.fn<ChangePasswordFunction>();

@Module({
  controllers: [AdminWebSessionController, AccountSecurityController],
  providers: [
    { provide: adminWebLogin, useValue: executeLogin },
    { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
    { provide: currentSessionLogout, useValue: executeLogout },
    { provide: adminWebPasswordRecoveryCompletion, useValue: completeRecovery },
    { provide: authenticationLinkInspection, useValue: jest.fn() },
    { provide: accountActivation, useValue: jest.fn() },
    { provide: passwordRecoveryRequest, useValue: jest.fn() },
    { provide: passwordRecoveryCompletion, useValue: jest.fn() },
    { provide: currentPasswordChange, useValue: changePassword },
    { provide: emailSourceAdmission, useValue: () => Promise.resolve() },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
class AdminWebTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAdminWebRequestMiddleware([trustedOrigin]))
      .forRoutes('{*splat}');
  }
}

export const cookiesOf = (response: request.Response): string[] => {
  const header = response.headers['set-cookie'] as unknown;
  if (Array.isArray(header)) return header as string[];
  return typeof header === 'string' ? [header] : [];
};

export const startAdminWebApp = async (): Promise<INestApplication<App>> => {
  executeLogin.mockResolvedValue({ credential });
  resolvePrincipal.mockResolvedValue(administrator);
  executeLogout.mockResolvedValue(undefined);
  changePassword.mockResolvedValue(undefined);
  const moduleFixture = await Test.createTestingModule({
    imports: [AdminWebTestModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApplication(app);
  await app.init();
  return app;
};
