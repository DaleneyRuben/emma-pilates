import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import type { BackOfficeOperations } from '../back-office-http';
import { BackOfficeError } from '../back-office-errors';
import { OwnPayController } from './own-pay.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-member-id',
    role: 'coordinator' as const,
    branchIds: [],
  },
};
const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// ADR-0111: «Mis pagos» for every paid Staff Member, on Role-neutral routes
// keyed on the signed-in Staff Member.
describe('OwnPayController', () => {
  const resolvePrincipal = jest.fn();
  const listOwnStatements = jest.fn();
  const listOwnSalaryPayments = jest.fn();
  const readOwnSalaryReceipt = jest.fn();
  const get = jest.fn();
  const operations = {
    payStatements: { listOwnStatements },
    salaryPayments: { listOwnSalaryPayments },
    salaryReceipts: { readOwnSalaryReceipt },
  } as unknown as BackOfficeOperations;
  const controller = new OwnPayController(operations, resolvePrincipal, {
    get,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('lists her own statements with civil dates', async () => {
    listOwnStatements.mockResolvedValue([
      {
        id: 'statement-id',
        staffMemberId: 'staff-member-id',
        staffMemberName: 'Carolina Rivas',
        month: civil('2026-10-01'),
        periodStart: civil('2026-10-01'),
        periodEnd: civil('2026-11-01'),
        approvableOn: civil('2026-11-08'),
        state: 'approved',
        totalCentavos: 378_000,
        salaryPaymentId: 'payment-id',
        lines: [{ kind: 'base', detail: 'Base', amountCentavos: 350_000 }],
      },
    ]);

    await expect(controller.statements(bearer)).resolves.toEqual([
      expect.objectContaining({
        id: 'statement-id',
        month: '2026-10-01',
        periodStart: '2026-10-01',
        periodEnd: '2026-11-01',
        approvableOn: '2026-11-08',
        totalCentavos: 378_000,
      }),
    ]);
    expect(listOwnStatements).toHaveBeenCalledWith(principal);
  });

  it('lists her own payments with a receipt link on her own route', async () => {
    listOwnSalaryPayments.mockResolvedValue([
      {
        id: 'payment-id',
        amountCentavos: 378_000,
        paidOn: civil('2026-11-02'),
        receiptImageAssetId: 'photo-id',
      },
      {
        id: 'bare-id',
        amountCentavos: 41_000,
        paidOn: civil('2026-10-15'),
        receiptImageAssetId: null,
      },
    ]);

    await expect(controller.payments(bearer)).resolves.toEqual([
      {
        id: 'payment-id',
        amountCentavos: 378_000,
        paidOn: '2026-11-02',
        receiptUrl:
          '/api/v1/staff-members/current/salary-payments/payment-id/receipt',
      },
      {
        id: 'bare-id',
        amountCentavos: 41_000,
        paidOn: '2026-10-15',
        receiptUrl: null,
      },
    ]);
    expect(listOwnSalaryPayments).toHaveBeenCalledWith(principal);
  });

  it('requires a bearer credential', async () => {
    await expect(controller.statements(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.payments(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps a denied Role to a 403 problem', async () => {
    listOwnStatements.mockRejectedValue(
      new BackOfficeError('back_office_access_denied'),
    );

    await expect(controller.statements(bearer)).rejects.toMatchObject({
      response: { code: 'back_office_access_denied' },
      status: 403,
    });
  });

  it('streams her own receipt', async () => {
    const paymentId = '0b0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
    readOwnSalaryReceipt.mockResolvedValue({
      objectKey: 'private/receipt/readable',
      mediaType: 'image/webp',
    });
    get.mockResolvedValue(Buffer.from('webp'));
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    await controller.receipt(paymentId, 'readable', bearer, response);

    expect(readOwnSalaryReceipt).toHaveBeenCalledWith(
      { salaryPaymentId: paymentId, variant: 'readable' },
      principal,
    );
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
});
