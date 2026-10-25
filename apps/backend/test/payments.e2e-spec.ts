import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { PaymentRuleError } from '../src/booking/payments/payment-errors';
import {
  ClientCreditController,
  ClientPaymentsController,
  ClientReferralsController,
  CreditPurchasesController,
  paymentCommands,
  PurchaseIntentsController,
  transferInstructions,
  TransferInstructionsController,
} from '../src/booking/payments/payments.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const key = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const intentId = '33333333-3333-4333-8333-333333333333';
const intent = {
  id: intentId,
  planId,
  planName: 'Paquete de 8 clases',
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditReservedCentavos: 6000,
  amountDueCentavos: 50_000,
  startsOn: '2026-09-21',
  state: 'open',
  receiptAttached: false,
  createdAt: new Date('2026-09-21T15:00:00.000Z'),
  expiresAt: new Date('2026-09-22T15:00:00.000Z'),
};
const payment = {
  id: '44444444-4444-4444-8444-444444444444',
  method: 'transfer',
  state: 'pending',
  planId,
  planName: 'Paquete de 8 clases',
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 6000,
  amountDueCentavos: 50_000,
  startsOn: '2026-09-21',
  submittedAt: new Date('2026-09-21T16:00:00.000Z'),
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
};

describe('client payments (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const commands = {
    createPurchaseIntent: jest.fn<() => Promise<unknown>>(),
    attachReceipt: jest.fn<() => Promise<unknown>>(),
    submitTransfer: jest.fn<() => Promise<unknown>>(),
    completeCreditPurchase: jest.fn<() => Promise<unknown>>(),
    readOpenPurchaseIntent: jest.fn<() => Promise<unknown>>(),
    readCurrentPayment: jest.fn<() => Promise<unknown>>(),
    readCreditSummary: jest.fn<() => Promise<unknown>>(),
    readCreditActivity: jest.fn<() => Promise<unknown>>(),
    readReferrals: jest.fn<() => Promise<unknown>>(),
  };
  const qrDirectory = mkdtempSync(join(tmpdir(), 'pilates-qr-'));
  const qrImagePath = join(qrDirectory, 'qr.png');

  beforeAll(() => {
    writeFileSync(qrImagePath, Buffer.from('89504e470d0a1a0a', 'hex'));
  });

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    commands.createPurchaseIntent.mockResolvedValue(intent);
    commands.attachReceipt.mockResolvedValue({
      ...intent,
      receiptAttached: true,
    });
    commands.submitTransfer.mockResolvedValue(payment);
    commands.completeCreditPurchase.mockRejectedValue(
      new PaymentRuleError('credit_insufficient', 'Credit was retired'),
    );
    commands.readOpenPurchaseIntent.mockResolvedValue(intent);
    commands.readCurrentPayment.mockResolvedValue(payment);
    commands.readCreditSummary.mockResolvedValue({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });
    commands.readCreditActivity.mockResolvedValue([]);
    commands.readReferrals.mockResolvedValue({
      referralCode: 'LUCIA-2026',
      referrals: [],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        PurchaseIntentsController,
        CreditPurchasesController,
        ClientPaymentsController,
        ClientCreditController,
        ClientReferralsController,
        TransferInstructionsController,
      ],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: paymentCommands, useValue: commands },
        {
          provide: transferInstructions,
          useValue: {
            qrImagePath,
          },
        },
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

  it('creates a Purchase Intent and never caches the response', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-intents')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ planId })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: intentId,
          amountDueCentavos: 50_000,
          state: 'open',
          expiresAt: '2026-09-22T15:00:00.000Z',
        });
      });
  });

  it('requires an Idempotency-Key on purchase commands', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-intents')
      .set('authorization', bearer)
      .send({ planId })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'invalid_request' });
      });
  });

  it('reports payment rule violations as RFC 9457 problems with stable codes', async () => {
    commands.createPurchaseIntent.mockRejectedValue(
      new PaymentRuleError('purchase_intent_open_exists', 'open'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/purchase-intents')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ planId })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(409)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'purchase_intent_open_exists',
          status: 409,
        });
      });
  });

  it('attaches a receipt and submits the transfer', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-intents/${intentId}/receipt`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ imageAssetId: '55555555-5555-4555-8555-555555555555' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ receiptAttached: true });
      });
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-intents/${intentId}/submit`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ method: 'transfer', state: 'pending' });
      });
    // A release before PAY-007 sends no body: the sale is «Sin factura».
    expect(commands.submitTransfer).toHaveBeenLastCalledWith(
      { purchaseIntentId: intentId, invoiceData: null },
      expect.objectContaining({ accountId: 'account-id' }),
      key,
    );
  });

  it('submits the transfer with the Invoice Data the Client typed, tidied', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-intents/${intentId}/submit`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ invoiceData: { taxId: ' 4567891-1a ', name: ' Ana  Pérez ' } })
      .expect(201);
    expect(commands.submitTransfer).toHaveBeenLastCalledWith(
      {
        purchaseIntentId: intentId,
        invoiceData: { taxId: '4567891-1A', name: 'Ana Pérez' },
      },
      expect.anything(),
      key,
    );

    for (const body of [
      { invoiceData: { taxId: '4567891' } },
      { invoiceData: { taxId: 'sin numero', name: 'Ana' } },
      { invoiceData: null, extra: true },
    ]) {
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-intents/${intentId}/submit`)
        .set('authorization', bearer)
        .set('idempotency-key', key)
        .send(body)
        .expect(400)
        .expect(({ body: problem }: { body: { code: string } }) =>
          expect(problem.code).toBe('invalid_request'),
        );
    }
    expect(commands.submitTransfer).toHaveBeenCalledTimes(1);
  });

  it('serves the current Purchase Intent, Payment, Credit, and referrals', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/purchase-intents/current')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ id: intentId }));
    await request(app.getHttpServer())
      .get('/api/v1/payments/current')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ id: payment.id }));
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/credit')
      .set('authorization', bearer)
      .expect(200)
      .expect({ availableCentavos: 6000, reservedCentavos: 0, activity: [] });
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/referrals')
      .set('authorization', bearer)
      .expect(200)
      .expect({ referralCode: 'LUCIA-2026', referrals: [] });
  });

  it('answers 404 problems when nothing is open or paid yet', async () => {
    commands.readOpenPurchaseIntent.mockResolvedValue(null);
    commands.readCurrentPayment.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/v1/purchase-intents/current')
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'purchase_intent_not_found' });
      });
    await request(app.getHttpServer())
      .get('/api/v1/payments/current')
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'payment_not_found' });
      });
  });

  it('refuses the deprecated Credit-only purchase with a stable code (PAY-005)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/credit-purchases')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ planId })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('credit_insufficient');
      });
  });

  it('serves the QR-only transfer instructions and streams the QR image without caching', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/transfer-instructions')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({
        beneficiaryName: '',
        bankName: '',
        accountNumber: '',
        qrImageUrl: '/api/v1/transfer-instructions/qr',
      });
    await request(app.getHttpServer())
      .get('/api/v1/transfer-instructions/qr')
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', 'no-store');
  });

  it('requires authentication on every payment route', async () => {
    for (const path of [
      '/api/v1/purchase-intents/current',
      '/api/v1/payments/current',
      '/api/v1/clients/current/credit',
      '/api/v1/clients/current/referrals',
      '/api/v1/transfer-instructions',
      '/api/v1/transfer-instructions/qr',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(401);
    }
  });
});
