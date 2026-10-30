import { endLapsedFounderMemberships } from './end-lapsed-founder-memberships';

const today = new Date('2026-10-23T00:00:00.000Z');
// 09:00 that day in La Paz, when the loss is stamped and pushed.
const occurredAt = new Date('2026-10-23T13:00:00.000Z');
const lapsed = (id: string) => ({
  id,
  clientId: `client-${id}`,
  accountId: `account-${id}`,
  number: 4,
  latestRealEnd: new Date('2026-10-14T00:00:00.000Z'),
  nextStart: null,
});
const rules = {
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
};

describe('endLapsedFounderMemberships', () => {
  it('ends a gap of more than 7 days at the morning it is stamped with', async () => {
    const markLost = jest.fn().mockResolvedValue(true);

    await expect(
      endLapsedFounderMemberships({
        today,
        occurredAt,
        rules,
        findActive: jest.fn().mockResolvedValue([lapsed('membership-1')]),
        markLost,
      }),
    ).resolves.toEqual({ ended: 1 });

    expect(markLost).toHaveBeenCalledWith({
      id: 'membership-1',
      accountId: 'account-membership-1',
      reason: 'gap',
      occurredAt,
    });
  });

  it('counts only the memberships it actually ended', async () => {
    await expect(
      endLapsedFounderMemberships({
        today,
        occurredAt,
        rules,
        findActive: jest
          .fn()
          .mockResolvedValue([lapsed('ended'), lapsed('already-lost')]),
        markLost: jest.fn(({ id }: { id: string }) =>
          Promise.resolve(id === 'ended'),
        ),
      }),
    ).resolves.toEqual({ ended: 1 });
  });

  it('ends the others when one fails, then reports the one that failed', async () => {
    const markLost = jest.fn(({ id }: { id: string }) =>
      id === 'broken'
        ? Promise.reject(new Error('lock timeout'))
        : Promise.resolve(true),
    );

    await expect(
      endLapsedFounderMemberships({
        today,
        occurredAt,
        rules,
        findActive: jest
          .fn()
          .mockResolvedValue([lapsed('broken'), lapsed('fine')]),
        markLost,
      }),
    ).rejects.toThrow('founder_memberships failed for 1 item: broken');
    expect(markLost).toHaveBeenCalledTimes(2);
  });

  it('leaves a gap of 7 days and an already covered renewal alone', async () => {
    const markLost = jest.fn();

    await expect(
      endLapsedFounderMemberships({
        today,
        occurredAt,
        rules,
        findActive: jest.fn().mockResolvedValue([
          {
            id: 'kept',
            clientId: 'client-2',
            accountId: 'account-2',
            number: 5,
            latestRealEnd: new Date('2026-10-16T00:00:00.000Z'),
            nextStart: null,
          },
          {
            id: 'renewed',
            clientId: 'client-3',
            accountId: 'account-3',
            number: 6,
            latestRealEnd: new Date('2026-10-10T00:00:00.000Z'),
            nextStart: new Date('2026-10-17T00:00:00.000Z'),
          },
        ]),
        markLost,
      }),
    ).resolves.toEqual({ ended: 0 });
    expect(markLost).not.toHaveBeenCalled();
  });
});
