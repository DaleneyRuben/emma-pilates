import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import {
  CourtesyAccessController,
  courtesyAccessGrant,
} from '../src/booking/payments/courtesy-access.controller';
import { PaymentRuleError } from '../src/booking/payments/payment-errors';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const idempotencyKey = '33333333-3333-4333-8333-333333333333';
const route = `/api/v1/administrator/clients/${clientId}/courtesy-access`;
const granted = {
  id: '44444444-4444-4444-8444-444444444444',
  method: 'courtesy',
  state: 'confirmed',
  planId: '55555555-5555-4555-8555-555555555555',
  planName: 'Acceso de prueba',
  durationMonths: 1,
  classAllowance: 16,
  planPriceCentavos: 0,
  creditAppliedCentavos: 0,
  amountDueCentavos: 0,
  submittedAt: new Date('2026-10-23T15:00:00.000Z'),
  decidedAt: new Date('2026-10-23T15:00:00.000Z'),
  rejectionReason: null,
  subscriptionId: '66666666-6666-4666-8666-666666666666',
};

describe('Courtesy Access endpoint (e2e, REL-011)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const grant = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'admin-account',
      authenticationSessionId: 'session',
      identity: {
        kind: 'staff',
        staffMemberId: 'admin',
        role: 'administrator',
        branchIds: [],
      },
    });
    grant.mockResolvedValue(granted);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CourtesyAccessController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: courtesyAccessGrant, useValue: grant },
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

  it('grants access until the chosen civil date and never caches the answer', async () => {
    await request(app.getHttpServer())
      .post(route)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ endsOn: '2026-11-30' })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          ...granted,
          submittedAt: '2026-10-23T15:00:00.000Z',
          decidedAt: '2026-10-23T15:00:00.000Z',
        }),
      );
    expect(grant).toHaveBeenCalledWith(
      { clientId, endsOn: new Date('2026-11-30T00:00:00.000Z') },
      expect.objectContaining({ accountId: 'admin-account' }),
      idempotencyKey,
    );
  });

  it.each([
    ['no end date', {}],
    ['a date-time instead of a date', { endsOn: '2026-11-30T00:00:00Z' }],
    ['an impossible date', { endsOn: '2026-02-30' }],
    ['an extra field', { endsOn: '2026-11-30', planId: clientId }],
  ])('refuses %s as invalid_request', async (_case, body) => {
    await request(app.getHttpServer())
      .post(route)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send(body)
      .expect(400)
      .expect(({ body: problem }: { body: { code?: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(grant).not.toHaveBeenCalled();
  });

  it('requires an Idempotency-Key and a Client identifier', async () => {
    await request(app.getHttpServer())
      .post(route)
      .set('authorization', bearer)
      .send({ endsOn: '2026-11-30' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/administrator/clients/not-a-uuid/courtesy-access')
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ endsOn: '2026-11-30' })
      .expect(400);
    await request(app.getHttpServer())
      .post(route)
      .send({ endsOn: '2026-11-30' })
      .expect(401);
    expect(grant).not.toHaveBeenCalled();
  });

  it.each([
    [new AdministrationError('administration_access_denied'), 403],
    [new AdministrationError('client_not_found'), 404],
    [new PaymentRuleError('subscription_not_expired', 'still active'), 409],
    [new PaymentRuleError('courtesy_end_date_invalid', 'out of range'), 400],
  ])('answers %s as a problem', async (error, status) => {
    grant.mockRejectedValueOnce(error);
    await request(app.getHttpServer())
      .post(route)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ endsOn: '2026-11-30' })
      .expect(status)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe(error.code),
      );
  });
});
