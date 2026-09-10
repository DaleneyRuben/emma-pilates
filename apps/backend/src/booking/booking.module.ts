import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  BookingController,
  BookingCancellationController,
  cancelBookingCommand,
  BookingRescheduleController,
  ClassHistoryController,
  classHistory,
  createBookingCommand,
  joinWaitlistCommand,
  sessionAvailability,
  rescheduleBookingCommand,
} from './booking.controller';
import { PrismaBookingCommands } from './commands/prisma-booking-commands';
import { listClassHistory } from './class-history';
import { listSessionAvailability } from './session-availability';

const bookingPrisma = Symbol('bookingPrisma');

class BookingRuntimeCleanup implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaClient) {}

  onApplicationShutdown(): Promise<void> {
    return this.prisma.$disconnect();
  }
}

@Module({
  imports: [SystemIdentityModule],
  controllers: [
    BookingController,
    BookingCancellationController,
    BookingRescheduleController,
    ClassHistoryController,
  ],
  providers: [
    {
      provide: bookingPrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: new PrismaPg({
            connectionString: config.getOrThrow('DATABASE_URL'),
          }),
        }),
    },
    {
      provide: createBookingCommand,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.createIdempotent.bind(commands);
      },
    },
    {
      provide: joinWaitlistCommand,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.joinWaitlistIdempotent.bind(commands);
      },
    },
    {
      provide: cancelBookingCommand,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.cancel.bind(commands);
      },
    },
    {
      provide: rescheduleBookingCommand,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.reschedule.bind(commands);
      },
    },
    {
      provide: classHistory,
      inject: [bookingPrisma],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          listClassHistory(principal, {
            findAttendedBookings: (clientId) =>
              prisma.booking
                .findMany({
                  where: {
                    clientId,
                    state: 'BOOKED',
                    attendanceRecord: { outcome: 'ATTENDED' },
                  },
                  select: { id: true, sessionId: true },
                  orderBy: { session: { endsAt: 'desc' } },
                })
                .then((bookings) =>
                  bookings.map((booking) => ({
                    bookingId: booking.id,
                    sessionId: booking.sessionId,
                  })),
                ),
          }),
    },
    {
      provide: sessionAvailability,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => listSessionAvailability(prisma),
    },
    {
      provide: BookingRuntimeCleanup,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => new BookingRuntimeCleanup(prisma),
    },
  ],
})
export class BookingModule {}
