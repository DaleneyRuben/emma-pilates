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
const administrator: AuthenticatedPrincipal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-member-id',
    role: 'administrator',
    branchIds: [],
  },
};

export const executeLogin =
  jest.fn<(command: LoginCommand) => Promise<{ credential: string }>>();
export const resolvePrincipal =
  jest.fn<
    (
      credential: string,
      meaningfulActivity: boolean,
      surface?: 'mobile' | 'admin_web',
    ) => Promise<AuthenticatedPrincipal>
  >();
export const executeLogout =
  jest.fn<(authenticationSessionId: string) => Promise<void>>();
export const completeRecovery =
  jest.fn<
    (command: {
      token: string;
      password: string;
    }) => Promise<{ status: string; credential?: string }>
  >();
export const changePassword = jest.fn<(command: unknown) => Promise<void>>();

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
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
class AdminWebTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAdminWebRequestMiddleware([trustedOrigin]))
      .forRoutes('*');
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
