import {
  isMinimumBookingsCheckDue,
  minimumNotMetClientNotice,
  minimumNotMetTrainerNotice,
  waitlistSessionCancelledNotice,
} from './session-start-checks';

const at = (instant: string): Date => new Date(instant);

// Tuesday 2026-09-22, 18:00 in Bolivia, for 50 minutes.
const session = {
  startsAt: at('2026-09-22T22:00:00.000Z'),
  endsAt: at('2026-09-22T22:50:00.000Z'),
};
// Checked 3 hours before, at 15:00 in Bolivia.
const checkedAt = at('2026-09-22T19:00:30.000Z');

describe('Session start checks', () => {
  it('makes the Minimum Bookings check due from the configured lead time until the Session starts', () => {
    expect(
      isMinimumBookingsCheckDue(session, at('2026-09-22T18:59:59.999Z'), 180),
    ).toBe(false);
    expect(
      isMinimumBookingsCheckDue(session, at('2026-09-22T19:00:00.000Z'), 180),
    ).toBe(true);
    expect(
      isMinimumBookingsCheckDue(session, at('2026-09-22T21:59:59.999Z'), 180),
    ).toBe(true);
    expect(
      isMinimumBookingsCheckDue(session, at('2026-09-22T22:00:00.000Z'), 180),
    ).toBe(false);
    expect(
      isMinimumBookingsCheckDue(session, at('2026-09-22T19:30:00.000Z'), 120),
    ).toBe(false);
  });

  it('tells the Trainer which class was cancelled for not reaching the minimum and opens their agenda', () => {
    expect(
      minimumNotMetTrainerNotice({
        accountId: 'trainer-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        startsAt: session.startsAt,
        minimumBookings: 2,
        occurredAt: checkedAt,
      }),
    ).toEqual({
      accountId: 'trainer-account',
      category: 'booking_schedule',
      type: 'session_cancelled',
      businessEventKey: 'session-cancelled:session-1',
      title: 'Clase cancelada',
      message:
        'Tu clase de Mat Pilates de hoy 18:00 se canceló: no llegó al mínimo de 2 reservas.',
      destination: { type: 'trainer_schedule', id: null },
      occurredAt: checkedAt,
    });
  });

  it('names the Bolivia day when the class is not today', () => {
    expect(
      minimumNotMetTrainerNotice({
        accountId: 'trainer-account',
        sessionId: 'session-1',
        classTypeName: 'Reformer',
        // Wednesday 07:00 in Bolivia, checked on Tuesday evening.
        startsAt: at('2026-09-23T11:00:00.000Z'),
        minimumBookings: 3,
        occurredAt: at('2026-09-23T03:30:00.000Z'),
      }).message,
    ).toBe(
      'Tu clase de Reformer del miércoles 23 de septiembre, 07:00 se canceló: no llegó al mínimo de 3 reservas.',
    );
  });

  it('gives the booked Client her class back and names the other Sessions with places that day', () => {
    expect(
      minimumNotMetClientNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        startsAt: session.startsAt,
        occurredAt: checkedAt,
        alternatives: [
          {
            classTypeName: 'Reformer',
            startsAt: at('2026-09-22T23:00:00.000Z'),
          },
          {
            classTypeName: 'Mat Pilates',
            startsAt: at('2026-09-23T00:30:00.000Z'),
          },
        ],
      }),
    ).toEqual({
      accountId: 'client-account',
      category: 'booking_schedule',
      type: 'session_cancelled',
      businessEventKey: 'session-cancelled:session-1',
      title: 'Clase cancelada',
      message:
        'Tu clase de Mat Pilates de hoy 18:00 se canceló porque no llegó al mínimo de reservas. Te devolvimos la clase a tu plan. Hoy hay lugar en Reformer 19:00 y Mat Pilates 20:30.',
      destination: { type: 'session', id: 'session-1' },
      occurredAt: checkedAt,
    });
  });

  it('lists at most four other Sessions and says how many more there are', () => {
    const later = (hour: number) => ({
      classTypeName: 'Reformer',
      // Bolivia is UTC−4 all year.
      startsAt: new Date(Date.UTC(2026, 8, 22, hour + 4)),
    });

    expect(
      minimumNotMetClientNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        startsAt: session.startsAt,
        occurredAt: checkedAt,
        alternatives: [16, 17, 19, 20, 21, 22].map((hour) => later(hour)),
      }).message,
    ).toMatch(
      / Hoy hay lugar en Reformer 16:00, Reformer 17:00, Reformer 19:00, Reformer 20:00 y 2 más\.$/,
    );
  });

  it('says so when no other Session that day has places, naming the day when it is not today', () => {
    expect(
      minimumNotMetClientNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        startsAt: session.startsAt,
        occurredAt: checkedAt,
        alternatives: [],
      }).message,
    ).toMatch(/ Hoy ya no quedan otras clases con lugar\.$/);
    expect(
      minimumNotMetClientNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Reformer',
        startsAt: at('2026-09-23T11:00:00.000Z'),
        occurredAt: at('2026-09-23T03:30:00.000Z'),
        alternatives: [],
      }).message,
    ).toBe(
      'Tu clase de Reformer del miércoles 23 de septiembre, 07:00 se canceló porque no llegó al mínimo de reservas. Te devolvimos la clase a tu plan. Ese día ya no quedan otras clases con lugar.',
    );
  });

  it('tells a waitlisted Client the class they were waiting for was cancelled', () => {
    expect(
      waitlistSessionCancelledNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        occurredAt: checkedAt,
      }),
    ).toEqual({
      accountId: 'client-account',
      category: 'booking_schedule',
      type: 'session_cancelled',
      businessEventKey: 'session-cancelled:session-1',
      title: 'Clase cancelada',
      message:
        'La clase de Mat Pilates a la que estabas en lista de espera fue cancelada.',
      destination: { type: 'session', id: 'session-1' },
      occurredAt: checkedAt,
    });
  });
});
