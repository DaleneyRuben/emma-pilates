import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BackOfficeError } from '../src/back-office/back-office-errors';
import { backOfficeOperations } from '../src/back-office/back-office-http';
import { cashCloseControllers } from '../src/back-office/cash-close/cash-close.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const branchId = '11111111-1111-4111-8111-111111111111';
const closeId = '22222222-2222-4222-8222-222222222222';
const key = '33333333-3333-4333-8333-333333333333';
const close = {
  id: closeId,
  branchId,
  businessDate: new Date('2026-10-23T00:00:00.000Z'),
  expectedCentavos: 52_000,
  cashPaymentCount: 3,
  countedCentavos: 51_000,
  differenceCentavos: -1_000,
  note: 'Faltó cambio',
  closedAt: new Date('2026-10-23T23:05:00.000Z'),
  closedByName: 'Camila Rojas',
};
const closeBody = {
  ...close,
  businessDate: '2026-10-23',
  closedAt: '2026-10-23T23:05:00.000Z',
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('cash close endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const cashCloses = {
    readToday: operation(),
    recordCashClose: operation(),
    listCashCloses: operation(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'assistant-account',
      authenticationSessionId: 'session',
      identity: {
        kind: 'staff',
        staffMemberId: 'assistant',
        role: 'assistant',
        branchIds: [branchId],
      },
    });
    cashCloses.readToday.mockResolvedValue({
      branchId,
      businessDate: new Date('2026-10-23T00:00:00.000Z'),
      expectedCentavos: 52_000,
      cashPaymentCount: 3,
      close: null,
    });
    cashCloses.recordCashClose.mockResolvedValue(close);
    cashCloses.listCashCloses.mockResolvedValue({
      branchId,
      month: '2026-10',
      missingDays: 1,
      days: [
        {
          businessDate: new Date('2026-10-23T00:00:00.000Z'),
          status: 'closed',
          cashSalesCentavos: 47_000,
          cashPaymentCount: 2,
          close: { ...close, adjustmentCentavos: -5_000 },
        },
        {
          businessDate: new Date('2026-10-22T00:00:00.000Z'),
          status: 'missing',
          cashSalesCentavos: 30_000,
          cashPaymentCount: 1,
          close: null,
        },
      ],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: cashCloseControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: backOfficeOperations, useValue: { cashCloses } },
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

  it('reads today’s expected cash at a Branch', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/cash-closes/today?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          branchId,
          businessDate: '2026-10-23',
          expectedCentavos: 52_000,
          cashPaymentCount: 3,
          close: null,
        }),
      );
    expect(cashCloses.readToday).toHaveBeenCalledWith(
      { branchId },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get('/api/v1/cash-closes/today?branchId=centro')
      .set('authorization', bearer)
      .expect(400);
  });

  it('records the close once per Idempotency-Key and maps a second close to 409', async () => {
    const input = { branchId, countedCentavos: 51_000, note: 'Faltó cambio' };
    await request(app.getHttpServer())
      .post('/api/v1/cash-closes')
      .set('authorization', bearer)
      .send(input)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/cash-closes')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send(input)
      .expect(201)
      .expect(({ body }) => expect(body).toEqual(closeBody));
    expect(cashCloses.recordCashClose).toHaveBeenCalledWith(
      input,
      expect.anything(),
      key,
    );
    await request(app.getHttpServer())
      .post('/api/v1/cash-closes')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ branchId, countedCentavos: 100 })
      .expect(201);
    expect(cashCloses.recordCashClose).toHaveBeenLastCalledWith(
      { branchId, countedCentavos: 100, note: null },
      expect.anything(),
      key,
    );
    cashCloses.recordCashClose.mockRejectedValueOnce(
      new BackOfficeError('cash_close_already_recorded'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/cash-closes')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send(input)
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('cash_close_already_recorded'),
      );
    for (const invalid of [
      { branchId, countedCentavos: 10.5 },
      { branchId, countedCentavos: -1 },
      { branchId: 'centro', countedCentavos: 0 },
      { branchId, countedCentavos: 0, note: 'x'.repeat(501) },
    ]) {
      await request(app.getHttpServer())
        .post('/api/v1/cash-closes')
        .set('authorization', bearer)
        .set('idempotency-key', key)
        .send(invalid)
        .expect(400);
    }
  });

  it('maps a Branch outside the Assistant’s assignments to 403', async () => {
    cashCloses.readToday.mockRejectedValueOnce(
      new BackOfficeError('branch_not_assigned'),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/cash-closes/today?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('branch_not_assigned'),
      );
  });

  it('lists a Branch’s month of closes for the Administrator', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/cash-closes?branchId=${branchId}&month=2026-10`,
      )
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          branchId,
          month: '2026-10',
          missingDays: 1,
          days: [
            {
              businessDate: '2026-10-23',
              status: 'closed',
              cashSalesCentavos: 47_000,
              cashPaymentCount: 2,
              close: { ...closeBody, adjustmentCentavos: -5_000 },
            },
            {
              businessDate: '2026-10-22',
              status: 'missing',
              cashSalesCentavos: 30_000,
              cashPaymentCount: 1,
              close: null,
            },
          ],
        }),
      );
    expect(cashCloses.listCashCloses).toHaveBeenCalledWith(
      { branchId, month: '2026-10' },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/cash-closes?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(400);
    cashCloses.listCashCloses.mockRejectedValueOnce(
      new BackOfficeError('back_office_access_denied'),
    );
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/cash-closes?branchId=${branchId}&month=2026-10`,
      )
      .set('authorization', bearer)
      .expect(403);
  });
});
