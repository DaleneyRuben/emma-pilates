import { jest } from '@jest/globals';
import {
  admitStaffEmailRequest,
  type StaffEmailBudgetGateway,
  StaffEmailThrottledError,
} from './admit-staff-email-request';

const now = new Date('2026-10-01T15:00:00.000Z');

const dependencies = (wait: number) => {
  const admit = jest.fn<StaffEmailBudgetGateway['admit']>(() =>
    Promise.resolve(wait),
  );

  return { admit, dependencies: { gateway: { admit }, now: () => now } };
};

describe('admitStaffEmailRequest (BE-013)', () => {
  it('records the request under the signed-in Account for 24 hours', async () => {
    const { admit, dependencies: deps } = dependencies(0);

    await admitStaffEmailRequest(
      { accountId: 'account-1', purpose: 'activation' },
      deps,
    );

    expect(admit).toHaveBeenCalledWith({
      accountId: 'account-1',
      purpose: 'activation',
      now,
      expiresAt: new Date('2026-10-02T15:00:00.000Z'),
      waitSeconds: expect.any(Function) as unknown,
    });
  });

  it('decides with the Account budget', async () => {
    const { admit, dependencies: deps } = dependencies(0);

    await admitStaffEmailRequest(
      { accountId: 'account-1', purpose: 'verification' },
      deps,
    );
    const { waitSeconds } = admit.mock.calls[0][0];
    const twentyRecent = Array.from(
      { length: 20 },
      () => new Date(now.getTime() - 60_000),
    );

    expect(waitSeconds(twentyRecent)).toBe(14 * 60);
  });

  it('refuses with the wait when the Account budget is full', async () => {
    const { dependencies: deps } = dependencies(75);

    await expect(
      admitStaffEmailRequest(
        { accountId: 'account-1', purpose: 'activation' },
        deps,
      ),
    ).rejects.toEqual(new StaffEmailThrottledError(75));
  });
});
