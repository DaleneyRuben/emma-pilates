import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { EmailChangeError } from '../src/system-identity/email-change/email-change';
import {
  EmailChangeController,
  emailChangeOperations,
  type EmailChangeOperations,
} from '../src/system-identity/email-change/email-change.controller';

const pending = {
  email: 'lucia.nueva@example.com',
  requestedAt: new Date('2026-09-24T15:00:00.000Z'),
  expiresAt: new Date('2026-09-25T15:00:00.000Z'),
};

describe('account email change (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    request: jest.fn<EmailChangeOperations['request']>(),
    resend: jest.fn<EmailChangeOperations['resend']>(),
    cancel: jest.fn<EmailChangeOperations['cancel']>(),
    readPending: jest.fn<EmailChangeOperations['readPending']>(),
    complete: jest.fn<EmailChangeOperations['complete']>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    Object.values(operations).forEach((operation) => operation.mockReset());
    operations.request.mockResolvedValue({
      status: 'verification_required',
      email: 'lucia.nueva@example.com',
    });
    operations.resend.mockResolvedValue({ status: 'verification_required' });
    operations.cancel.mockResolvedValue(undefined);
    operations.readPending.mockResolvedValue({ pending });
    operations.complete.mockResolvedValue({ status: 'changed' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmailChangeController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: emailChangeOperations, useValue: operations },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('asks for a change and answers neutrally without caching', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .send({ email: 'Lucia.Nueva@example.com' })
      .expect(202)
      .expect('Cache-Control', 'no-store')
      .expect({
        status: 'verification_required',
        email: 'lucia.nueva@example.com',
      });
    expect(operations.request).toHaveBeenCalledWith(
      { email: 'Lucia.Nueva@example.com' },
      expect.objectContaining({ accountId: 'account-id' }),
    );
  });

  it('rejects a malformed address, the current one, and an unauthenticated caller', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .send({ email: 'not-an-email' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
    expect(operations.request).not.toHaveBeenCalled();

    operations.request.mockRejectedValueOnce(
      new EmailChangeError('email_unchanged'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .send({ email: 'lucia@example.com' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_unchanged' }),
      );

    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change')
      .send({ email: 'lucia@example.com' })
      .expect(401);
  });

  it('reads the pending change, resends its link, and cancels it', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({
        pending: {
          email: 'lucia.nueva@example.com',
          requestedAt: '2026-09-24T15:00:00.000Z',
          expiresAt: '2026-09-25T15:00:00.000Z',
        },
      });

    operations.readPending.mockResolvedValueOnce({ pending: null });
    await request(app.getHttpServer())
      .get('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .expect(200)
      .expect({ pending: null });

    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change/resends')
      .set('authorization', bearer)
      .expect(202)
      .expect({ status: 'verification_required' });

    operations.resend.mockRejectedValueOnce(
      new EmailChangeError('email_change_not_pending'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/email-change/resends')
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_change_not_pending' }),
      );

    await request(app.getHttpServer())
      .delete('/api/v1/accounts/current/email-change')
      .set('authorization', bearer)
      .expect(204);
    expect(operations.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-id' }),
    );
  });

  it('refuses the email change while an Administrator impersonates (FUT-001)', async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'trainer-account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'trainer-staff-member-id',
        role: 'trainer',
        branchIds: [],
      },
      impersonation: {
        id: 'impersonation-id',
        administratorAccountId: 'administrator-account-id',
        staffMemberName: 'Camila Rojas',
        expiresAt: new Date('2026-10-22T15:30:00.000Z'),
      },
    });

    for (const send of [
      () =>
        request(app.getHttpServer())
          .post('/api/v1/accounts/current/email-change')
          .send({ email: 'nueva@example.com' }),
      () =>
        request(app.getHttpServer()).post(
          '/api/v1/accounts/current/email-change/resends',
        ),
      () =>
        request(app.getHttpServer()).delete(
          '/api/v1/accounts/current/email-change',
        ),
    ]) {
      // eslint-disable-next-line no-await-in-loop -- one request after another
      await send()
        .set('Authorization', bearer)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'impersonation_forbidden' }),
        );
    }
    expect(operations.request).not.toHaveBeenCalled();
    expect(operations.resend).not.toHaveBeenCalled();
    expect(operations.cancel).not.toHaveBeenCalled();
  });

  it('completes a change from the public link without a session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/email-changes')
      .send({ token: 'link-secret' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ status: 'changed' });
    expect(operations.complete).toHaveBeenCalledWith({ token: 'link-secret' });

    await request(app.getHttpServer())
      .post('/api/v1/email-changes')
      .send({})
      .expect(400);
  });
});
