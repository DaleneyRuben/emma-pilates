import type { Provider } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module';
import type { PrismaClient } from '../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  cancelBookingCommand,
  createBookingCommand,
  joinWaitlistCommand,
  ownBookingAroundQuery,
  recordAttendanceCommand,
  rescheduleBookingCommand,
} from '../booking-controller-support';
import { leaveWaitlistCommand } from '../client/client-bookings.controller';
import { cancelSessionCommand } from '../payments/administrator.controller';
import { withBookedSubscription } from './booked-subscription';
import { findOwnBookingAround } from './overlapping-booking';
import { PrismaBookingCommands } from './prisma-booking-commands';

// Kept out of booking.module.ts, which already exceeds the file-size limit.
const bookingCommand = (
  token: symbol,
  select: (commands: PrismaBookingCommands, prisma: PrismaClient) => unknown,
): Provider => ({
  provide: token,
  inject: [PRISMA_CLIENT, NOTIFICATION_RECORDER],
  useFactory: (prisma: PrismaClient, record: NotificationRecorder) =>
    select(new PrismaBookingCommands(prisma, () => new Date(), record), prisma),
});

export const bookingCommandProviders: Provider[] = [
  bookingCommand(createBookingCommand, (c, prisma) =>
    withBookedSubscription(prisma, c.createIdempotent.bind(c)),
  ),
  bookingCommand(joinWaitlistCommand, (c) => c.joinWaitlistIdempotent.bind(c)),
  bookingCommand(cancelBookingCommand, (c) => c.cancel.bind(c)),
  bookingCommand(rescheduleBookingCommand, (c, prisma) =>
    withBookedSubscription(prisma, c.reschedule.bind(c)),
  ),
  bookingCommand(recordAttendanceCommand, (c) => c.recordAttendance.bind(c)),
  bookingCommand(leaveWaitlistCommand, (c) => c.leaveWaitlist.bind(c)),
  bookingCommand(cancelSessionCommand, (c) => c.cancelSession.bind(c)),
  // Walkthrough n.º 1: the class detail reads the overlap rule ahead.
  {
    provide: ownBookingAroundQuery,
    inject: [PRISMA_CLIENT],
    useFactory:
      (prisma: PrismaClient) =>
      (input: Parameters<typeof findOwnBookingAround>[1]) =>
        findOwnBookingAround(prisma, input),
  },
];
