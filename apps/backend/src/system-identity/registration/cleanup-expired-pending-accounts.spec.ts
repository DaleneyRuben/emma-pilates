import { CleanupExpiredPendingAccounts } from './cleanup-expired-pending-accounts';

describe('CleanupExpiredPendingAccounts', () => {
  it('removes pending Accounts whose inactivity window expired', async () => {
    const now = new Date('2026-09-07T00:00:00.000Z');
    const cleanup = jest.fn().mockResolvedValue(2);
    const useCase = new CleanupExpiredPendingAccounts({
      gateway: { cleanup },
      now: () => now,
      newId: () => '0198fbc1-2600-7ac8-a17f-0a20e342bb0a',
    });

    await expect(useCase.execute()).resolves.toEqual({ cleaned: 2 });
    expect(cleanup).toHaveBeenCalledWith({
      now,
      correlationId: '0198fbc1-2600-7ac8-a17f-0a20e342bb0a',
    });
  });
});
