import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
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
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import { EmailSourceThrottledError } from '../src/system-identity/email-source-budget/admit-email-request';
import { emailSourceAdmission } from '../src/system-identity/email-source-budget/email-source-budget.guard';
import { CancelPendingClientRegistration } from '../src/system-identity/registration/cancel-pending-client-registration';
import { ClientRegistrationController } from '../src/system-identity/registration/client-registration.controller';
import { CorrectPendingClientEmail } from '../src/system-identity/registration/correct-pending-client-email';
import { RegisterClient } from '../src/system-identity/registration/register-client';
import { ResendPendingClientVerification } from '../src/system-identity/registration/resend-pending-client-verification';

type Admission = (command: {
  group: 'verification' | 'password_recovery';
  clientIdentifier: string | null;
  networkAddress: string;
}) => Promise<void>;

const installation = 'installation-identifier-0001';
const adminClientCookie = `__Host-emma-admin-client=${'c'.repeat(43)}`;

const endpoints = [
  {
    path: '/api/v1/client-registrations',
    group: 'verification',
    body: { name: 'Ana', email: 'ana@example.com', password: 'secret-pass' },
  },
  {
    path: '/api/v1/client-registrations/verification-resends',
    group: 'verification',
    body: { registrationContinuation: 'registration-secret' },
  },
  {
    path: '/api/v1/client-registrations/email-corrections',
    group: 'verification',
    body: {
      registrationContinuation: 'registration-secret',
      email: 'ana@example.com',
    },
  },
  {
    path: '/api/v1/password-recovery-requests',
    group: 'password_recovery',
    body: { email: 'ana@example.com' },
  },
] as const;

describe('client and network email budgets (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;
  const admit = jest.fn<Admission>(() => Promise.resolve());
  const register = jest.fn<RegisterClient['execute']>(() =>
    Promise.resolve({
      email: 'ana@example.com',
      registrationContinuation: 'registration-secret',
    }),
  );
  const correct = jest.fn<CorrectPendingClientEmail['execute']>(() =>
    Promise.resolve({ status: 'corrected', email: 'ana@example.com' }),
  );
  const resend = jest.fn<ResendPendingClientVerification['execute']>(() =>
    Promise.resolve({ status: 'sent' }),
  );
  const requestRecovery = jest.fn(() =>
    Promise.resolve({ status: 'accepted' as const }),
  );
  const useCases = [register, resend, correct, requestRecovery];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClientRegistrationController, AccountSecurityController],
      providers: [
        { provide: emailSourceAdmission, useValue: admit },
        { provide: RegisterClient, useValue: { execute: register } },
        { provide: CorrectPendingClientEmail, useValue: { execute: correct } },
        {
          provide: ResendPendingClientVerification,
          useValue: { execute: resend },
        },
        {
          provide: CancelPendingClientRegistration,
          useValue: { execute: jest.fn() },
        },
        { provide: authenticationLinkInspection, useValue: jest.fn() },
        { provide: accountActivation, useValue: jest.fn() },
        { provide: passwordRecoveryRequest, useValue: requestRecovery },
        { provide: passwordRecoveryCompletion, useValue: jest.fn() },
        { provide: currentPasswordChange, useValue: jest.fn() },
        { provide: authenticatedPrincipalResolver, useValue: jest.fn() },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    document = configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each(endpoints)(
    'admits $path under the $group budget before running it',
    async ({ path, group, body }) => {
      await request(app.getHttpServer())
        .post(path)
        .set('x-client-identifier', installation)
        .send(body)
        .expect(202);

      expect(admit).toHaveBeenCalledWith({
        group,
        clientIdentifier: installation,
        networkAddress: expect.stringMatching(/127\.0\.0\.1|::1/) as unknown,
      });
      expect(useCases.filter((useCase) => useCase.mock.calls.length)).toEqual([
        expect.any(Function),
      ]);
    },
  );

  it.each(endpoints)(
    'answers a full budget on $path with neutral 429 Problem Details and Retry-After',
    async ({ path, body }) => {
      admit.mockRejectedValueOnce(new EmailSourceThrottledError(75));

      await request(app.getHttpServer())
        .post(path)
        .set('x-client-identifier', installation)
        .send(body)
        .expect(429)
        .expect('Content-Type', /application\/problem\+json/)
        .expect('Retry-After', '75')
        .expect(({ body: problem }) => {
          expect(problem).toEqual({
            type: 'about:blank',
            title: 'Too Many Requests',
            status: 429,
            detail:
              'Too many requests from this device or network. Try again later',
            instance: path,
            code: 'authentication_email_throttled',
          });
        });

      for (const useCase of useCases) {
        expect(useCase).not.toHaveBeenCalled();
      }
    },
  );

  it('falls back to the network lane without a valid client identifier', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .send({ email: 'ana@example.com' })
      .expect(202);
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .set('x-client-identifier', 'short')
      .send({ email: 'ana@example.com' })
      .expect(202);

    expect(
      admit.mock.calls.map(([command]) => command.clientIdentifier),
    ).toEqual([null, null]);
  });

  it('uses the admin web client cookie when no header identifies the client', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .set('Cookie', adminClientCookie)
      .send({ email: 'ana@example.com' })
      .expect(202);
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .set('Cookie', adminClientCookie)
      .set('x-client-identifier', installation)
      .send({ email: 'ana@example.com' })
      .expect(202);

    expect(
      admit.mock.calls.map(([command]) => command.clientIdentifier),
    ).toEqual(['c'.repeat(43), installation]);
  });

  it('ignores a forwarded address the requester supplies', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .send({ email: 'ana@example.com' })
      .expect(202);
    await request(app.getHttpServer())
      .post('/api/v1/password-recovery-requests')
      .set('X-Forwarded-For', '203.0.113.9')
      .send({ email: 'ana@example.com' })
      .expect(202);

    const [direct, forwarded] = admit.mock.calls.map(
      ([command]) => command.networkAddress,
    );
    expect(forwarded).toBe(direct);
    expect(forwarded).not.toContain('203.0.113.9');
  });

  it('keeps the recipient lane neutral once the source is admitted', async () => {
    resend.mockResolvedValueOnce({ status: 'suppressed' });

    const response = await request(app.getHttpServer())
      .post('/api/v1/client-registrations/verification-resends')
      .send({ registrationContinuation: 'registration-secret' })
      .expect(202)
      .expect({ status: 'verification_required' });

    expect(response.headers['retry-after']).toBeUndefined();
  });

  it('does not budget registration cancellation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/client-registrations/cancellations')
      .send({ registrationContinuation: 'registration-secret' })
      .expect(204);

    expect(admit).not.toHaveBeenCalled();
  });

  it('documents the client identifier and the 429 on each budgeted operation', () => {
    for (const { path } of endpoints) {
      const operation = document.paths[path].post!;

      expect(operation.parameters).toContainEqual(
        expect.objectContaining({
          name: 'x-client-identifier',
          in: 'header',
          required: false,
        }),
      );
      expect(operation.responses['429']).toMatchObject({
        headers: { 'Retry-After': expect.anything() as unknown },
      });
    }
    expect(
      document.paths['/api/v1/client-registrations/cancellations'].post!
        .responses['429'],
    ).toBeUndefined();
  });
});
