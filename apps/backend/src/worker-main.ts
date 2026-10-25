import { createHmac, randomUUID } from 'node:crypto';
import { createDatabaseClients } from './database/database-clients';
import { validateEnvironment } from './config/environment';
import { createAuthenticationEmailDelivery } from './jobs/authentication-email/create-authentication-email-delivery';
import { SpanishAuthenticationEmailRenderer } from './jobs/authentication-email/spanish-authentication-email-renderer';
import { PrismaAuthenticationEmailStateReader } from './jobs/authentication-email/prisma-authentication-email-state-reader';
import { createPrismaEmailSuppressions } from './system-identity/email-suppression/prisma-email-suppressions';
import { createWorkerLog } from './jobs/worker-log';
import { createErrorReporter } from './monitoring/error-reporting';
import { createHeartbeatPing } from './monitoring/heartbeat-ping';
import { createPrismaEvaluationCommands } from './booking/evaluations/prisma-evaluation-commands';
import { createPrismaSessionMaterializer } from './booking/sessions/prisma-session-materializer';
import { createPrismaSessionStartChecks } from './booking/sessions/prisma-session-start-checks';
import { createPrismaRetentionSweeps } from './system-identity/retention/prisma-retention-sweeps';
import { createPurchaseIntentExpiryJob } from './booking/payments/purchase-intent-expiry-job';
import { createNotificationRecorder } from './notifications/prisma-notification-store';
import { createPushDeliveryRuntime } from './notifications/push/push-delivery-runtime';
import { createClassReminderJob } from './notifications/class-reminder-job';
import { createFirst90DaysJob } from './booking/first-90-days/prisma-first-90-days';
import { createSubscriptionReminderJob } from './notifications/subscription-reminder-job';
import { createFounderMembershipJob } from './booking/payments/founder-membership-job';
import { CleanupExpiredPendingAccounts } from './system-identity/registration/cleanup-expired-pending-accounts';
import { PrismaClientRegistrationUnitOfWork } from './system-identity/registration/prisma-client-registration-unit-of-work';
import { AuthenticationLinkCipher } from './system-identity/security/authentication-link-cipher';
import { cleanupAbandonedUploads } from './uploads/cleanup-abandoned-uploads';
import { createObjectStorage } from './uploads/create-object-storage';
import { createUploadCleanupGateway } from './uploads/prisma-upload-cleanup-gateway';
import { createFinalizeUploadJobCommands } from './uploads/prisma-upload-commands';
import { coordinatorMonthFacts } from './back-office/payroll/coordinator-pay-facts';
import { createPrismaPayStatements } from './back-office/payroll/prisma-pay-statements';
import { trainerMonthFacts } from './back-office/payroll/trainer-pay-facts';
import { recomputeCurrentStudioMonth } from './studio/studio.module';
import { boliviaDate } from './time/bolivia-time';
import { startWorker } from './worker';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);

  const now = () => new Date();
  const { prisma, boss } = createDatabaseClients('worker', environment);
  const storage = createObjectStorage(environment);

  const digestEmail = (email: string) =>
    createHmac('sha256', environment.AUTHENTICATION_EMAIL_DIGEST_KEY)
      .update(email)
      .digest();

  const registrationUnitOfWork = new PrismaClientRegistrationUnitOfWork({
    prisma,
    boss,
    digestEmail,
  });
  const pendingAccountCleanupUseCase = new CleanupExpiredPendingAccounts({
    gateway: {
      cleanup: (request) => registrationUnitOfWork.cleanup(request),
    },
    now,
    newId: randomUUID,
  });

  const uploadCleanupGateway = createUploadCleanupGateway(prisma, storage);

  const linkCipher = new AuthenticationLinkCipher(
    environment.AUTHENTICATION_LINK_ENCRYPTION_KEY_ID,
    Buffer.from(environment.AUTHENTICATION_LINK_ENCRYPTION_KEY, 'base64'),
  );

  const recordNotification = createNotificationRecorder(boss);
  const evaluations = createPrismaEvaluationCommands(prisma, {
    now,
    recordNotification,
  });
  const sessionMaterializer = createPrismaSessionMaterializer(prisma, { now });
  const sessionStartChecks = createPrismaSessionStartChecks(prisma, {
    now,
    recordNotification,
  });

  const emit = createWorkerLog({
    environment: environment.NODE_ENV,
    release: environment.RELEASE_ID,
  });

  const emailDelivery = createAuthenticationEmailDelivery(environment, fetch);

  const stopWorker = await startWorker({
    boss,
    authenticationEmail:
      emailDelivery === null
        ? null
        : {
            stateReader: new PrismaAuthenticationEmailStateReader(prisma),
            decryptor: linkCipher,
            renderer: new SpanishAuthenticationEmailRenderer({
              linkBaseUrl: environment.AUTHENTICATION_LINK_BASE_URL,
            }),
            delivery: emailDelivery,
            suppressions: createPrismaEmailSuppressions(prisma, digestEmail),
          },
    finalizeUpload: createFinalizeUploadJobCommands(prisma, storage, now),
    pendingAccountCleanup: {
      execute: () => pendingAccountCleanupUseCase.execute(),
    },
    imageUploadCleanup: {
      execute: () => cleanupAbandonedUploads({ ...uploadCleanupGateway, now }),
    },
    subscriptionReminders: createSubscriptionReminderJob(
      prisma,
      now,
      recordNotification,
    ),
    founderMemberships: createFounderMembershipJob(
      prisma,
      now,
      recordNotification,
    ),
    first90Days: createFirst90DaysJob(prisma, now, recordNotification),
    purchaseIntentExpiry: createPurchaseIntentExpiryJob(
      prisma,
      now,
      recordNotification,
    ),
    sessionSchedules: {
      execute: () => sessionMaterializer.materializeSessions(),
    },
    evaluationSlots: { execute: () => evaluations.materializeAvailability() },
    evaluationReminders: {
      execute: async () => {
        await evaluations.releaseExpiredEvaluationHolds();
        return evaluations.sendDueEvaluationReminders();
      },
    },
    classReminders: createClassReminderJob(prisma, now, recordNotification),
    minimumBookingsChecks: {
      execute: () => sessionStartChecks.checkMinimumBookings(),
    },
    windowCloseSnapshots: {
      execute: () => sessionStartChecks.recordWindowCloseBookings(),
    },
    startedSessionWaitlists: {
      execute: () => sessionStartChecks.closeStartedWaitlists(),
    },
    ...createPushDeliveryRuntime({
      prisma,
      fetch,
      expoAccessToken: environment.EXPO_ACCESS_TOKEN,
      now,
    }),
    studioFacts: { execute: () => recomputeCurrentStudioMonth(prisma) },
    trainerPayDrafts: {
      execute: async () => {
        const statements = createPrismaPayStatements(prisma, {
          now,
          factsOfMonth: (from, until) => trainerMonthFacts(prisma, from, until),
          coordinatorFactsOfMonth: (from, until) =>
            coordinatorMonthFacts(prisma, from, until),
        });
        const current = boliviaDate(now());
        const previous = new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1),
        );
        const [past, present] = await Promise.all([
          statements.draftMonth(previous),
          statements.draftMonth(current),
        ]);
        return { drafted: past.drafted + present.drafted };
      },
    },
    retentionSweeps: createPrismaRetentionSweeps(prisma, { now }),
    serviceVersion: process.env.npm_package_version ?? 'local',
    emit,
    errorReporter: createErrorReporter({
      dsn: environment.ERROR_REPORTING_DSN,
      environment: environment.ERROR_REPORTING_ENVIRONMENT,
      release: environment.RELEASE_ID,
      service: 'worker',
    }),
    pingHeartbeat: createHeartbeatPing(environment.WORKER_HEARTBEAT_URL, {
      fetch,
      emit,
    }),
  });

  const shutdown = async () => {
    await stopWorker();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void bootstrap();
