import { UnauthorizedException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from './payment-errors';
import {
  AdministratorPaymentsController,
  AdministratorSessionsController,
} from './administrator.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const paymentId = '44444444-4444-4444-8444-444444444444';
const sessionId = '55555555-5555-4555-8555-555555555555';
const administrator = {
  accountId: 'admin-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'admin',
    role: 'administrator' as const,
    branchIds: [],
  },
};
const review = {
  id: paymentId,
  method: 'transfer' as const,
  state: 'pending' as const,
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
  clientName: 'Sofía Guzmán',
  receipt: { imageAssetId: 'asset-1', mediaType: 'image/jpeg' },
};

describe('AdministratorPaymentsController', () => {
  const resolvePrincipal = jest.fn();
  const commands = {
    listPendingPayments: jest.fn(),
    readPaymentReview: jest.fn(),
    readReceiptObject: jest.fn(),
    confirmTransfer: jest.fn(),
    rejectTransfer: jest.fn(),
  };
  const storage = { get: jest.fn() };
  const controller = new AdministratorPaymentsController(
    commands as never,
    storage,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(administrator);
  });

  it('lists the pending transfer queue with its age source', async () => {
    const pending = [
      {
        id: paymentId,
        clientName: 'Sofía Guzmán',
        planName: 'Paquete de 8 clases',
        amountDueCentavos: 56_000,
        submittedAt: new Date('2026-09-21T16:00:00.000Z'),
        receiptAvailable: true,
      },
    ];
    commands.listPendingPayments.mockResolvedValue(pending);

    await expect(controller.pending(bearer)).resolves.toEqual(pending);
    expect(commands.listPendingPayments).toHaveBeenCalledWith(administrator);
  });

  it('describes one Payment for review', async () => {
    commands.readPaymentReview.mockResolvedValue(review);

    await expect(controller.review(paymentId, bearer)).resolves.toEqual({
      ...review,
      receiptUrl: `/api/v1/administrator/payments/${paymentId}/receipt`,
    });
  });

  it('streams the receipt object without caching', async () => {
    commands.readReceiptObject.mockResolvedValue({
      objectKey: 'pending/transfer_receipt/x',
      mediaType: 'image/png',
    });
    storage.get.mockResolvedValue(Buffer.from('png'));
    const response = { setHeader: jest.fn() };

    const file = await controller.receipt(paymentId, bearer, response as never);

    expect(storage.get).toHaveBeenCalledWith('pending/transfer_receipt/x');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(file.getStream().read().toString()).toBe('png');
  });

  it('confirms and rejects with normalized reasons', async () => {
    commands.confirmTransfer.mockResolvedValue({ ...review, state: 'confirmed' });
    commands.rejectTransfer.mockResolvedValue({ ...review, state: 'rejected' });

    await expect(controller.confirm(paymentId, bearer)).resolves.toMatchObject({
      state: 'confirmed',
    });
    expect(commands.confirmTransfer).toHaveBeenCalledWith({ paymentId }, administrator);
    await expect(
      controller.reject(paymentId, bearer, { reason: 'El monto no coincide.' }),
    ).resolves.toMatchObject({ state: 'rejected' });
    expect(commands.rejectTransfer).toHaveBeenCalledWith(
      { paymentId, reason: 'El monto no coincide.' },
      administrator,
    );
  });

  it('rejects an empty reason and maps rule conflicts and denied access', async () => {
    await expect(
      controller.reject(paymentId, bearer, { reason: '   ' }),
    ).rejects.toMatchObject({ status: 400, response: { code: 'invalid_request' } });
    commands.confirmTransfer.mockRejectedValue(
      new PaymentRuleError('payment_confirmation_conflict', 'already rejected'),
    );
    await expect(controller.confirm(paymentId, bearer)).rejects.toMatchObject({
      status: 409,
      response: { code: 'payment_confirmation_conflict' },
    });
    commands.listPendingPayments.mockRejectedValue(new BookingAccessDeniedError());
    await expect(controller.pending(bearer)).rejects.toMatchObject({
      status: 403,
      response: { code: 'booking_access_denied' },
    });
    await expect(controller.pending(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AdministratorSessionsController', () => {
  const resolvePrincipal = jest.fn();
  const cancel = jest.fn();
  const controller = new AdministratorSessionsController(
    cancel,
    jest.fn(),
    resolvePrincipal,
  );

  beforeEach(() => {
    resolvePrincipal.mockResolvedValue(administrator);
  });

  it('cancels a Session and reports the affected Bookings', async () => {
    cancel.mockResolvedValue({ affectedBookings: 6 });

    await expect(controller.cancel(sessionId, bearer)).resolves.toEqual({
      affectedBookings: 6,
    });
    expect(cancel).toHaveBeenCalledWith({ sessionId }, administrator);
  });

  it('maps the cancellation rules to stable conflicts', async () => {
    cancel.mockRejectedValue(new Error('Session is not cancellable'));
    await expect(controller.cancel(sessionId, bearer)).rejects.toMatchObject({
      status: 409,
      response: { code: 'session_not_cancellable' },
    });
    cancel.mockRejectedValue(new Error('Session has no Bookings'));
    await expect(controller.cancel(sessionId, bearer)).rejects.toMatchObject({
      status: 409,
      response: { code: 'session_has_no_bookings' },
    });
    await expect(controller.cancel('nope', bearer)).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_request' },
    });
  });
});
