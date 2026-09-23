import {
  isEmptySessionCheckDue,
  waitlistSessionCancelledNotice,
  zeroBookingsTrainerNotice,
} from './session-start-checks';

const at = (instant: string): Date => new Date(instant);

// Tuesday 2026-09-22, 18:00 in Bolivia, for 50 minutes.
const session = {
  startsAt: at('2026-09-22T22:00:00.000Z'),
  endsAt: at('2026-09-22T22:50:00.000Z'),
};

describe('Session start checks', () => {
  it('makes the empty-Session check due from 2 hours before start until the Session ends', () => {
    expect(
      isEmptySessionCheckDue(session, at('2026-09-22T19:59:59.999Z')),
    ).toBe(false);
    expect(
      isEmptySessionCheckDue(session, at('2026-09-22T20:00:00.000Z')),
    ).toBe(true);
    expect(
      isEmptySessionCheckDue(session, at('2026-09-22T22:10:00.000Z')),
    ).toBe(true);
    expect(
      isEmptySessionCheckDue(session, at('2026-09-22T22:50:00.000Z')),
    ).toBe(false);
  });

  it('tells the Trainer which class was cancelled for having no Bookings and opens their agenda', () => {
    expect(
      zeroBookingsTrainerNotice({
        accountId: 'trainer-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        startsAt: session.startsAt,
        occurredAt: at('2026-09-22T20:00:30.000Z'),
      }),
    ).toEqual({
      accountId: 'trainer-account',
      category: 'booking_schedule',
      type: 'session_cancelled',
      businessEventKey: 'session-cancelled:session-1',
      title: 'Clase cancelada',
      message:
        'Tu clase de Mat Pilates de hoy 18:00 se canceló: no tuvo reservas.',
      destination: { type: 'trainer_schedule', id: null },
      occurredAt: at('2026-09-22T20:00:30.000Z'),
    });
  });

  it('names the Bolivia day when the class is not today', () => {
    expect(
      zeroBookingsTrainerNotice({
        accountId: 'trainer-account',
        sessionId: 'session-1',
        classTypeName: 'Reformer',
        // Wednesday 07:00 in Bolivia, checked on Tuesday evening.
        startsAt: at('2026-09-23T11:00:00.000Z'),
        occurredAt: at('2026-09-23T03:30:00.000Z'),
      }).message,
    ).toBe(
      'Tu clase de Reformer del miércoles 23 de septiembre, 07:00 se canceló: no tuvo reservas.',
    );
  });

  it('tells a waitlisted Client the class they were waiting for was cancelled', () => {
    expect(
      waitlistSessionCancelledNotice({
        accountId: 'client-account',
        sessionId: 'session-1',
        classTypeName: 'Mat Pilates',
        occurredAt: at('2026-09-22T20:00:30.000Z'),
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
      occurredAt: at('2026-09-22T20:00:30.000Z'),
    });
  });
});
