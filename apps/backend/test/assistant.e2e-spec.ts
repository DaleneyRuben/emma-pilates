import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClientNotFoundError } from '../src/booking/assistant/assistant-clients';
import {
  AssistantClientsController,
  assistantClientOperations,
} from '../src/booking/assistant/assistant.controller';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { PaymentRuleError } from '../src/booking/payments/payment-errors';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const branchId = '33333333-3333-4333-8333-333333333333';
const idempotencyKey = '44444444-4444-4444-8444-444444444444';
const client = {
  id: clientId,
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: '+591 70011001',
  accountStatus: 'active',
};
const subscription = {
  id: '55555555-5555-4555-8555-555555555555',
  planName: 'Paquete de 8 clases',
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: new Date('2026-09-10T00:00:00.000Z'),
  endsOn: new Date('2026-10-10T00:00:00.000Z'),
};
const booking = {
  kind: 'booking',
  bookingId: '66666666-6666-4666-8666-666666666666',
  sessionId: '77777777-7777-4777-8777-777777777777',
  branchId,
  classTypeName: 'Reformer Pilates',
  trainerName: 'Emma Vargas',
  branchName: 'Centro',
  startsAt: new Date('2026-09-22T22:30:00.000Z'),
  endsAt: new Date('2026-09-22T23:20:00.000Z'),
};
const historyEntry = {
  bookingId: '88888888-8888-4888-8888-888888888888',
  sessionId: '99999999-9999-4999-8999-999999999999',
  classTypeName: 'Mat Pilates',
  trainerName: 'Daniela Ortiz',
  branchName: 'Centro',
  startsAt: new Date('2026-09-15T13:00:00.000Z'),
  endsAt: new Date('2026-09-15T13:50:00.000Z'),
};
const payment = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  method: 'cash',
  state: 'confirmed',
  planId,
  planName: 'Paquete de 8 clases',
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 6_000,
  amountDueCentavos: 50_000,
  submittedAt: new Date('2026-09-22T20:00:00.000Z'),
  decidedAt: new Date('2026-09-22T20:00:00.000Z'),
  rejectionReason: null,
  subscriptionId: subscription.id,
};

describe('assistant clients (e2e)', () => {
  let app: INestApplication<App>;
  const assistant: AuthenticatedPrincipal = {
    accountId: 'assistant-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'assistant',
      role: 'assistant',
      branchIds: [branchId],
    },
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningful: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    search: jest.fn<() => Promise<unknown>>(),
    overview: jest.fn<() => Promise<unknown>>(),
    bookings: jest.fn<() => Promise<unknown>>(),
    history: jest.fn<() => Promise<unknown>>(),
    planQuotes: jest.fn<() => Promise<unknown>>(),
    recordCashPayment: jest.fn<() => Promise<unknown>>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(assistant);
    operations.search.mockResolvedValue([client]);
    operations.overview.mockResolvedValue({
      client,
      subscription: { status: 'active', subscription },
      nextBooking: booking,
      recentHistory: [historyEntry],
      creditAvailableCentavos: 6_000,
    });
    operations.bookings.mockResolvedValue([{ ...booking, actionable: true }]);
    operations.history.mockResolvedValue([historyEntry]);
    operations.planQuotes.mockResolvedValue({
      creditAvailableCentavos: 6_000,
      plans: [
        {
          id: planId,
          name: 'Paquete de 8 clases',
          durationMonths: 1,
          classAllowance: 8,
          priceCentavos: 56_000,
          displayOrder: 1,
          creditAppliedCentavos: 6_000,
          amountDueCentavos: 50_000,
        },
      ],
    });
    operations.recordCashPayment.mockResolvedValue({ payment, subscription });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AssistantClientsController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: assistantClientOperations, useValue: operations },
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

  it('searches Clients and validates the query', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/assistant/clients?query=luc')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect([client]);
    expect(operations.search).toHaveBeenCalledWith({ query: 'luc' }, assistant);

    await request(app.getHttpServer())
      .get('/api/v1/assistant/clients?query=l')
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('invalid_request'));
    await request(app.getHttpServer())
      .get('/api/v1/assistant/clients')
      .set('authorization', bearer)
      .expect(400);
  });

  it('serves the Client overview with civil dates and the next Booking', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toEqual({
          client,
          subscription: {
            status: 'active',
            subscription: {
              ...subscription,
              startsOn: '2026-09-10',
              endsOn: '2026-10-10',
            },
          },
          nextBooking: {
            ...booking,
            startsAt: '2026-09-22T22:30:00.000Z',
            endsAt: '2026-09-22T23:20:00.000Z',
          },
          recentHistory: [
            {
              ...historyEntry,
              startsAt: '2026-09-15T13:00:00.000Z',
              endsAt: '2026-09-15T13:50:00.000Z',
            },
          ],
          creditAvailableCentavos: 6_000,
        });
      });
    expect(operations.overview).toHaveBeenCalledWith({ clientId }, assistant);
  });

  it('serves the Client Bookings with the actionable flag and the attended history', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}/bookings`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            kind: 'booking',
            branchId,
            actionable: true,
            startsAt: '2026-09-22T22:30:00.000Z',
          }),
        ]);
      });
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}/class-history`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({ bookingId: historyEntry.bookingId }),
        ]);
      });
  });

  it('quotes the Plans with the Credit applied', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}/plan-quotes`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          creditAvailableCentavos: 6_000,
          plans: [
            expect.objectContaining({
              id: planId,
              priceCentavos: 56_000,
              creditAppliedCentavos: 6_000,
              amountDueCentavos: 50_000,
            }),
          ],
        });
      });
  });

  it('records a cash Payment with an Idempotency-Key and returns the Subscription', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/clients/${clientId}/cash-payments`)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ planId, branchId })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toEqual({
          payment: expect.objectContaining({
            id: payment.id,
            method: 'cash',
            state: 'confirmed',
            submittedAt: '2026-09-22T20:00:00.000Z',
          }),
          subscription: expect.objectContaining({
            id: subscription.id,
            endsOn: '2026-10-10',
          }),
        });
      });
    expect(operations.recordCashPayment).toHaveBeenCalledWith(
      { clientId, planId, branchId },
      assistant,
      idempotencyKey,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/assistant/clients/${clientId}/cash-payments`)
      .set('authorization', bearer)
      .send({ planId, branchId })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('invalid_request'));
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/clients/${clientId}/cash-payments`)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ planId })
      .expect(400);
  });

  it('maps access, missing Client, and Payment rule errors to Problem Details', async () => {
    operations.overview.mockRejectedValueOnce(new BookingAccessDeniedError());
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('booking_access_denied'));

    operations.overview.mockRejectedValueOnce(new ClientNotFoundError());
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('client_not_found'));

    operations.recordCashPayment.mockRejectedValueOnce(
      new PaymentRuleError(
        'subscription_not_expired',
        'Subscription is active',
      ),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/clients/${clientId}/cash-payments`)
      .set('authorization', bearer)
      .set('idempotency-key', idempotencyKey)
      .send({ planId, branchId })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('subscription_not_expired'));

    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/not-a-uuid`)
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}`)
      .expect(401);
  });
});
