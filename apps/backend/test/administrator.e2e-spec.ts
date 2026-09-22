import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import {
  AdministratorPaymentsController,
  AdministratorSessionsController,
  cancelSessionCommand,
  receiptObjectStorage,
} from '../src/booking/payments/administrator.controller';
import { PaymentRuleError } from '../src/booking/payments/payment-errors';
import { paymentCommands } from '../src/booking/payments/payments.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const paymentId = '44444444-4444-4444-8444-444444444444';
const sessionId = '55555555-5555-4555-8555-555555555555';
const payment = {
  id: paymentId,
  method: 'transfer',
  state: 'pending',
  planId: '22222222-2222-4222-8222-222222222222',
  planName: 'Paquete de 8 clases',
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 0,
  amountDueCentavos: 56_000,
  submittedAt: new Date('2026-09-21T16:00:00.000Z'),
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
};

describe('administrator payments and sessions (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<(credential: string, meaningfulActivity: boolean) => Promise<AuthenticatedPrincipal>>();
  const commands = {
    listPendingPayments: jest.fn<() => Promise<unknown>>(),
    readPaymentReview: jest.fn<() => Promise<unknown>>(),
    readReceiptObject: jest.fn<() => Promise<unknown>>(),
    confirmTransfer: jest.fn<() => Promise<unknown>>(),
    rejectTransfer: jest.fn<() => Promise<unknown>>(),
  };
  const storage = { get: jest.fn<() => Promise<Buffer>>() };
  const cancelSession = jest.fn<() => Promise<unknown>>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'admin-account',
      authenticationSessionId: 'session',
      identity: { kind: 'staff', staffMemberId: 'admin', role: 'administrator', branchIds: [] },
    });
    commands.listPendingPayments.mockResolvedValue([
      {
        id: paymentId,
        clientName: 'Sofía Guzmán',
        planName: 'Paquete de 8 clases',
        amountDueCentavos: 56_000,
        submittedAt: new Date('2026-09-21T16:00:00.000Z'),
        receiptAvailable: true,
      },
    ]);
    commands.readPaymentReview.mockResolvedValue({
      ...payment,
      clientName: 'Sofía Guzmán',
      receipt: { imageAssetId: 'asset-1', mediaType: 'image/jpeg' },
    });
    commands.readReceiptObject.mockResolvedValue({ objectKey: 'pending/x', mediaType: 'image/jpeg' });
    commands.confirmTransfer.mockResolvedValue({ ...payment, state: 'confirmed' });
    commands.rejectTransfer.mockResolvedValue({ ...payment, state: 'rejected', rejectionReason: 'Monto' });
    storage.get.mockResolvedValue(Buffer.from('jpeg-bytes'));
    cancelSession.mockResolvedValue({ affectedBookings: 6 });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorPaymentsController, AdministratorSessionsController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: paymentCommands, useValue: commands },
        { provide: receiptObjectStorage, useValue: storage },
        { provide: cancelSessionCommand, useValue: cancelSession },
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

  it('serves the pending queue and a review with its receipt route', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/payments/pending')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({ id: paymentId, clientName: 'Sofía Guzmán', receiptAvailable: true }),
        ]);
      });
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/payments/${paymentId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: paymentId,
          clientName: 'Sofía Guzmán',
          receiptUrl: `/api/v1/administrator/payments/${paymentId}/receipt`,
        });
      });
  });

  it('streams the receipt privately', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/payments/${paymentId}/receipt`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(Buffer.from(body as Buffer).toString()).toBe('jpeg-bytes');
      });
  });

  it('confirms, rejects, and reports decision conflicts', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/confirm`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ state: 'confirmed' }));
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/reject`)
      .set('authorization', bearer)
      .send({ reason: 'Monto' })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ state: 'rejected' }));
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/reject`)
      .set('authorization', bearer)
      .send({ reason: '' })
      .expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'invalid_request' }));

    commands.confirmTransfer.mockRejectedValue(
      new PaymentRuleError('payment_confirmation_conflict', 'already rejected'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/confirm`)
      .set('authorization', bearer)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'payment_confirmation_conflict' }));
  });

  it('cancels a Session and maps denial and rule conflicts', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/sessions/${sessionId}/cancel`)
      .set('authorization', bearer)
      .expect(200)
      .expect({ affectedBookings: 6 });

    cancelSession.mockRejectedValue(new Error('Session has no Bookings'));
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/sessions/${sessionId}/cancel`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'session_has_no_bookings' }));

    cancelSession.mockRejectedValue(new BookingAccessDeniedError());
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/sessions/${sessionId}/cancel`)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'booking_access_denied' }));
  });

  it('requires authentication on every administrator route', async () => {
    for (const path of [
      '/api/v1/administrator/payments/pending',
      `/api/v1/administrator/payments/${paymentId}`,
      `/api/v1/administrator/payments/${paymentId}/receipt`,
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(401);
    }
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/sessions/${sessionId}/cancel`)
      .expect(401);
  });
});
