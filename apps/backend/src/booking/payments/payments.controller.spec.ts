import { UnauthorizedException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from './payment-errors';
import {
  ClientCreditController,
  ClientPaymentsController,
  ClientReferralsController,
  CreditPurchasesController,
  PurchaseIntentsController,
  TransferInstructionsController,
} from './payments.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const key = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const intentId = '33333333-3333-4333-8333-333333333333';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const intent = {
  id: intentId,
  planId,
  planName: 'Paquete de 8 clases',
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditReservedCentavos: 0,
  amountDueCentavos: 56_000,
  state: 'open' as const,
  receiptAttached: false,
  createdAt: new Date('2026-09-21T15:00:00.000Z'),
  expiresAt: new Date('2026-09-22T15:00:00.000Z'),
};
const payment = {
  id: '44444444-4444-4444-8444-444444444444',
  method: 'transfer' as const,
  state: 'pending' as const,
  planId,
  planName: 'Paquete de 8 clases',
  durationDays: 30,
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

const commands = () => ({
  createPurchaseIntent: jest.fn(),
  attachReceipt: jest.fn(),
  submitTransfer: jest.fn(),
  completeCreditPurchase: jest.fn(),
  readOpenPurchaseIntent: jest.fn(),
  readCurrentPayment: jest.fn(),
  readCreditSummary: jest.fn(),
  readCreditActivity: jest.fn(),
  readReferrals: jest.fn(),
});

describe('PurchaseIntentsController', () => {
  const resolvePrincipal = jest.fn();
  const handlers = commands();
  const controller = new PurchaseIntentsController(
    handlers as never,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('creates a Purchase Intent with the Idempotency-Key', async () => {
    handlers.createPurchaseIntent.mockResolvedValue(intent);

    await expect(controller.create(bearer, key, { planId })).resolves.toEqual(
      intent,
    );
    expect(handlers.createPurchaseIntent).toHaveBeenCalledWith(
      { planId },
      principal,
      key,
    );
  });

  it('rejects a missing Idempotency-Key and an invalid body', async () => {
    await expect(
      controller.create(bearer, undefined, { planId }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_request' },
    });
    await expect(
      controller.create(bearer, key, { planId: 'nope' }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_request' },
    });
    expect(handlers.createPurchaseIntent).not.toHaveBeenCalled();
  });

  it('maps payment rule errors to their stable codes and statuses', async () => {
    handlers.createPurchaseIntent.mockRejectedValue(
      new PaymentRuleError('subscription_not_expired', 'still active'),
    );

    await expect(
      controller.create(bearer, key, { planId }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'subscription_not_expired', detail: 'still active' },
    });
  });

  it('maps denied access to a 403 problem and requires a bearer credential', async () => {
    handlers.readOpenPurchaseIntent.mockRejectedValue(
      new BookingAccessDeniedError(),
    );

    await expect(controller.current(bearer)).rejects.toMatchObject({
      status: 403,
      response: { code: 'booking_access_denied' },
    });
    await expect(controller.current(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('answers 404 when no open Purchase Intent exists', async () => {
    handlers.readOpenPurchaseIntent.mockResolvedValue(null);

    await expect(controller.current(bearer)).rejects.toMatchObject({
      status: 404,
      response: { code: 'purchase_intent_not_found' },
    });
  });

  it('attaches a receipt and submits the transfer', async () => {
    handlers.attachReceipt.mockResolvedValue({
      ...intent,
      receiptAttached: true,
    });
    handlers.submitTransfer.mockResolvedValue(payment);
    const imageAssetId = '55555555-5555-4555-8555-555555555555';

    await expect(
      controller.attachReceipt(intentId, bearer, key, { imageAssetId }),
    ).resolves.toMatchObject({ receiptAttached: true });
    expect(handlers.attachReceipt).toHaveBeenCalledWith(
      { purchaseIntentId: intentId, imageAssetId },
      principal,
      key,
    );
    await expect(controller.submit(intentId, bearer, key, {})).resolves.toEqual(
      payment,
    );
    expect(handlers.submitTransfer).toHaveBeenCalledWith(
      { purchaseIntentId: intentId, invoiceData: null },
      principal,
      key,
    );
  });
});

describe('client payment reads and Credit-only purchases', () => {
  const resolvePrincipal = jest.fn();
  const handlers = commands();

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('hands a deprecated Credit-only purchase to the command, which refuses it (PAY-005)', async () => {
    handlers.completeCreditPurchase.mockRejectedValue(
      new PaymentRuleError('credit_insufficient', 'Credit was retired'),
    );
    const controller = new CreditPurchasesController(
      handlers as never,
      resolvePrincipal,
    );

    await expect(
      controller.create(bearer, key, { planId }),
    ).rejects.toMatchObject({ status: 409 });
    expect(handlers.completeCreditPurchase).toHaveBeenCalledWith(principal);
  });

  it('serves the latest own Payment or 404', async () => {
    const controller = new ClientPaymentsController(
      handlers as never,
      resolvePrincipal,
    );
    handlers.readCurrentPayment.mockResolvedValue(payment);
    await expect(controller.current(bearer)).resolves.toEqual(payment);

    handlers.readCurrentPayment.mockResolvedValue(null);
    await expect(controller.current(bearer)).rejects.toMatchObject({
      status: 404,
      response: { code: 'payment_not_found' },
    });
  });

  it('serves the Credit summary with recent activity', async () => {
    handlers.readCreditSummary.mockResolvedValue({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });
    handlers.readCreditActivity.mockResolvedValue([
      {
        id: 'entry-1',
        kind: 'referral_award',
        amountCentavos: 6000,
        occurredAt: new Date('2026-09-21T15:00:00.000Z'),
      },
    ]);
    const controller = new ClientCreditController(
      handlers as never,
      resolvePrincipal,
    );

    await expect(controller.read(bearer)).resolves.toEqual({
      availableCentavos: 6000,
      reservedCentavos: 0,
      activity: [
        {
          id: 'entry-1',
          kind: 'referral_award',
          amountCentavos: 6000,
          occurredAt: new Date('2026-09-21T15:00:00.000Z'),
        },
      ],
    });
  });

  it('serves the referral code and referred Clients', async () => {
    const referrals = {
      referralCode: 'LUCIA-2026',
      referrals: [
        {
          referredClientId: 'client-2',
          referredName: 'Sofía G.',
          state: 'awarded',
          createdAt: new Date('2026-09-21T15:00:00.000Z'),
          awardedAt: new Date('2026-09-21T15:00:00.000Z'),
          awardCentavos: 6000,
        },
      ],
    };
    handlers.readReferrals.mockResolvedValue(referrals);
    const controller = new ClientReferralsController(
      handlers as never,
      resolvePrincipal,
    );

    await expect(controller.read(bearer)).resolves.toEqual(referrals);
  });
});

describe('TransferInstructionsController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const controller = new TransferInstructionsController(
    {
      qrImagePath: '.data/transfer-qr.png',
    },
    resolvePrincipal,
  );

  it('serves the backend QR route with the deprecated bank details left empty', async () => {
    await expect(controller.read(bearer)).resolves.toEqual({
      beneficiaryName: '',
      bankName: '',
      accountNumber: '',
      qrImageUrl: '/api/v1/transfer-instructions/qr',
    });
  });

  it('requires a bearer credential', async () => {
    await expect(controller.read(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
