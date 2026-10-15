import type { Provider } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module';
import type { PrismaClient } from '../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  cancelBookingCommand,
  createBookingCommand,
  joinWaitlistCommand,
  recordAttendanceCommand,
  rescheduleBookingCommand,
} from '../booking.controller';
import { leaveWaitlistCommand } from '../client/client-bookings.controller';
import { cancelSessionCommand } from '../payments/administrator.controller';
import { PrismaBookingCommands } from './prisma-booking-commands';

// Kept out of booking.module.ts, which already exceeds the file-size limit.
const bookingCommand = (
  token: symbol,
  select: (commands: PrismaBookingCommands) => unknown,
): Provider => ({
  provide: token,
  inject: [PRISMA_CLIENT, NOTIFICATION_RECORDER],
  useFactory: (prisma: PrismaClient, record: NotificationRecorder) =>
    select(new PrismaBookingCommands(prisma, () => new Date(), record)),
});

export const bookingCommandProviders: Provider[] = [
  bookingCommand(createBookingCommand, (c) => c.createIdempotent.bind(c)),
  bookingCommand(joinWaitlistCommand, (c) => c.joinWaitlistIdempotent.bind(c)),
  bookingCommand(cancelBookingCommand, (c) => c.cancel.bind(c)),
  bookingCommand(rescheduleBookingCommand, (c) => c.reschedule.bind(c)),
  bookingCommand(recordAttendanceCommand, (c) => c.recordAttendance.bind(c)),
  bookingCommand(leaveWaitlistCommand, (c) => c.leaveWaitlist.bind(c)),
  bookingCommand(cancelSessionCommand, (c) => c.cancelSession.bind(c)),
];
