import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PRISMA_CLIENT } from '../database/database.module';
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
import { boliviaDate } from '../time/bolivia-time';
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
  clientProfileUpdate,
  clientSubscription,
  planCatalog,
  sessionDetail,
  type PlanCatalogHandler,
} from './client/client-discovery.controller';
import { listClientBookings } from './client/client-bookings';
import {
  ClientBookingsController,
  WaitlistEntriesController,
  clientBookings,
  leaveWaitlistCommand,
} from './client/client-bookings.controller';
import { loadClientProfile } from './client/client-profile';
import { loadClientSubscription } from './client/client-subscription';
import { updateClientProfile } from './client/update-client-profile';
import { PrismaBookingCommands } from './commands/prisma-booking-commands';
import { LocalObjectStorage } from '../uploads/local-object-storage';
import { createAssistantClientOperations } from './assistant/assistant-operations';
import {
  AssistantClientsController,
  assistantClientOperations,
} from './assistant/assistant.controller';
import {
  AdministratorPaymentsController,
  AdministratorSessionsController,
  administratorSessionSearch,
  type AdministratorSessionSearch,
  cancelSessionCommand,
  receiptObjectStorage,
} from './payments/administrator.controller';
import {
  ClientCreditController,
  ClientPaymentsController,
  ClientReferralsController,
  CreditPurchasesController,
  paymentCommands,
  PurchaseIntentsController,
  transferInstructions,
  TransferInstructionsController,
  type TransferInstructions,
} from './payments/payments.controller';
import { createPrismaPaymentCommands } from './payments/prisma-payment-commands';
import {
  ClientEvaluationsController,
  evaluationCommands,
  EvaluationSlotsController,
} from './evaluations/evaluations.controller';
import {
  NutritionistAvailabilityBlocksController,
  NutritionistEvaluationsController,
} from './evaluations/nutritionist.controller';
import {
  createPrismaEvaluationCommands,
  type EvaluationCommands,
} from './evaluations/prisma-evaluation-commands';
import { loadStaffProfile } from './staff/staff-profile';
import {
  StaffProfileController,
  staffProfile,
} from './staff/staff-profile.controller';
import { listClassHistory } from './class-history';
import {
  listSessionAvailability,
  listSessionsAcrossBranches,
} from './session-availability';
import { listAdministratorSessions } from './sessions/administrator-sessions';
import { listTrainerSchedule } from './trainer-schedule';
import { loadTrainerSessionRoster } from './trainer-session-roster';

import {
  changeStaffBranches,
  changeStaffRole,
  createStaffMember,
  deactivateStaffMember,
  listStaffMembers,
  readStaffMember,
  resendStaffActivation,
} from './staff/staff-management';
import {
  cancelStaffInvitation,
  correctStaffInvitationEmail,
} from './staff/staff-invitations';
import {
  AdministratorStaffMembersController,
  staffManagementOperations,
  type StaffManagementOperations,
} from './staff/staff-management.controller';
import {
  createPrismaStaffDirectory,
  PrismaStaffManagementUnitOfWork,
} from './staff/prisma-staff-management';
import {
  staffAccountRuntime,
  type StaffAccountRuntime,
} from '../system-identity/staff-accounts/staff-accounts';

import {
  administrationControllers,
  administrationOperations,
  type AdministrationOperations,
} from './administration/administration.controller';
import {
  catalogListControllers,
  catalogListOperations,
} from './administration/catalog-lists.controller';
import { createPrismaCatalogAdministration } from './administration/prisma-catalog-administration';
import { createPrismaCatalogLists } from './administration/prisma-catalog-lists';
import { createPrismaOversight } from './administration/prisma-oversight';
import { createPrismaScheduleAdministration } from './administration/prisma-schedule-administration';
import { accountClosure } from './account-closure/account-closure-provider';
import { adminWebReads } from './admin-web-reads';
import { receiptReadProvider } from './payments/prisma-receipt-read';
import { promotionsWiring } from './promotions/promotions-wiring';
import { clientPhotoWiring } from './client/client-photo-wiring';

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
    ClientBookingsController,
    WaitlistEntriesController,
    StaffProfileController,
    AdministratorStaffMembersController,
    ...administrationControllers,
    ...catalogListControllers,
    PurchaseIntentsController,
    CreditPurchasesController,
    ClientPaymentsController,
    ClientCreditController,
    ClientReferralsController,
    TransferInstructionsController,
    AdministratorPaymentsController,
    AdministratorSessionsController,
    AssistantClientsController,
    ...adminWebReads.controllers,
    ...accountClosure.controllers,
    ...promotionsWiring.controllers,
    ...clientPhotoWiring.controllers,
    EvaluationSlotsController,
    ClientEvaluationsController,
    NutritionistEvaluationsController,
    NutritionistAvailabilityBlocksController,
  ],
  providers: [
    {
      provide: createBookingCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.createIdempotent.bind(commands);
      },
    },
    {
      provide: joinWaitlistCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.joinWaitlistIdempotent.bind(commands);
      },
    },
    {
      provide: cancelBookingCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.cancel.bind(commands);
      },
    },
    {
      provide: rescheduleBookingCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.reschedule.bind(commands);
      },
    },
    {
      provide: classHistory,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          listClassHistory(principal, {
            findAttendedBookings: (clientId) =>
              createCatalogRepository(prisma).findAttendedBookings(clientId),
          }),
    },
    {
      provide: recordAttendanceCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.recordAttendance.bind(commands);
      },
    },
    {
      provide: trainerSchedule,
      inject: [PRISMA_CLIENT],
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
      inject: [PRISMA_CLIENT],
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
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => listSessionAvailability(prisma),
    },
    {
      provide: clientProfile,
      inject: [PRISMA_CLIENT],
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
      provide: administratorSessionSearch,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient): AdministratorSessionSearch =>
        (query, principal) =>
          listAdministratorSessions(
            query,
            principal,
            listSessionsAcrossBranches(prisma),
          ),
    },
    {
      provide: staffManagementOperations,
      inject: [PRISMA_CLIENT, staffAccountRuntime],
      useFactory: (
        prisma: PrismaClient,
        runtime: StaffAccountRuntime,
      ): StaffManagementOperations => {
        const now = () => new Date();
        const dependencies = {
          unitOfWork: new PrismaStaffManagementUnitOfWork({
            prisma,
            ...runtime,
            now,
          }),
          now,
          newId: randomUUID,
        };
        const directory = createPrismaStaffDirectory(prisma);
        return {
          list: (query, principal) =>
            listStaffMembers(query, principal, directory),
          read: (command, principal) =>
            readStaffMember(command, principal, directory),
          create: (command, principal) =>
            createStaffMember(command, principal, dependencies),
          resendActivation: (command, principal) =>
            resendStaffActivation(command, principal, dependencies),
          changeRole: (command, principal) =>
            changeStaffRole(command, principal, dependencies),
          changeBranches: (command, principal) =>
            changeStaffBranches(command, principal, dependencies),
          deactivate: (command, principal) =>
            deactivateStaffMember(command, principal, dependencies),
          correctEmail: (command, principal) =>
            correctStaffInvitationEmail(command, principal, dependencies),
          cancelInvitation: (command, principal) =>
            cancelStaffInvitation(command, principal, dependencies),
        };
      },
    },
    {
      provide: staffProfile,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          loadStaffProfile({
            principal,
            findProfile: (staffMemberId) =>
              createCatalogRepository(prisma).findStaffProfile(staffMemberId),
          }),
    },
    {
      provide: clientBookings,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient) =>
        (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          listClientBookings({
            principal,
            findUpcoming: (input) =>
              createCatalogRepository(prisma).findUpcomingClientBookings(input),
            now: () => new Date(),
          }),
    },
    {
      provide: leaveWaitlistCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.leaveWaitlist.bind(commands);
      },
    },
    {
      provide: clientProfileUpdate,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient) =>
        (
          command: { name: string; phone: string | null },
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          updateClientProfile(command, {
            principal,
            saveProfile: (clientId, changes) =>
              createCatalogRepository(prisma).saveClientProfile(
                clientId,
                changes,
              ),
          }),
    },
    {
      provide: clientSubscription,
      inject: [PRISMA_CLIENT],
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
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): PlanCatalogHandler => ({
        list: () => createCatalogRepository(prisma).listVisiblePlans(),
        find: (planId) =>
          createCatalogRepository(prisma).findVisiblePlan(planId),
      }),
    },
    {
      provide: branchCatalog,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => () =>
        createCatalogRepository(prisma).listBranches(),
    },
    {
      provide: classTypeCatalog,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => () =>
        createCatalogRepository(prisma).listClassTypes(),
    },
    {
      provide: sessionDetail,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => (sessionId: string) =>
        createCatalogRepository(prisma).findSessionDetail(sessionId),
    },
    {
      provide: paymentCommands,
      inject: [PRISMA_CLIENT, ConfigService],
      useFactory: (
        prisma: PrismaClient,
        config: ConfigService<Environment, true>,
      ) =>
        createPrismaPaymentCommands(prisma, {
          now: () => new Date(),
          referralRewardCentavos: config.getOrThrow('REFERRAL_REWARD_CENTAVOS'),
        }),
    },
    {
      provide: assistantClientOperations,
      inject: [PRISMA_CLIENT, paymentCommands],
      useFactory: (
        prisma: PrismaClient,
        payments: import('./payments/prisma-payment-commands').PaymentCommands,
      ) =>
        createAssistantClientOperations({
          prisma,
          payments,
          now: () => new Date(),
        }),
    },
    {
      provide: receiptObjectStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new LocalObjectStorage(config.getOrThrow('UPLOADS_LOCAL_STORAGE_ROOT')),
    },
    {
      provide: cancelSessionCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => {
        const commands = new PrismaBookingCommands(prisma, () => new Date());
        return commands.cancelSession.bind(commands);
      },
    },
    {
      provide: transferInstructions,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<Environment, true>,
      ): TransferInstructions => ({
        beneficiaryName: config.getOrThrow('TRANSFER_BENEFICIARY_NAME'),
        bankName: config.getOrThrow('TRANSFER_BANK_NAME'),
        accountNumber: config.getOrThrow('TRANSFER_ACCOUNT_NUMBER'),
        qrImagePath: config.getOrThrow('TRANSFER_QR_IMAGE_PATH'),
      }),
    },
    {
      provide: evaluationCommands,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) =>
        createPrismaEvaluationCommands(prisma, { now: () => new Date() }),
    },
    {
      provide: administrationOperations,
      inject: [PRISMA_CLIENT, evaluationCommands],
      useFactory: (
        prisma: PrismaClient,
        evaluations: EvaluationCommands,
      ): AdministrationOperations => {
        const now = () => new Date();
        return {
          catalog: createPrismaCatalogAdministration(prisma, { now }),
          schedules: createPrismaScheduleAdministration(prisma, { now }),
          oversight: createPrismaOversight(prisma, { now }),
          cancelEvaluation: (evaluationId, principal) =>
            evaluations.cancelEvaluationAsStaff(evaluationId, principal),
        };
      },
    },
    {
      provide: catalogListOperations,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => createPrismaCatalogLists(prisma),
    },
    ...adminWebReads.providers(PRISMA_CLIENT),
    ...accountClosure.providers(PRISMA_CLIENT),
    receiptReadProvider(PRISMA_CLIENT),
    ...promotionsWiring.providers(PRISMA_CLIENT),
    ...clientPhotoWiring.providers(PRISMA_CLIENT),
  ],
})
export class BookingModule {}
