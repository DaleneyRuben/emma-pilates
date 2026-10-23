import { randomUUID } from 'node:crypto';
import { runIdempotent } from '../../database/run-idempotent';
import {
  AuditActorKind,
  AuditOutcome,
  FeedbackApp as PrismaFeedbackApp,
  FeedbackPlatform as PrismaFeedbackPlatform,
  FeedbackStatus as PrismaFeedbackStatus,
  FeedbackType as PrismaFeedbackType,
  Prisma,
  StaffRole,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  FeedbackError,
  type FeedbackActor,
  type FeedbackApp,
  type FeedbackPlatform,
  type FeedbackRole,
  type FeedbackRow,
  type FeedbackStatus,
  type FeedbackStore,
  type FeedbackType,
} from './feedback';

type Transaction = Prisma.TransactionClient;

const types: Record<FeedbackType, PrismaFeedbackType> = {
  problem: PrismaFeedbackType.PROBLEM,
  suggestion: PrismaFeedbackType.SUGGESTION,
  other: PrismaFeedbackType.OTHER,
};
const statuses: Record<FeedbackStatus, PrismaFeedbackStatus> = {
  new: PrismaFeedbackStatus.NEW,
  reviewed: PrismaFeedbackStatus.REVIEWED,
  resolved: PrismaFeedbackStatus.RESOLVED,
};
const apps: Record<FeedbackApp, PrismaFeedbackApp> = {
  client: PrismaFeedbackApp.CLIENT,
  staff: PrismaFeedbackApp.STAFF,
};
const platforms: Record<FeedbackPlatform, PrismaFeedbackPlatform> = {
  android: PrismaFeedbackPlatform.ANDROID,
  ios: PrismaFeedbackPlatform.IOS,
};
const lower = <Value extends string>(value: string): Value =>
  value.toLowerCase() as Value;

const feedbackSelect = {
  id: true,
  app: true,
  senderRole: true,
  type: true,
  text: true,
  appVersion: true,
  appBuild: true,
  platform: true,
  osVersion: true,
  status: true,
  changeNote: true,
  createdAt: true,
  triagedAt: true,
  account: { select: { email: true } },
} as const satisfies Prisma.FeedbackSelect;

type FeedbackRecord = Prisma.FeedbackGetPayload<{
  select: typeof feedbackSelect;
}>;

const toRow = (record: FeedbackRecord): FeedbackRow => ({
  id: record.id,
  app: lower<FeedbackApp>(record.app),
  role: record.senderRole as FeedbackRole,
  type: lower<FeedbackType>(record.type),
  text: record.text,
  appVersion: record.appVersion,
  appBuild: record.appBuild,
  platform: lower<FeedbackPlatform>(record.platform),
  osVersion: record.osVersion,
  status: lower<FeedbackStatus>(record.status),
  changeNote: record.changeNote,
  senderEmail: record.account.email,
  createdAt: record.createdAt,
  triagedAt: record.triagedAt,
});

// The Administrators' inbox line and push: no text, no name, so the lock
// screen can show it as it is (ADR-0070).
const typeWords: Record<FeedbackType, string> = {
  problem: 'un problema',
  suggestion: 'una sugerencia',
  other: 'un comentario',
};
const appWords: Record<FeedbackApp, string> = {
  client: 'la app de clientas',
  staff: 'la app del personal',
};

const audit = (
  actor: FeedbackActor,
  input: {
    actionCode: 'feedback.triaged' | 'feedback.exported';
    targetId: string | null;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
): Prisma.AuditRecordUncheckedCreateInput => ({
  actionCode: input.actionCode,
  outcome: AuditOutcome.SUCCEEDED,
  actorKind: AuditActorKind.ACCOUNT,
  actorAccountId: actor.accountId,
  actorRole: StaffRole.ADMINISTRATOR,
  targetType: 'feedback',
  targetId: input.targetId,
  correlationId: randomUUID(),
  metadata: input.metadata,
  occurredAt: input.occurredAt,
});

// REL-012: Feedback rows, the Administrators' notification, and triage.
export const createPrismaFeedbackStore = (
  prisma: PrismaClient,
  { recordNotification }: { recordNotification: NotificationRecorder },
): FeedbackStore => {
  const notifyAdministrators = async (
    transaction: Transaction,
    feedback: { id: string; accountId: string; type: FeedbackType },
    app: FeedbackApp,
    occurredAt: Date,
  ): Promise<void> => {
    const administrators = await transaction.account.findMany({
      where: {
        id: { not: feedback.accountId },
        activatedAt: { not: null },
        disabledAt: null,
        deletedAt: null,
        staffMember: { role: StaffRole.ADMINISTRATOR, deletedAt: null },
      },
      select: { id: true },
    });
    for (const administrator of administrators) {
      await recordNotification(transaction, {
        accountId: administrator.id,
        category: 'announcement',
        type: 'feedback_received',
        businessEventKey: `feedback-received:${feedback.id}`,
        title: 'Comentario nuevo',
        message: `Llegó ${typeWords[feedback.type]} desde ${appWords[app]}. Revísalo en la web de administración.`,
        destination: { type: 'feedback', id: feedback.id },
        occurredAt,
      });
    }
  };

  return {
    send: async (input) => {
      const request = {
        type: input.type,
        text: input.text,
        appVersion: input.appVersion,
        appBuild: input.appBuild,
        platform: input.platform,
        osVersion: input.osVersion,
      };
      const stored = await runIdempotent(
        prisma,
        {
          accountId: input.accountId,
          command: 'send_feedback',
          idempotencyKey: input.idempotencyKey,
          request,
          now: () => input.sentAt,
          onKeyReused: () => new FeedbackError('idempotency_key_reused'),
        },
        async (transaction) => {
          // One Account's sends count one at a time, so two at once cannot
          // both take the last place in the window.
          const lockKey = `feedback:${input.accountId}`;
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const recent = await transaction.feedback.count({
            where: {
              accountId: input.accountId,
              deletedAt: null,
              createdAt: { gt: input.windowStartsAt },
            },
          });
          if (recent >= input.dailyLimit) {
            throw new FeedbackError('feedback_limit_reached');
          }
          await transaction.feedback.create({
            data: {
              id: input.id,
              accountId: input.accountId,
              app: apps[input.app],
              senderRole: input.role,
              type: types[input.type],
              text: input.text,
              appVersion: input.appVersion,
              appBuild: input.appBuild,
              platform: platforms[input.platform],
              osVersion: input.osVersion,
              createdAt: input.sentAt,
            },
          });
          await notifyAdministrators(
            transaction,
            input,
            input.app,
            input.sentAt,
          );
          return { id: input.id, createdAt: input.sentAt.toISOString() };
        },
      );
      return { id: stored.id, createdAt: new Date(stored.createdAt) };
    },

    list: async ({ page, pageSize, status, app }) => {
      const where: Prisma.FeedbackWhereInput = {
        deletedAt: null,
        ...(status === undefined ? {} : { status: statuses[status] }),
        ...(app === undefined ? {} : { app: apps[app] }),
      };
      const [records, totalItems, newCount] = await Promise.all([
        prisma.feedback.findMany({
          where,
          select: feedbackSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.feedback.count({ where }),
        prisma.feedback.count({
          where: { deletedAt: null, status: PrismaFeedbackStatus.NEW },
        }),
      ]);
      return {
        items: records.map(toRow),
        page,
        pageSize,
        totalItems,
        newCount,
      };
    },

    listAll: async () =>
      (
        await prisma.feedback.findMany({
          where: { deletedAt: null },
          select: feedbackSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        })
      ).map(toRow),

    recordExport: async ({ actor, feedbackCount, occurredAt }) => {
      await prisma.auditRecord.create({
        data: audit(actor, {
          actionCode: 'feedback.exported',
          targetId: null,
          metadata: { feedbackCount },
          occurredAt,
        }),
      });
    },

    triage: ({ feedbackId, status, changeNote, actor, occurredAt }) =>
      prisma.$transaction(async (transaction) => {
        const previous = await transaction.feedback.findFirst({
          where: { id: feedbackId, deletedAt: null },
          select: { status: true, changeNote: true },
        });
        if (previous === null) return null;
        const record = await transaction.feedback.update({
          where: { id: feedbackId },
          data: {
            status: statuses[status],
            changeNote,
            triagedAt: occurredAt,
          },
          select: feedbackSelect,
        });
        await transaction.auditRecord.create({
          data: audit(actor, {
            actionCode: 'feedback.triaged',
            targetId: feedbackId,
            metadata: {
              previousStatus: lower<FeedbackStatus>(previous.status),
              status,
              noteChanged: previous.changeNote !== changeNote,
            },
            occurredAt,
          }),
        });
        return toRow(record);
      }),
  };
};
