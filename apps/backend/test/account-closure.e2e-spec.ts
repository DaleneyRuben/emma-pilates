import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AccountClosureError } from '../src/booking/account-closure/close-client-account';
import {
  AccountClosureController,
  accountClosureOperations,
} from '../src/booking/account-closure/account-closure.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const summary = {
  closedWaitlistEntries: 1,
  cancelledBookings: 2,
  cancelledEvaluations: 1,
  forfeitedClasses: 5,
  forfeitedCreditCentavos: 6000,
};

const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId },
};
const administrator: AuthenticatedPrincipal = {
  accountId: 'admin-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'admin',
    role: 'administrator',
    branchIds: [],
  },
};

describe('Account closure endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const close = jest.fn<(...args: unknown[]) => Promise<typeof summary>>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(client);
    close.mockResolvedValue(summary);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountClosureController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: accountClosureOperations, useValue: { close } },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('closes the signed-in Client’s own Account after the password is re-entered', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/closure')
      .set('authorization', bearer)
      .send({ password: 'emma-local-2026' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(summary);

    expect(close).toHaveBeenCalledWith(
      { clientId, password: 'emma-local-2026' },
      client,
    );
  });

  it('requires the password in the body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/closure')
      .set('authorization', bearer)
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: 'invalid_request' });
      });
    expect(close).not.toHaveBeenCalled();
  });

  it('answers a wrong password with the stable current_password_incorrect code', async () => {
    close.mockRejectedValue(
      new AccountClosureError('current_password_incorrect'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/closure')
      .set('authorization', bearer)
      .send({ password: 'wrong' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          code: 'current_password_incorrect',
        });
      });
  });

  it('refuses closure with 409 closure_payment_pending while a transfer awaits review', async () => {
    close.mockRejectedValue(new AccountClosureError('closure_payment_pending'));

    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/closure')
      .set('authorization', bearer)
      .send({ password: 'emma-local-2026' })
      .expect(409)
      .expect((response) => {
        expect(response.body).toMatchObject({
          code: 'closure_payment_pending',
        });
      });
  });

  it('does not let Staff close their own Account here', async () => {
    resolvePrincipal.mockResolvedValue(administrator);

    await request(app.getHttpServer())
      .post('/api/v1/accounts/current/closure')
      .set('authorization', bearer)
      .send({ password: 'emma-local-2026' })
      .expect(403)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: 'closure_access_denied' });
      });
    expect(close).not.toHaveBeenCalled();
  });

  it('lets an Administrator close a Client’s Account without a body', async () => {
    resolvePrincipal.mockResolvedValue(administrator);

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/clients/${clientId}/closure`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(summary);

    expect(close).toHaveBeenCalledWith({ clientId }, administrator);
  });

  it('reports an unknown Client as 404 client_not_found', async () => {
    resolvePrincipal.mockResolvedValue(administrator);
    close.mockRejectedValue(new AccountClosureError('client_not_found'));

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/clients/${clientId}/closure`)
      .set('authorization', bearer)
      .expect(404)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: 'client_not_found' });
      });
  });

  it('rejects a malformed Client identifier', async () => {
    resolvePrincipal.mockResolvedValue(administrator);

    await request(app.getHttpServer())
      .post('/api/v1/administrator/clients/not-a-uuid/closure')
      .set('authorization', bearer)
      .expect(400);
    expect(close).not.toHaveBeenCalled();
  });
});
