import type { NewNotification } from '../../notifications/prisma-notification-store';
import { boliviaDate } from '../../time/bolivia-time';

// The one-time Minimum Bookings check falls due at the lead time in Studio
// Settings (3 hours, ADR-0007). A check missed while the worker was down
// stays due after the Session starts (decision §19.19), so a restarted
// worker settles it as it would have on time.
export const isMinimumBookingsCheckDue = (
  session: { startsAt: Date },
  now: Date,
  leadMinutes: number,
): boolean =>
  now.getTime() >= session.startsAt.getTime() - leadMinutes * 60_000;

// A missed check never cancels a class that has started with someone booked:
// she may be in the room, and attendance is marked during or after the class
// (decision §19.19). A started class with nobody booked is cancelled.
export const keepsStartedClass = (
  session: { startsAt: Date; bookings: unknown[] },
  now: Date,
): boolean => now >= session.startsAt && session.bookings.length > 0;

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

const timeOf = (instant: Date): string => {
  const parts = momentParts(instant);
  return `${parts.hour}:${parts.minute}`;
};

const isSameBoliviaDay = (first: Date, second: Date): boolean =>
  boliviaDate(first).getTime() === boliviaDate(second).getTime();

// "de hoy 18:00", or "del miércoles 23 de septiembre, 07:00" on another
// Bolivia day.
const sessionMoment = (startsAt: Date, now: Date): string => {
  const parts = momentParts(startsAt);
  const time = `${parts.hour}:${parts.minute}`;

  return isSameBoliviaDay(startsAt, now)
    ? `de hoy ${time}`
    : `del ${parts.weekday} ${parts.day} de ${parts.month}, ${time}`;
};

const cancelledNotice = (
  facts: { accountId: string; sessionId: string; occurredAt: Date },
  message: string,
  destination: NewNotification['destination'],
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'session_cancelled',
  businessEventKey: `session-cancelled:${facts.sessionId}`,
  title: 'Clase cancelada',
  message,
  destination,
  occurredAt: facts.occurredAt,
});

export const minimumNotMetTrainerNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  startsAt: Date;
  minimumBookings: number;
  occurredAt: Date;
}): NewNotification =>
  cancelledNotice(
    facts,
    `Tu clase de ${facts.classTypeName} ${sessionMoment(facts.startsAt, facts.occurredAt)} se canceló: no llegó al mínimo de ${facts.minimumBookings} reservas.`,
    { type: 'trainer_schedule', id: null },
  );

export type AlternativeSession = { classTypeName: string; startsAt: Date };

const listedAlternatives = 4;

// "Reformer 19:00 y Mat Pilates 20:30"; past four, "… y 2 más".
const alternativesText = (alternatives: AlternativeSession[]): string => {
  const names = alternatives
    .slice(0, listedAlternatives)
    .map(
      ({ classTypeName, startsAt }) => `${classTypeName} ${timeOf(startsAt)}`,
    );
  const more = alternatives.length - names.length;
  if (more > 0) return `${names.join(', ')} y ${more} más`;
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
};

// ADR-0007: the booked Client gets her class back and is told which other
// Sessions that day still have places, so she can pick one.
export const minimumNotMetClientNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  startsAt: Date;
  occurredAt: Date;
  alternatives: AlternativeSession[];
}): NewNotification => {
  const day = isSameBoliviaDay(facts.startsAt, facts.occurredAt)
    ? 'Hoy'
    : 'Ese día';
  const others =
    facts.alternatives.length === 0
      ? `${day} ya no quedan otras clases con lugar.`
      : `${day} hay lugar en ${alternativesText(facts.alternatives)}.`;

  return cancelledNotice(
    facts,
    `Tu clase de ${facts.classTypeName} ${sessionMoment(facts.startsAt, facts.occurredAt)} se canceló porque no llegó al mínimo de reservas. Te devolvimos la clase a tu plan. ${others}`,
    { type: 'session', id: facts.sessionId },
  );
};

export const waitlistSessionCancelledNotice = (facts: {
  accountId: string;
  sessionId: string;
  classTypeName: string;
  occurredAt: Date;
}): NewNotification =>
  cancelledNotice(
    facts,
    `La clase de ${facts.classTypeName} a la que estabas en lista de espera fue cancelada.`,
    { type: 'session', id: facts.sessionId },
  );
