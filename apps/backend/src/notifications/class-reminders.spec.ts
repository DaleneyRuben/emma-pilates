import { classReminderNotice, dueClassReminder } from './class-reminders';

const at = (instant: string): Date => new Date(instant);

// Tuesday 2026-09-22, 18:00 in Bolivia.
const startsAt = at('2026-09-22T22:00:00.000Z');
const booking = {
  bookingId: 'booking-1',
  accountId: 'account-1',
  classTypeName: 'Mat Pilates',
  startsAt,
  createdAt: at('2026-09-20T15:00:00.000Z'),
};

describe('due class reminders', () => {
  it('sends the day reminder from 24 hours before until the 2 hour reminder takes over', () => {
    expect(
      dueClassReminder(booking, at('2026-09-21T21:59:59.999Z')),
    ).toBeNull();
    expect(dueClassReminder(booking, at('2026-09-21T22:00:00.000Z'))).toBe(
      'day',
    );
    expect(dueClassReminder(booking, at('2026-09-22T19:59:59.999Z'))).toBe(
      'day',
    );
  });

  it('sends the hour reminder from 2 hours before until the Session starts', () => {
    expect(dueClassReminder(booking, at('2026-09-22T20:00:00.000Z'))).toBe(
      'hour',
    );
    expect(dueClassReminder(booking, at('2026-09-22T21:59:59.999Z'))).toBe(
      'hour',
    );
    expect(dueClassReminder(booking, startsAt)).toBeNull();
  });

  it('skips the day reminder when the Booking was made inside its window', () => {
    expect(
      dueClassReminder(
        { ...booking, createdAt: at('2026-09-22T10:00:00.000Z') },
        at('2026-09-22T12:00:00.000Z'),
      ),
    ).toBeNull();
    expect(
      dueClassReminder(
        { ...booking, createdAt: at('2026-09-22T10:00:00.000Z') },
        at('2026-09-22T20:00:00.000Z'),
      ),
    ).toBe('hour');
  });
});

describe('class reminder copy', () => {
  it('names the class and the Bolivia time for tomorrow', () => {
    expect(
      classReminderNotice({
        ...booking,
        kind: 'day',
        occurredAt: at('2026-09-21T22:00:00.000Z'),
      }),
    ).toEqual({
      accountId: 'account-1',
      category: 'reminder',
      type: 'class_reminder_day',
      businessEventKey: 'class-reminder-day:booking-1',
      title: 'Recordatorio',
      message: 'Mañana tienes Mat Pilates a las 18:00.',
      destination: { type: 'booking', id: 'booking-1' },
      occurredAt: at('2026-09-21T22:00:00.000Z'),
    });
  });

  it('says the class starts in 2 hours when it is still tomorrow', () => {
    expect(
      classReminderNotice({
        ...booking,
        kind: 'hour',
        // 16:00 Bolivia, class at 18:00 the same day.
        occurredAt: at('2026-09-22T20:00:00.000Z'),
      }),
    ).toMatchObject({
      type: 'class_reminder_hour',
      businessEventKey: 'class-reminder-hour:booking-1',
      message: 'Hoy tienes Mat Pilates a las 18:00.',
    });
  });

  it('says tomorrow when the 2 hour reminder falls the Bolivia day before the class', () => {
    expect(
      classReminderNotice({
        ...booking,
        startsAt: at('2026-09-22T12:00:00.000Z'),
        kind: 'hour',
        // 06:00 Bolivia on the 22nd, class at 08:00 the same morning.
        occurredAt: at('2026-09-22T10:00:00.000Z'),
      }).message,
    ).toBe('Hoy tienes Mat Pilates a las 08:00.');
    expect(
      classReminderNotice({
        ...booking,
        startsAt: at('2026-09-22T12:00:00.000Z'),
        kind: 'hour',
        // 22:00 Bolivia on the 21st, class at 08:00 the next morning.
        occurredAt: at('2026-09-22T02:00:00.000Z'),
      }).message,
    ).toBe('Mañana tienes Mat Pilates a las 08:00.');
  });
});
