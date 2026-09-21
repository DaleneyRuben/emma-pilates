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
  TrainerAttendanceController,
  TrainerScheduleController,
  TrainerSessionRosterController,
  recordAttendanceCommand,
  classHistory,
  createBookingCommand,
  joinWaitlistCommand,
  sessionAvailability,
  rescheduleBookingCommand,
  trainerSchedule,
  trainerSessionRoster,
} from './booking.controller';
import { boliviaDate } from './bolivia-time';
import { createCatalogRepository } from './catalog/prisma-catalog-repository';
import {
  BranchCatalogController,
  ClassTypeCatalogController,
  ClientProfileController,
  PlanCatalogController,
  SessionDetailController,
  branchCatalog,
  classTypeCatalog,
  clientProfile,
  clientSubscription,
  planCatalog,
  sessionDetail,
  type PlanCatalogHandler,
} from './client/client-discovery.controller';
import { loadClientProfile } from './client/client-profile';
import { loadClientSubscription } from './client/client-subscription';
import { PrismaBookingCommands } from './commands/prisma-booking-commands';
import { listClassHistory } from './class-history';
import { listSessionAvailability } from './session-availability';
import { listTrainerSchedule } from './trainer-schedule';
import { loadTrainerSessionRoster } from './trainer-session-roster';

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
    TrainerAttendanceController,
    TrainerScheduleController,
    TrainerSessionRosterController,
    ClientProfileController,
    PlanCatalogController,
    BranchCatalogController,
    ClassTypeCatalogController,
    SessionDetailController,
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
      provide: recordAttendanceCommand,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.recordAttendance.bind(commands);
      },
    },
    {
      provide: trainerSchedule,
      inject: [bookingPrisma],
      useFactory:
        (prisma: PrismaClient) =>
        (
          input: { on: Date },
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          listTrainerSchedule(input, {
            principal,
            findSessions: ({ trainerStaffMemberId, on }) => {
              const start = new Date(on.getTime() + 4 * 60 * 60 * 1_000);
              const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000);
              return prisma.session
                .findMany({
                  where: {
                    trainerStaffMemberId,
                    state: 'SCHEDULED',
                    startsAt: { gte: start, lt: end },
                  },
                  select: {
                    id: true,
                    startsAt: true,
                    endsAt: true,
                    capacity: true,
                    classType: { select: { name: true } },
                    branch: { select: { name: true } },
                    _count: {
                      select: { bookings: { where: { state: 'BOOKED' } } },
                    },
                  },
                  orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
                })
                .then((sessions) =>
                  sessions.map((session) => ({
                    sessionId: session.id,
                    classTypeName: session.classType.name,
                    branchName: session.branch.name,
                    startsAt: session.startsAt,
                    endsAt: session.endsAt,
                    capacity: session.capacity,
                    bookedCount: session._count.bookings,
                  })),
                );
            },
          }),
    },
    {
      provide: trainerSessionRoster,
      inject: [bookingPrisma],
      useFactory:
        (prisma: PrismaClient) =>
        (
          input: { sessionId: string },
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          loadTrainerSessionRoster(input, {
            principal,
            findRoster: (sessionId) =>
              prisma.session
                .findUnique({
                  where: { id: sessionId },
                  select: {
                    id: true,
                    trainerStaffMemberId: true,
                    startsAt: true,
                    endsAt: true,
                    classType: { select: { name: true } },
                    branch: { select: { name: true } },
                    bookings: {
                      where: { state: 'BOOKED' },
                      select: {
                        id: true,
                        client: { select: { name: true } },
                        attendanceRecord: { select: { outcome: true } },
                      },
                      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                    },
                  },
                })
                .then((session) =>
                  session === null
                    ? null
                    : {
                        sessionId: session.id,
                        trainerStaffMemberId: session.trainerStaffMemberId,
                        classTypeName: session.classType.name,
                        branchName: session.branch.name,
                        startsAt: session.startsAt,
                        endsAt: session.endsAt,
                        bookings: session.bookings.map((booking) => ({
                          bookingId: booking.id,
                          clientName: booking.client.name,
                          attendanceOutcome:
                            booking.attendanceRecord?.outcome === 'ATTENDED'
                              ? 'attended'
                              : booking.attendanceRecord?.outcome === 'NO_SHOW'
                                ? 'no_show'
                                : null,
                        })),
                      },
                ),
          }),
    },
    {
      provide: sessionAvailability,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => listSessionAvailability(prisma),
    },
    {
      provide: clientProfile,
      inject: [bookingPrisma],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          loadClientProfile({
            principal,
            findProfile: (clientId) =>
              createCatalogRepository(prisma).findClientProfile(clientId),
          }),
    },
    {
      provide: clientSubscription,
      inject: [bookingPrisma],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) => {
          const repository = createCatalogRepository(prisma);
          const toSummary = (
            subscription: NonNullable<
              Awaited<ReturnType<typeof repository.findLatestSubscription>>
            >,
          ) => ({
            id: subscription.id,
            planName: subscription.planNameSnapshot,
            originalClassAllowance: subscription.originalClassAllowance,
            remainingClassAllowance: subscription.remainingClassAllowance,
            startsOn: subscription.startsOn,
            endsOn: subscription.endsOn,
          });

          return loadClientSubscription({
            principal,
            today: boliviaDate(new Date()),
            findActiveSubscription: (clientId, onDate) =>
              repository
                .findActiveSubscription(clientId, onDate)
                .then((found) => (found === null ? null : toSummary(found))),
            findLatestSubscription: (clientId) =>
              repository
                .findLatestSubscription(clientId)
                .then((found) => (found === null ? null : toSummary(found))),
          });
        },
    },
    {
      provide: planCatalog,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient): PlanCatalogHandler => ({
        list: () => createCatalogRepository(prisma).listVisiblePlans(),
        find: (planId) =>
          createCatalogRepository(prisma).findVisiblePlan(planId),
      }),
    },
    {
      provide: branchCatalog,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => () =>
        createCatalogRepository(prisma).listBranches(),
    },
    {
      provide: classTypeCatalog,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => () =>
        createCatalogRepository(prisma).listClassTypes(),
    },
    {
      provide: sessionDetail,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => (sessionId: string) =>
        createCatalogRepository(prisma).findSessionDetail(sessionId),
    },
    {
      provide: BookingRuntimeCleanup,
      inject: [bookingPrisma],
      useFactory: (prisma: PrismaClient) => new BookingRuntimeCleanup(prisma),
    },
  ],
})
export class BookingModule {}
