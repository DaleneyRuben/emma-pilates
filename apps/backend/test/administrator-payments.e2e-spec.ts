import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import {
  AdministratorPaymentListController,
  administratorPaymentOperations,
} from '../src/booking/payments/administrator-payment-list.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const row = {
  id: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  clientName: 'Sofía Guzmán',
  planName: 'Paquete de 8 clases',
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 6_000,
  amountDueCentavos: 50_000,
  state: 'pending',
  submittedAt: new Date('2026-09-21T18:05:00.000Z'),
  decidedAt: null,
  receiptAvailable: true,
};
const paymentPage = {
  items: [row],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  pendingCount: 6,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

describe('administrator Payment list endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations: { list: Operation } = {
    list: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

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
    operations.list.mockResolvedValue(paymentPage);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorPaymentListController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: administratorPaymentOperations, useValue: operations },
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

  it('pages every transfer Payment with the pending count and never caches it', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/payments')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          ...paymentPage,
          items: [{ ...row, submittedAt: '2026-09-21T18:05:00.000Z' }],
        }),
      );
    expect(operations.list).toHaveBeenCalledWith(
      { page: 1, pageSize: 20, status: 'all' },
      expect.objectContaining({ accountId: 'admin-account' }),
    );

    await request(app.getHttpServer())
      .get(
        '/api/v1/administrator/payments?status=pending&q=sofía&page=2&pageSize=5',
      )
      .set('authorization', bearer)
      .expect(200);
    expect(operations.list).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 5, status: 'pending', query: 'sofía' },
      expect.anything(),
    );
  });

  it.each([
    ['an unknown filter', '?branchId=11111111-1111-4111-8111-111111111111'],
    ['a state outside the allowlist', '?status=completed'],
    ['a page size above 100', '?pageSize=101'],
    ['a search longer than 100 characters', `?q=${'a'.repeat(101)}`],
  ])('refuses %s as invalid_request', async (_case, search) => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/payments${search}`)
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('invalid_request'),
      );
    expect(operations.list).not.toHaveBeenCalled();
  });

  it('answers a refusal as a problem and needs a signed-in Account', async () => {
    operations.list.mockRejectedValueOnce(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/payments')
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('administration_access_denied'),
      );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/payments')
      .expect(401);
  });
});
