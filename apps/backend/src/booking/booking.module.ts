import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { NotificationsModule } from '../notifications/notifications.module';
import { NOTIFICATION_RECORDER } from '../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../notifications/prisma-notification-store';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  BookingController,
  BookingCancellationController,
  BookingRescheduleController,
  ClassHistoryController,
} from './booking.controller';
import {
  classHistory,
  classesLeftThisWeekQuery,
  sessionAvailability,
  trainerSchedule,
  trainerSessionRoster,
} from './booking-controller-support';
import {
  TrainerAttendanceController,
  TrainerScheduleController,
  TrainerSessionRosterController,
} from './trainer.controller';
import { boliviaDate } from '../time/bolivia-time';
import { classesLeftThisWeek } from './commands/weekly-cap-remaining';
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
} from './client/client-bookings.controller';
import { loadClientProfile } from './client/client-profile';
import { loadClientSubscription } from './client/client-subscription';
import { updateClientProfile } from './client/update-client-profile';
import { bookingCommandProviders } from './commands/booking-command-providers';
import { OBJECT_STORAGE } from '../uploads/object-storage.module';
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
  receiptObjectStorage,
} from './payments/administrator.controller';
import {
  AdministratorFreezesController,
  ClientFreezesController,
} from './payments/freeze.controller';
import {
  ClientCreditController,
  ClientPaymentsController,
  ClientReferralsController,
  CreditPurchasesController,
  paymentCommands,
  PurchaseIntentsController,
} from './payments/payments.controller';
import { TransferInstructionsController } from './transfer-qr/transfer-instructions.controller';
import { createPrismaPaymentCommands } from './payments/prisma-payment-commands';
import { readFounderRenewal } from './payments/prisma-founder-membership';
import { priceFounderPlanList } from './payments/founder-plan-quote';
import { readRenewalStartsOn } from './payments/prisma-start-date-allocation';
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
import { findTrainerScheduleSessions } from './trainer-schedule-sessions';
import { loadTrainerSessionRoster } from './trainer-session-roster';
import { findTrainerSessionRoster } from './prisma-trainer-session-roster';

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
import { AdministratorStaffEmailChangeController } from './staff/staff-email-change.controller';
import {
  cancelStaffEmailChange,
  requestStaffEmailChange,
  resendStaffEmailChange,
} from './staff/staff-email-change';
import { changeStaffContact } from './staff/staff-contact';
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
import { createPrismaSchedulePauses } from './administration/prisma-schedule-pauses';
import { createPrismaScheduleBatch } from './administration/prisma-schedule-batch';
import { accountClosure } from './account-closure/account-closure-provider';
import { adminWebReads } from './admin-web-reads';
import { receiptReadProvider } from './payments/prisma-receipt-read';
import { promotionContactsWiring } from './promotion-contacts/promotion-contacts-wiring';
import { promotionsConsentWiring } from './promotions-consent/promotions-consent-wiring';
import { acquisitionWiring } from './acquisition/acquisition-wiring';
import { promotionsWiring } from './promotions/promotions-wiring';
import { studioSettingsWiring } from './studio-settings/studio-settings-wiring';
import { transferQrWiring } from './transfer-qr/transfer-qr-wiring';
import { administratorSessionRosterWiring } from './sessions/administrator-session-roster-wiring';
import { clientPhotoWiring } from './client/client-photo-wiring';
import { staffPhotoWiring } from './staff/photo/staff-photo-wiring';
import { first90DaysWiring } from './first-90-days/first-90-days-wiring';
import { invoiceDataWiring } from './payments/invoice-data/invoice-data-wiring';
import { invoiceFileWiring } from './payments/invoice-file/invoice-file-wiring';

@Module({
  imports: [SystemIdentityModule, NotificationsModule],
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
    AdministratorStaffEmailChangeController,
    ...administrationControllers,
    ...catalogListControllers,
    PurchaseIntentsController,
    CreditPurchasesController,
    ClientPaymentsController,
    ClientCreditController,
    ClientReferralsController,
    TransferInstructionsController,
    AdministratorPaymentsController,
    AdministratorFreezesController,
    ClientFreezesController,
    AdministratorSessionsController,
    AssistantClientsController,
    ...adminWebReads.controllers,
    ...accountClosure.controllers,
    ...promotionsWiring.controllers,
    ...promotionContactsWiring.controllers,
    ...promotionsConsentWiring.controllers,
    ...studioSettingsWiring.controllers,
    ...transferQrWiring.controllers,
    ...administratorSessionRosterWiring.controllers,
    ...acquisitionWiring.controllers,
    ...clientPhotoWiring.controllers,
    ...staffPhotoWiring.controllers,
    ...first90DaysWiring.controllers,
    ...invoiceDataWiring.controllers,
    ...invoiceFileWiring.controllers,
    EvaluationSlotsController,
    ClientEvaluationsController,
    NutritionistEvaluationsController,
    NutritionistAvailabilityBlocksController,
  ],
  providers: [
    ...bookingCommandProviders,
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
      provide: trainerSchedule,
      inject: [PRISMA_CLIENT],
      useFactory:
        (prisma: PrismaClient) =>
        (
          input: { on: Date; includeCancelled: boolean },
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          listTrainerSchedule(input, {
            principal,
            findSessions: findTrainerScheduleSessions(prisma),
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
            findRoster: findTrainerSessionRoster(prisma),
          }),
    },
    {
      provide: sessionAvailability,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => listSessionAvailability(prisma),
    },
    {
      provide: classesLeftThisWeekQuery,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => (clientId: string, at: Date) =>
        classesLeftThisWeek(prisma, clientId, at),
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
          changeContact: (command, principal) =>
            changeStaffContact(command, principal, dependencies),
          requestEmailChange: (command, principal) =>
            requestStaffEmailChange(command, principal, dependencies),
          resendEmailChange: (command, principal) =>
            resendStaffEmailChange(command, principal, dependencies),
          cancelEmailChange: (command, principal) =>
            cancelStaffEmailChange(command, principal, dependencies),
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
          const toSummary = async (
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
            extraClassesLine: subscription.extraClassesLine,
            classesLeftThisWeek:
              principal.identity.kind === 'client'
                ? await classesLeftThisWeek(
                    prisma,
                    principal.identity.clientId,
                    new Date(),
                  )
                : null,
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
            findFutureSubscription: (clientId, after) =>
              repository
                .findFutureSubscription(clientId, after)
                .then((found) => (found === null ? null : toSummary(found))),
            readFounderRenewal: (clientId) =>
              readFounderRenewal(prisma, clientId),
            readRenewalStartsOn: (clientId) =>
              readRenewalStartsOn(prisma, clientId, new Date()),
            readFreeze: (subscriptionId) =>
              prisma.freeze
                .findFirst({
                  where: { subscriptionId, deletedAt: null },
                  select: {
                    id: true,
                    state: true,
                    startsOn: true,
                    endsOn: true,
                  },
                })
                .then((row) =>
                  row === null
                    ? null
                    : {
                        id: row.id,
                        state: row.state.toLowerCase() as
                          'requested' | 'approved' | 'refused',
                        startsOn: row.startsOn.toISOString().slice(0, 10),
                        endsOn: row.endsOn.toISOString().slice(0, 10),
                      },
                ),
            readPlanDurationDays: (subscriptionId) =>
              prisma.subscription
                .findUnique({
                  where: { id: subscriptionId },
                  select: { durationDaysSnapshot: true },
                })
                .then((row) => row?.durationDaysSnapshot ?? null),
          });
        },
    },
    {
      provide: planCatalog,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): PlanCatalogHandler => {
        const clientIdOf = (
          principal: import('../system-identity/authentication/resolve-authenticated-principal').AuthenticatedPrincipal,
        ) =>
          principal.identity.kind === 'client'
            ? principal.identity.clientId
            : null;
        return {
          list: async (principal) =>
            priceFounderPlanList(
              prisma,
              clientIdOf(principal),
              await createCatalogRepository(prisma).listVisiblePlans(),
            ),
          find: async (planId, principal) => {
            const plan =
              await createCatalogRepository(prisma).findVisiblePlan(planId);
            if (plan === null) return null;
            const [priced] = await priceFounderPlanList(
              prisma,
              clientIdOf(principal),
              [plan],
            );
            return priced ?? null;
          },
        };
      },
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
      inject: [PRISMA_CLIENT, NOTIFICATION_RECORDER],
      useFactory: (
        prisma: PrismaClient,
        recordNotification: NotificationRecorder,
      ) =>
        createPrismaPaymentCommands(prisma, {
          now: () => new Date(),
          recordNotification,
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
      useExisting: OBJECT_STORAGE,
    },
    {
      provide: evaluationCommands,
      inject: [PRISMA_CLIENT, NOTIFICATION_RECORDER],
      useFactory: (
        prisma: PrismaClient,
        recordNotification: NotificationRecorder,
      ) =>
        createPrismaEvaluationCommands(prisma, {
          now: () => new Date(),
          recordNotification,
        }),
    },
    {
      provide: administrationOperations,
      inject: [PRISMA_CLIENT, evaluationCommands, NOTIFICATION_RECORDER],
      useFactory: (
        prisma: PrismaClient,
        evaluations: EvaluationCommands,
        recordNotification: NotificationRecorder,
      ): AdministrationOperations => {
        const now = () => new Date();
        return {
          catalog: createPrismaCatalogAdministration(prisma, { now }),
          schedules: {
            ...createPrismaScheduleAdministration(prisma, {
              now,
              recordNotification,
            }),
            ...createPrismaScheduleBatch(prisma, { now }),
            ...createPrismaSchedulePauses(prisma, { now }),
          },
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
    ...promotionContactsWiring.providers(PRISMA_CLIENT),
    ...promotionsConsentWiring.providers(PRISMA_CLIENT),
    ...studioSettingsWiring.providers(PRISMA_CLIENT),
    ...transferQrWiring.providers(PRISMA_CLIENT),
    ...administratorSessionRosterWiring.providers(PRISMA_CLIENT),
    ...acquisitionWiring.providers(PRISMA_CLIENT),
    ...clientPhotoWiring.providers(PRISMA_CLIENT),
    ...staffPhotoWiring.providers(PRISMA_CLIENT),
    ...first90DaysWiring.providers(PRISMA_CLIENT),
    ...invoiceDataWiring.providers(PRISMA_CLIENT),
    ...invoiceFileWiring.providers(PRISMA_CLIENT),
  ],
})
export class BookingModule {}
