import type { NewNotification } from './prisma-notification-store';

export type ClassReminderKind = 'day' | 'hour';

const hourMilliseconds = 60 * 60 * 1_000;
const dayLeadMilliseconds = 24 * hourMilliseconds;
const hourLeadMilliseconds = 2 * hourMilliseconds;

export type ClassReminderBooking = {
  bookingId: string;
  accountId: string;
  classTypeName: string;
  startsAt: Date;
  createdAt: Date;
};

// The day reminder covers [starts_at − 24 h, starts_at − 2 h) and only a
// Booking made before that window, so a late booking never hears "mañana".
// The hour reminder covers [starts_at − 2 h, starts_at).
export const dueClassReminder = (
  booking: ClassReminderBooking,
  now: Date,
): ClassReminderKind | null => {
  const dayDue = booking.startsAt.getTime() - dayLeadMilliseconds;
  const hourDue = booking.startsAt.getTime() - hourLeadMilliseconds;
  const instant = now.getTime();

  if (instant >= hourDue) {
    return instant < booking.startsAt.getTime() ? 'hour' : null;
  }

  return instant >= dayDue && booking.createdAt.getTime() < dayDue
    ? 'day'
    : null;
};

const clockTime = (instant: Date): string => {
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const field = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${field('hour')}:${field('minute')}`;
};

export const classReminderNotice = (
  facts: ClassReminderBooking & {
    kind: ClassReminderKind;
    occurredAt: Date;
  },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'reminder',
  type: facts.kind === 'day' ? 'class_reminder_day' : 'class_reminder_hour',
  businessEventKey: `class-reminder-${facts.kind}:${facts.bookingId}`,
  title: 'Recordatorio',
  message:
    facts.kind === 'day'
      ? `Mañana tienes ${facts.classTypeName} a las ${clockTime(facts.startsAt)}.`
      : `Tu clase de ${facts.classTypeName} empieza en 2 horas.`,
  destination: { type: 'booking', id: facts.bookingId },
  occurredAt: facts.occurredAt,
});
