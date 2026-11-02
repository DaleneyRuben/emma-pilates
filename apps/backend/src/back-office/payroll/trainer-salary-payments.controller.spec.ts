import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import type { BackOfficeOperations } from '../back-office-http';
import { BackOfficeError } from '../back-office-errors';
import { TrainerSalaryPaymentsController } from './trainer-salary-payments.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-member-id',
    role: 'trainer' as const,
  },
};

describe('TrainerSalaryPaymentsController', () => {
  const resolvePrincipal = jest.fn();
  const listOwnSalaryPayments = jest.fn();
  const readOwnSalaryReceipt = jest.fn();
  const get = jest.fn();
  const operations = {
    salaryPayments: { listOwnSalaryPayments },
    salaryReceipts: { readOwnSalaryReceipt },
  } as unknown as BackOfficeOperations;
  const controller = new TrainerSalaryPaymentsController(
    operations,
    resolvePrincipal,
    { get },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('lists the signed-in Trainer’s payments with civil dates', async () => {
    listOwnSalaryPayments.mockResolvedValue([
      {
        id: 'payment-id',
        amountCentavos: 32_200,
        paidOn: new Date('2026-10-01T00:00:00.000Z'),
        receiptImageAssetId: 'photo-id',
      },
      {
        id: 'bare-id',
        amountCentavos: 15_050,
        paidOn: new Date('2026-09-15T00:00:00.000Z'),
        receiptImageAssetId: null,
      },
    ]);

    // BKO-008: S29's «Ver» opens her own receipt route.
    await expect(controller.list(bearer)).resolves.toEqual([
      {
        id: 'payment-id',
        amountCentavos: 32_200,
        paidOn: '2026-10-01',
        receiptUrl: '/api/v1/trainer/salary-payments/payment-id/receipt',
      },
      {
        id: 'bare-id',
        amountCentavos: 15_050,
        paidOn: '2026-09-15',
        receiptUrl: null,
      },
    ]);
    expect(listOwnSalaryPayments).toHaveBeenCalledWith(principal);
  });

  it('requires a bearer credential', async () => {
    await expect(controller.list(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps a denied Role to a 403 problem', async () => {
    listOwnSalaryPayments.mockRejectedValue(
      new BackOfficeError('back_office_access_denied'),
    );

    await expect(controller.list(bearer)).rejects.toMatchObject({
      response: { code: 'back_office_access_denied' },
      status: 403,
    });
  });

  it('streams her own receipt', async () => {
    const paymentId = '0b0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
    readOwnSalaryReceipt.mockResolvedValue({
      objectKey: 'private/receipt/thumbnail',
      mediaType: 'image/webp',
    });
    get.mockResolvedValue(Buffer.from('webp'));
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    await controller.receipt(paymentId, 'thumbnail', bearer, response);

    expect(readOwnSalaryReceipt).toHaveBeenCalledWith(
      { salaryPaymentId: paymentId, variant: 'thumbnail' },
      principal,
    );
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
});
