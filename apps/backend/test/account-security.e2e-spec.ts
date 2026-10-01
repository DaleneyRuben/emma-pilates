import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
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
import { CurrentPasswordIncorrectError } from '../src/system-identity/account-security/change-password';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

describe('Account security (e2e)', () => {
  let app: INestApplication<App>;
  const inspectLink = jest.fn(() =>
    Promise.resolve({
      status: 'current' as const,
      purpose: 'activation' as const,
    }),
  );
  const activate = jest.fn(() =>
    Promise.resolve({ status: 'activated' as const }),
  );
  const requestRecovery = jest.fn(() =>
    Promise.resolve({ status: 'accepted' as const }),
  );
  const completeRecovery = jest.fn(() =>
    Promise.resolve({
      status: 'recovered' as const,
      credential: 'a'.repeat(43),
    }),
  );
  const changeCurrentPassword = jest.fn(() => Promise.resolve(undefined));
  const resolvePrincipal = jest.fn(() =>
    Promise.resolve({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client' as const, clientId: 'client-id' },
    }),
  );

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccountSecurityController],
      providers: [
        { provide: authenticationLinkInspection, useValue: inspectLink },
        { provide: accountActivation, useValue: activate },
        { provide: passwordRecoveryRequest, useValue: requestRecovery },
        { provide: passwordRecoveryCompletion, useValue: completeRecovery },
        { provide: currentPasswordChange, useValue: changeCurrentPassword },
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: emailSourceAdmission, useValue: () => Promise.resolve() },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('inspects a one-time authentication link without returning Account data', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/authentication-links/inspection')
      .send({ token: 'one-time-secret' })
      .expect(200)
      .expect({ status: 'current', purpose: 'activation' });
  });

  it('activates an Account without returning an Authentication Session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/account-activations')
      .send({ token: 'one-time-secret', password: 'new password' })
      .expect(200)
      .expect({ status: 'activated' });
  });

  it('accepts every well-formed password-recovery request neutrally', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .send({ email: 'ana@example.com' })
      .expect(202)
      .expect({ status: 'accepted' });
  });

  it('returns the only replacement credential after password recovery', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/password-recoveries')
      .send({ token: 'one-time-secret', password: 'new password' })
      .expect(201)
      .expect({ status: 'recovered', credential: 'a'.repeat(43) });
  });

  it('changes the current Account password using its bearer session', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/accounts/current/password')
      .set('Authorization', `Bearer ${'a'.repeat(43)}`)
      .send({ currentPassword: 'old password', newPassword: 'new password' })
      .expect(204);

    expect(changeCurrentPassword).toHaveBeenCalledWith({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      currentPassword: 'old password',
      newPassword: 'new password',
    });
  });

  it('returns stable Problem Details for an incorrect current password', async () => {
    changeCurrentPassword.mockRejectedValueOnce(
      new CurrentPasswordIncorrectError(),
    );

    await request(app.getHttpServer())
      .patch('/api/v1/accounts/current/password')
      .set('Authorization', `Bearer ${'a'.repeat(43)}`)
      .send({ currentPassword: 'wrong password', newPassword: 'new password' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ code: 'current_password_incorrect' }),
        );
      });
  });
});
