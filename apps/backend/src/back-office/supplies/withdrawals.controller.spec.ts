import { BadRequestException } from '@nestjs/common';
import type { BackOfficeOperations } from '../back-office-http';
import { AdministratorWithdrawalsController } from '../back-office.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const branchId = '0b0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-member-id',
    role: 'administrator' as const,
  },
};

// Walkthrough finding 102: AW31 asks for Restocks beside Withdrawals.
describe('AdministratorWithdrawalsController movement kinds', () => {
  const resolvePrincipal = jest.fn();
  const listWithdrawals = jest.fn<Promise<unknown>, [unknown, unknown]>();
  const operations = {
    supplies: { listWithdrawals },
  } as unknown as BackOfficeOperations;
  const controller = new AdministratorWithdrawalsController(
    operations,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
    listWithdrawals.mockResolvedValue({ items: [], totals: [] });
  });

  it('passes the asked kind through and leaves it out when absent', async () => {
    await controller.list(bearer, { branchId, month: '2026-11', kind: 'all' });
    await controller.list(bearer, { branchId, month: '2026-11' });

    expect(listWithdrawals.mock.calls.map(([query]) => query)).toEqual([
      { branchId, month: '2026-11', kind: 'all', page: 1, pageSize: 20 },
      { branchId, month: '2026-11', page: 1, pageSize: 20 },
    ]);
  });

  it('refuses an unknown kind', async () => {
    await expect(
      controller.list(bearer, { branchId, month: '2026-11', kind: 'sale' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
