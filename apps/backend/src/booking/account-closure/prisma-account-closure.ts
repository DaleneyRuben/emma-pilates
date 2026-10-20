import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  StaffRole,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import {
  createAccountClosureOperations,
  createAccountPasswordVerifier,
} from '../../system-identity/account-closure/account-closure';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  closeClientAccount,
  type CloseClientAccountCommand,
  type ClosureDependencies,
  type ClosureSummary,
} from './close-client-account';
import { createMembershipSteps } from './closure-membership-steps';
import { createPersonalDataSteps } from './closure-personal-data-steps';
import { createScheduleSteps } from './closure-schedule-steps';

export type AccountClosure = {
  close: (
    command: CloseClientAccountCommand,
    principal: AuthenticatedPrincipal,
  ) => Promise<ClosureSummary>;
};

// One Serializable transaction, retried a bounded number of times (ADR-0056):
// the Payment check, the Credit balance, and the freed seats are read and
// written together, so a concurrent purchase or booking must not slip between.
export const createPrismaAccountClosure = (
  prisma: PrismaClient,
  options: {
    now: () => Date;
    newId?: () => string;
    recordNotification?: NotificationRecorder;
  },
): AccountClosure => {
  const recordNotification =
    options.recordNotification ?? defaultNotificationRecorder;

  const unitOfWork: ClosureDependencies['unitOfWork'] = {
    execute: (work) =>
      retrySerializable(() =>
        prisma.$transaction(
          (transaction) =>
            work({
              lockClient: async (clientId) => {
                await transaction.$queryRaw`
                  SELECT id FROM booking.clients
                  WHERE id = ${clientId}::uuid AND deleted_at IS NULL
                  FOR UPDATE`;
                const client = await transaction.client.findFirst({
                  where: { id: clientId, deletedAt: null },
                  select: {
                    id: true,
                    account: { select: { id: true, deletedAt: true } },
                  },
                });
                return client?.account && client.account.deletedAt === null
                  ? { clientId: client.id, accountId: client.account.id }
                  : null;
              },
              ...createMembershipSteps(transaction),
              ...createScheduleSteps(transaction, recordNotification),
              ...createAccountClosureOperations(transaction),
              ...createPersonalDataSteps(transaction),
              recordAudit: async (audit) => {
                await transaction.auditRecord.create({
                  data: {
                    actionCode: 'account.closed',
                    outcome: AuditOutcome.SUCCEEDED,
                    actorKind: AuditActorKind.ACCOUNT,
                    actorAccountId: audit.actorAccountId,
                    actorRole:
                      audit.actorRole === null ? null : StaffRole.ADMINISTRATOR,
                    targetType: 'account',
                    targetId: audit.targetAccountId,
                    correlationId: audit.correlationId,
                    occurredAt: audit.occurredAt,
                    metadata: audit.metadata as Prisma.InputJsonObject,
                  },
                });
              },
            }),
          { isolationLevel: 'Serializable' },
        ),
      ),
  };

  const dependencies: ClosureDependencies = {
    unitOfWork,
    verifyPassword: createAccountPasswordVerifier(prisma),
    now: options.now,
    newId: options.newId ?? randomUUID,
  };

  return {
    close: (command, principal) =>
      closeClientAccount(command, principal, dependencies),
  };
};
