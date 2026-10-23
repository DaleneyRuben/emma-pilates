import type { NewNotification } from '../../notifications/prisma-notification-store';
import { boliviaDate } from '../../time/bolivia-time';

const emptyCheckLeadMilliseconds = 2 * 60 * 60 * 1_000;

// The one-time empty check falls due 2 hours before start. A check missed
// while the worker was down still runs until the Session ends, since an
// empty class in progress is still one the Trainer may be waiting at.
export const isEmptySessionCheckDue = (
  session: { startsAt: Date; endsAt: Date },
  now: Date,
): boolean =>
  now.getTime() >= session.startsAt.getTime() - emptyCheckLeadMilliseconds &&
  now < session.endsAt;

const momentParts = (instant: Date): Record<string, string> =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

// "de hoy 18:00", or "del miércoles 23 de septiembre, 07:00" on another
// Bolivia day.
const sessionMoment = (startsAt: Date, now: Date): string => {
  const parts = momentParts(startsAt);
  const time = `${parts.hour}:${parts.minute}`;

  return boliviaDate(startsAt).getTime() === boliviaDate(now).getTime()
    ? `de hoy ${time}`
    : `del ${parts.weekday} ${parts.day} de ${parts.month}, ${time}`;
};

export const zeroBookingsTrainerNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  startsAt: Date;
  occurredAt: Date;
}): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'session_cancelled',
  businessEventKey: `session-cancelled:${facts.sessionId}`,
  title: 'Clase cancelada',
  message: `Tu clase de ${facts.classTypeName} ${sessionMoment(facts.startsAt, facts.occurredAt)} se canceló: no tuvo reservas.`,
  destination: { type: 'trainer_schedule', id: null },
  occurredAt: facts.occurredAt,
});

export const waitlistSessionCancelledNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  occurredAt: Date;
}): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'session_cancelled',
  businessEventKey: `session-cancelled:${facts.sessionId}`,
  title: 'Clase cancelada',
  message: `La clase de ${facts.classTypeName} a la que estabas en lista de espera fue cancelada.`,
  destination: { type: 'session', id: facts.sessionId },
  occurredAt: facts.occurredAt,
});

type Alternative = { classTypeName: string; startsAt: Date };

const notImplemented = (...input: unknown[]): never => {
  throw new Error(`not implemented (${input.length})`);
};

export const isMinimumBookingsCheckDue = (
  session: { startsAt: Date },
  now: Date,
  leadMinutes: number,
): boolean => notImplemented(session, now, leadMinutes);

export const minimumNotMetTrainerNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  startsAt: Date;
  minimumBookings: number;
  occurredAt: Date;
}): NewNotification => notImplemented(facts);

export const minimumNotMetClientNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  startsAt: Date;
  occurredAt: Date;
  alternatives: Alternative[];
}): NewNotification => notImplemented(facts);
