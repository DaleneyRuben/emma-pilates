import { BadRequestException, StreamableFile } from '@nestjs/common';
import type { BackOfficeOperations } from '../back-office-http';
import { BackOfficeError } from '../back-office-errors';
import { AdministratorSalaryPaymentsController } from './salary-payments.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const paymentId = '0b0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
const photoId = '3c3f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-member-id',
    role: 'administrator' as const,
  },
};
const row = {
  id: paymentId,
  staffMemberId: 'staff-member-id',
  staffMemberName: 'Emma Vargas',
  amountCentavos: 32_200,
  paidOn: new Date('2026-10-01T00:00:00.000Z'),
  receiptImageAssetId: photoId,
};

// BKO-008: Nómina names each payment's receipt by its route, never the asset.
describe('AdministratorSalaryPaymentsController receipts', () => {
  const resolvePrincipal = jest.fn();
  const listSalaryPayments = jest.fn();
  const recordSalaryPayment = jest.fn();
  const readSalaryReceipt = jest.fn();
  const get = jest.fn();
  const operations = {
    salaryPayments: { listSalaryPayments, recordSalaryPayment },
    salaryReceipts: { readSalaryReceipt },
  } as unknown as BackOfficeOperations;
  const controller = new AdministratorSalaryPaymentsController(
    operations,
    resolvePrincipal,
    { get },
  );
  const response = { setHeader: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('lists each payment with its receipt route', async () => {
    listSalaryPayments.mockResolvedValue({
      items: [row, { ...row, id: 'bare', receiptImageAssetId: null }],
      page: 1,
      pageSize: 20,
      totalItems: 2,
    });

    const page = await controller.list(bearer, {});

    expect(page.items).toEqual([
      {
        id: paymentId,
        staffMemberId: 'staff-member-id',
        staffMemberName: 'Emma Vargas',
        amountCentavos: 32_200,
        paidOn: '2026-10-01',
        receiptUrl: `/api/v1/administrator/salary-payments/${paymentId}/receipt`,
      },
      expect.objectContaining({ id: 'bare', receiptUrl: null }),
    ]);
  });

  it('records a payment with the receipt she uploaded', async () => {
    recordSalaryPayment.mockResolvedValue(row);

    await controller.record(bearer, '5a0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3', {
      staffMemberId: 'a6a0f7a5-7d7c-4bbf-9d49-5d7bd4a1b2c3',
      amountCentavos: 32_200,
      paidOn: '2026-10-01',
      receiptImageAssetId: photoId,
    });

    expect(recordSalaryPayment).toHaveBeenCalledWith(
      expect.objectContaining({ receiptImageAssetId: photoId }),
      principal,
      expect.any(String),
    );
  });

  it('streams the receipt without caching', async () => {
    readSalaryReceipt.mockResolvedValue({
      objectKey: 'private/receipt/readable',
      mediaType: 'image/webp',
    });
    get.mockResolvedValue(Buffer.from('webp'));

    const file = await controller.receipt(
      paymentId,
      undefined,
      bearer,
      response,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(readSalaryReceipt).toHaveBeenCalledWith(
      { salaryPaymentId: paymentId, variant: 'readable' },
      principal,
    );
    expect(get).toHaveBeenCalledWith('private/receipt/readable');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'image/webp',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('refuses an unknown variant and maps a missing receipt to 404', async () => {
    await expect(
      controller.receipt(paymentId, 'original', bearer, response as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    readSalaryReceipt.mockRejectedValue(
      new BackOfficeError('salary_receipt_not_found'),
    );
    await expect(
      controller.receipt(paymentId, 'thumbnail', bearer, response as never),
    ).rejects.toMatchObject({
      response: { code: 'salary_receipt_not_found' },
      status: 404,
    });
  });
});
