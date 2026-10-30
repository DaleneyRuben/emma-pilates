import { sendLifecycleMessages } from './send-lifecycle-messages';

const startsOn = new Date('2026-10-01T00:00:00.000Z');
const today = new Date('2026-10-08T00:00:00.000Z');

describe('sendLifecycleMessages', () => {
  it('records each due milestone once with destination none', async () => {
    const record = jest.fn().mockResolvedValue(true);

    await expect(
      sendLifecycleMessages({
        today,
        findFirstRealPlans: jest.fn().mockResolvedValue([
          {
            clientId: 'client-1',
            accountId: 'account-1',
            startsOn,
            sentMilestones: [],
          },
        ]),
        record,
      }),
    ).resolves.toEqual({ sent: 1 });

    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith({
      clientId: 'client-1',
      accountId: 'account-1',
      milestone: 'day_2',
      notification: null,
    });
    expect(record).toHaveBeenNthCalledWith(2, {
      clientId: 'client-1',
      accountId: 'account-1',
      milestone: 'week_1',
      notification: {
        accountId: 'account-1',
        category: 'reminder',
        type: 'lifecycle_week_1',
        businessEventKey: 'lifecycle:week_1:client-1',
        title: 'Tu primera semana',
        message:
          '¿Cómo te sentiste en tus primeras clases? Si tienes alguna duda sobre los ejercicios o el nivel, cuéntale a tu instructora: estamos para acompañarte.',
        destination: null,
        occurredAt: today,
      },
    });
  });

  it('skips milestones already sent so a rerun sends nothing twice', async () => {
    const record = jest.fn().mockResolvedValue(true);

    await expect(
      sendLifecycleMessages({
        today,
        findFirstRealPlans: jest.fn().mockResolvedValue([
          {
            clientId: 'client-1',
            accountId: 'account-1',
            startsOn,
            sentMilestones: ['day_2', 'week_1'],
          },
        ]),
        record,
      }),
    ).resolves.toEqual({ sent: 0 });
    expect(record).not.toHaveBeenCalled();
  });

  it('counts only inserts that actually recorded a row', async () => {
    const record = jest.fn().mockResolvedValue(false);

    await expect(
      sendLifecycleMessages({
        today,
        findFirstRealPlans: jest.fn().mockResolvedValue([
          {
            clientId: 'client-1',
            accountId: 'account-1',
            startsOn,
            sentMilestones: [],
          },
        ]),
        record,
      }),
    ).resolves.toEqual({ sent: 0 });
  });
});
