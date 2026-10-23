import type { NewNotification } from './prisma-notification-store';

export type ClassReminderKind = 'day' | 'hour';

export type ClassReminderBooking = {
  bookingId: string;
  accountId: string;
  classTypeName: string;
  startsAt: Date;
  createdAt: Date;
};

export const dueClassReminder = (
  booking: ClassReminderBooking,
  now: Date,
): ClassReminderKind | null => (booking.createdAt > now ? null : null);

export const classReminderNotice = (
  facts: ClassReminderBooking & {
    kind: ClassReminderKind;
    occurredAt: Date;
  },
): NewNotification => {
  throw new Error(
    `class reminder copy is not written yet for ${facts.bookingId}`,
  );
};
