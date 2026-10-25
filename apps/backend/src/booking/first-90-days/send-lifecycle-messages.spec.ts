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
    ).resolves.toEqual({ sent: 2 });

    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith({
      clientId: 'client-1',
      accountId: 'account-1',
      milestone: 'day_2',
      notification: {
        accountId: 'account-1',
        category: 'reminder',
        type: 'lifecycle_day_2',
        businessEventKey: 'lifecycle:day_2:client-1',
        title: 'Tu segunda clase',
        message:
          '¿Cómo te fue en tu primera clase? Tu segunda clase es el mejor momento para afianzar lo que aprendiste. Reserva cuando quieras: tu lugar te espera.',
        destination: null,
        occurredAt: today,
      },
    });
    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ milestone: 'week_1' }),
    );
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
