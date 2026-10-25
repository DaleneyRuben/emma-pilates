import { endLapsedFounderMemberships } from './end-lapsed-founder-memberships';

const today = new Date('2026-10-23T00:00:00.000Z');
const rules = {
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
};

describe('endLapsedFounderMemberships', () => {
  it('ends a gap of more than 7 days, audits it, and tells the Client once', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const markLost = jest.fn().mockResolvedValue(undefined);

    await expect(
      endLapsedFounderMemberships({
        today,
        rules,
        findActive: jest.fn().mockResolvedValue([
          {
            id: 'membership-1',
            clientId: 'client-1',
            accountId: 'account-1',
            number: 4,
            latestRealEnd: new Date('2026-10-15T00:00:00.000Z'),
            nextStart: null,
          },
        ]),
        markLost,
        record,
      }),
    ).resolves.toEqual({ ended: 1 });

    expect(markLost).toHaveBeenCalledWith({
      id: 'membership-1',
      reason: 'gap',
      occurredAt: today,
    });
    expect(record).toHaveBeenCalledWith({
      accountId: 'account-1',
      category: 'reminder',
      type: 'founder_membership_lost',
      businessEventKey: 'founder-membership-lost:membership-1',
      title: 'Membresía fundadora',
      message:
        'Pasaron más de 7 días sin plan, así que tu membresía fundadora se perdió.',
      destination: { type: 'subscription', id: null },
      occurredAt: today,
    });
  });

  it('leaves a gap of 7 days and an already covered renewal alone', async () => {
    const markLost = jest.fn();

    await expect(
      endLapsedFounderMemberships({
        today,
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
        record: jest.fn(),
      }),
    ).resolves.toEqual({ ended: 0 });
    expect(markLost).not.toHaveBeenCalled();
  });
});
