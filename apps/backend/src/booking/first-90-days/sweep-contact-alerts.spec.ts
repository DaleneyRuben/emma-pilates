import { reasonsToOpen, sweepContactAlerts } from './sweep-contact-alerts';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

const state = (
  extra: Partial<Parameters<typeof reasonsToOpen>[0]> = {},
): Parameters<typeof reasonsToOpen>[0] => ({
  clientId: 'client-1',
  startsOn,
  lastBookedOn: null,
  lastBookedAt: null,
  hasUpcomingBooking: false,
  bookedClassCount: 0,
  bookedClassCount30: 0,
  openUncontacted: {},
  lastContactedAt: {},
  everOpened: {},
  ...extra,
});

describe('reasonsToOpen', () => {
  it('opens the 7-day alert on day 7 when she has not booked', () => {
    expect(
      reasonsToOpen(state(), new Date('2026-10-08T00:00:00.000Z')),
    ).toEqual(['no_booking_7_days']);
  });

  it('does not open a second 7-day alert while one is still uncontacted', () => {
    expect(
      reasonsToOpen(
        state({ openUncontacted: { no_booking_7_days: true } }),
        new Date('2026-10-08T00:00:00.000Z'),
      ),
    ).toEqual([]);
  });

  it('opens the day-15 and day-30 alerts once when the class counts stay low', () => {
    expect(
      reasonsToOpen(
        state({ bookedClassCount: 1 }),
        new Date('2026-10-16T00:00:00.000Z'),
      ),
    ).toEqual(['no_booking_7_days', 'fewer_than_2_classes_by_day_15']);
    expect(
      reasonsToOpen(
        state({
          bookedClassCount: 3,
          bookedClassCount30: 3,
          everOpened: { fewer_than_2_classes_by_day_15: true },
        }),
        new Date('2026-10-31T00:00:00.000Z'),
      ),
    ).toEqual(['no_booking_7_days', 'fewer_than_4_classes_in_first_30_days']);
  });
});

describe('sweepContactAlerts', () => {
  it('opens only the reasons the date rules return', async () => {
    const open = jest.fn().mockResolvedValue(1);

    await expect(
      sweepContactAlerts({
        today: new Date('2026-10-08T00:00:00.000Z'),
        findClientStates: jest.fn().mockResolvedValue([state()]),
        open,
      }),
    ).resolves.toEqual({ opened: 1 });
    expect(open).toHaveBeenCalledWith([
      { clientId: 'client-1', reason: 'no_booking_7_days' },
    ]);
  });

  it('opens nothing when no Client qualifies', async () => {
    const open = jest.fn();

    await expect(
      sweepContactAlerts({
        today: new Date('2026-10-02T00:00:00.000Z'),
        findClientStates: jest.fn().mockResolvedValue([state()]),
        open,
      }),
    ).resolves.toEqual({ opened: 0 });
    expect(open).not.toHaveBeenCalled();
  });
});
