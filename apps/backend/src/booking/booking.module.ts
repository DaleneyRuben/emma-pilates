import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  BookingController,
  createBookingCommand,
  joinWaitlistCommand,
  sessionAvailability,
} from './booking.controller';
import { PrismaBookingCommands } from './commands/prisma-booking-commands';
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
  controllers: [BookingController],
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
