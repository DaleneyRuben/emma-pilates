import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FreezeState,
  PrismaClient,
  StaffRole,
} from '../../generated/prisma/client';
import { retrySerializable } from '../../database/retry-serializable';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { decideFreeze, FreezeAccessDeniedError } from './decide-freeze';
import { approveFreeze, refuseFreeze } from './freeze-approval';
import { assertFreezeRequestAllowed } from './freeze-window';
import { PaymentRuleError } from './payment-errors';

type Transaction = Prisma.TransactionClient;

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

const audit = (
  transaction: Transaction,
  input: {
    actionCode: 'freeze.requested' | 'freeze.approved' | 'freeze.refused';
    freezeId: string;
    actorAccountId: string;
    actorRole: StaffRole | null;
    occurredAt: Date;
    metadata: Prisma.InputJsonObject;
  },
) => {
  const id = randomUUID();
  return transaction.auditRecord
    .create({
      data: {
        id,
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.actorAccountId,
        actorRole: input.actorRole,
        targetType: 'freeze',
        targetId: input.freezeId,
        correlationId: input.freezeId,
        occurredAt: input.occurredAt,
        metadata: input.metadata,
      },
    })
    .then(() => id);
};

export const createFreezeCommands = (
  prisma: PrismaClient,
  dependencies: { now: () => Date; recordNotification: NotificationRecorder },
) => {
  const requestFreeze = async (
    command: {
      subscriptionId: string;
      startsOn: string;
      endsOn: string;
      reason: string;
    },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string; state: 'requested' }> => {
    const clientId = requireClient(principal);
    const reason = command.reason.trim();
    if (reason.length < 1 || reason.length > 300) {
      throw new PaymentRuleError(
        'freeze_not_allowed',
        'Este plan no se puede congelar.',
      );
    }
    return prisma.$transaction(async (transaction) => {
      const subscription = await transaction.subscription.findFirst({
        where: { id: command.subscriptionId, clientId, state: 'ACTIVE' },
        select: {
          id: true,
          clientId: true,
          startsOn: true,
          endsOn: true,
          durationDaysSnapshot: true,
          freezes: { select: { state: true }, where: { deletedAt: null } },
        },
      });
      if (subscription === null) {
        throw new PaymentRuleError(
          'freeze_not_allowed',
          'Este plan no se puede congelar.',
        );
      }
      const decision = await assertFreezeRequestAllowed(transaction, {
        subscription,
        startsOn: command.startsOn,
        endsOn: command.endsOn,
        today: dependencies.now(),
      });
      const now = dependencies.now();
      const created = await transaction.freeze.create({
        data: {
          subscriptionId: subscription.id,
          clientId,
          startsOn: new Date(`${command.startsOn}T00:00:00.000Z`),
          endsOn: new Date(`${command.endsOn}T00:00:00.000Z`),
          reason,
          state: FreezeState.REQUESTED,
          createdAt: now,
        },
        select: { id: true },
      });
      const auditRecordId = await audit(transaction, {
        actionCode: 'freeze.requested',
        freezeId: created.id,
        actorAccountId: principal.accountId,
        actorRole: null,
        occurredAt: now,
        metadata: {
          subscriptionId: subscription.id,
          startsOn: command.startsOn,
          endsOn: command.endsOn,
          frozenDays: decision.frozenDays,
        },
      });
      await transaction.freeze.update({
        where: { id: created.id },
        data: { auditRecordId },
      });
      const administrators = await transaction.account.findMany({
        where: {
          activatedAt: { not: null },
          disabledAt: null,
          deletedAt: null,
          staffMember: { role: StaffRole.ADMINISTRATOR, deletedAt: null },
        },
        select: { id: true },
      });
      for (const administrator of administrators) {
        await dependencies.recordNotification(transaction, {
          accountId: administrator.id,
          category: 'subscription_payment',
          type: 'freeze_requested',
          businessEventKey: `freeze-requested:${created.id}`,
          title: 'Congelamiento por revisar',
          message: 'Tienes una solicitud de congelamiento pendiente.',
          destination: { type: 'freeze', id: created.id },
          occurredAt: now,
        });
      }
      return { id: created.id, state: 'requested' as const };
    });
  };

  const decide = async (
    command: { freezeId: string; decision: 'approved' | 'refused' },
    principal: AuthenticatedPrincipal,
  ): Promise<{ state: 'approved' | 'refused' }> =>
    retrySerializable(() =>
      prisma.$transaction(
        async (transaction) =>
          decideFreeze(command, {
            principal,
            loadFreeze: async (freezeId) => {
              const row = await transaction.freeze.findFirst({
                where: {
                  id: freezeId,
                  state: FreezeState.REQUESTED,
                  deletedAt: null,
                },
                select: {
                  id: true,
                  subscriptionId: true,
                  clientId: true,
                  startsOn: true,
                  endsOn: true,
                  client: { select: { account: { select: { id: true } } } },
                },
              });
              if (row?.client.account == null) return null;
              return {
                id: row.id,
                clientAccountId: row.client.account.id,
                subscriptionId: row.subscriptionId,
                state: 'requested',
                endsOn: row.endsOn,
              };
            },
            approve: (input) => approveFreeze(transaction, input),
            refuse: (input) => refuseFreeze(transaction, input),
            record: (notification) =>
              dependencies.recordNotification(transaction, notification),
            now: dependencies.now,
          }),
        { isolationLevel: 'Serializable' },
      ),
    );

  return {
    requestFreeze,
    decideFreeze: decide,
    FreezeAccessDeniedError,
  };
};
