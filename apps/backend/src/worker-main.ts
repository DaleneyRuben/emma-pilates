import { createHmac, randomUUID } from 'node:crypto';
import { createPrismaAdapter } from './database/prisma-adapter';
import { validateEnvironment } from './config/environment';
import { PrismaClient } from './generated/prisma/client';
import { LocalEmailCapture } from './jobs/authentication-email/local-email-capture';
import { SpanishAuthenticationEmailRenderer } from './jobs/authentication-email/spanish-authentication-email-renderer';
import { PrismaAuthenticationEmailStateReader } from './jobs/authentication-email/prisma-authentication-email-state-reader';
import { createPgBoss } from './jobs/pg-boss-runtime';
import { createWorkerLog } from './jobs/worker-log';
import { createHeartbeatPing } from './monitoring/heartbeat-ping';
import { createPrismaEvaluationCommands } from './booking/evaluations/prisma-evaluation-commands';
import { createPrismaSessionMaterializer } from './booking/sessions/prisma-session-materializer';
import { createPrismaSessionStartChecks } from './booking/sessions/prisma-session-start-checks';
import { createPrismaRetentionSweeps } from './system-identity/retention/prisma-retention-sweeps';
import { createPurchaseIntentExpiryJob } from './booking/payments/purchase-intent-expiry-job';
import { createSubscriptionReminderJob } from './notifications/subscription-reminder-job';
import { CleanupExpiredPendingAccounts } from './system-identity/registration/cleanup-expired-pending-accounts';
import { PrismaClientRegistrationUnitOfWork } from './system-identity/registration/prisma-client-registration-unit-of-work';
import { AuthenticationLinkCipher } from './system-identity/security/authentication-link-cipher';
import { cleanupAbandonedUploads } from './uploads/cleanup-abandoned-uploads';
import { LocalObjectStorage } from './uploads/local-object-storage';
import { createUploadCleanupGateway } from './uploads/prisma-upload-cleanup-gateway';
import { createFinalizeUploadJobCommands } from './uploads/prisma-upload-commands';
import { startWorker } from './worker';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);

  if (environment.NODE_ENV === 'production') {
    throw new Error(
      'worker-main is a local-development entrypoint only: it depends on LocalEmailCapture and LocalObjectStorage, neither of which is production-ready. See ADR-0046.',
    );
  }

  const now = () => new Date();
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(
      environment.DATABASE_URL,
      environment.DATABASE_POOL_MAX,
    ),
  });
  const boss = createPgBoss(environment.DATABASE_URL, {
    poolMax: environment.DATABASE_POOL_MAX,
  });
  const storage = new LocalObjectStorage(
    environment.UPLOADS_LOCAL_STORAGE_ROOT,
  );

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

  const evaluations = createPrismaEvaluationCommands(prisma, { now });
  const sessionMaterializer = createPrismaSessionMaterializer(prisma, { now });
  const sessionStartChecks = createPrismaSessionStartChecks(prisma, { now });

  const emit = createWorkerLog({
    environment: environment.NODE_ENV,
    release: environment.RELEASE_ID,
  });

  const stopWorker = await startWorker({
    boss,
    authenticationEmail: {
      stateReader: new PrismaAuthenticationEmailStateReader(prisma),
      decryptor: linkCipher,
      renderer: new SpanishAuthenticationEmailRenderer({
        linkBaseUrl: environment.AUTHENTICATION_LINK_BASE_URL,
      }),
      delivery: new LocalEmailCapture(
        environment.NODE_ENV,
        environment.EMAIL_CAPTURE_DIRECTORY,
      ),
    },
    finalizeUpload: createFinalizeUploadJobCommands(prisma, storage, now),
    pendingAccountCleanup: {
      execute: () => pendingAccountCleanupUseCase.execute(),
    },
    imageUploadCleanup: {
      execute: () => cleanupAbandonedUploads({ ...uploadCleanupGateway, now }),
    },
    subscriptionReminders: createSubscriptionReminderJob(prisma, now),
    purchaseIntentExpiry: createPurchaseIntentExpiryJob(
      prisma,
      now,
      environment.REFERRAL_REWARD_CENTAVOS,
    ),
    sessionSchedules: {
      execute: () => sessionMaterializer.materializeSessions(),
    },
    evaluationSlots: { execute: () => evaluations.materializeAvailability() },
    evaluationReminders: {
      execute: () => evaluations.sendDueEvaluationReminders(),
    },
    emptySessionChecks: {
      execute: () => sessionStartChecks.checkEmptySessions(),
    },
    startedSessionWaitlists: {
      execute: () => sessionStartChecks.closeStartedWaitlists(),
    },
    retentionSweeps: createPrismaRetentionSweeps(prisma, { now }),
    serviceVersion: process.env.npm_package_version ?? 'local',
    emit,
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
