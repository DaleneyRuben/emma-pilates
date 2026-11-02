import { UnauthorizedException } from '@nestjs/common';
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
  const operations = {
    salaryPayments: { listOwnSalaryPayments },
  } as unknown as BackOfficeOperations;
  const controller = new TrainerSalaryPaymentsController(
    operations,
    resolvePrincipal,
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
      },
    ]);

    await expect(controller.list(bearer)).resolves.toEqual([
      { id: 'payment-id', amountCentavos: 32_200, paidOn: '2026-10-01' },
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
});
