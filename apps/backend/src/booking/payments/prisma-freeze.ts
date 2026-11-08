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
import {
  settleReviewNotices,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
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
    actionCode:
      | 'freeze.requested'
      | 'freeze.approved'
      | 'freeze.refused'
      | 'freeze.withdrawn';
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

  const settleFreezeRequest = (
    transaction: Prisma.TransactionClient,
    input: { freezeId: string; decidedAt: Date },
  ) =>
    settleReviewNotices(transaction, {
      businessEventKey: `freeze-requested:${input.freezeId}`,
      settledAt: input.decidedAt,
    });

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
                  deletedAt: null,
                },
                select: {
                  id: true,
                  subscriptionId: true,
                  clientId: true,
                  startsOn: true,
                  endsOn: true,
                  state: true,
                  subscription: { select: { endsOn: true } },
                  client: { select: { account: { select: { id: true } } } },
                },
              });
              if (row?.client.account == null) return null;
              return {
                id: row.id,
                clientAccountId: row.client.account.id,
                subscriptionId: row.subscriptionId,
                state: row.state.toLowerCase() as
                  'requested' | 'approved' | 'refused',
                startsOn: row.startsOn,
                endsOn: row.endsOn,
                planEndsOn: row.subscription.endsOn,
              };
            },
            approve: async (input) => {
              await approveFreeze(transaction, input);
              await settleFreezeRequest(transaction, input);
            },
            refuse: async (input) => {
              await refuseFreeze(transaction, input);
              await settleFreezeRequest(transaction, input);
            },
            record: (notification) =>
              dependencies.recordNotification(transaction, notification),
            now: dependencies.now,
          }),
        { isolationLevel: 'Serializable' },
      ),
    );

  // Walkthrough finding 51 (owner 2026-11-08): the Client withdraws her own
  // request while it is still in review. Soft delete, so it no longer counts
  // as the plan's one Freeze; the operators' notices are settled.
  const withdrawFreeze = async (
    command: { freezeId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ state: 'withdrawn' }> => {
    const clientId = requireClient(principal);
    return prisma.$transaction(async (transaction) => {
      const freeze = await transaction.freeze.findFirst({
        where: { id: command.freezeId, clientId, deletedAt: null },
        select: { id: true, state: true, subscriptionId: true },
      });
      if (freeze === null) {
        throw new PaymentRuleError(
          'freeze_not_allowed',
          'Este plan no se puede congelar.',
        );
      }
      if (freeze.state !== FreezeState.REQUESTED) {
        throw new PaymentRuleError(
          'freeze_already_decided',
          'Este congelamiento ya fue decidido.',
        );
      }
      const now = dependencies.now();
      const withdrawn = await transaction.freeze.updateMany({
        where: { id: freeze.id, state: FreezeState.REQUESTED, deletedAt: null },
        data: { deletedAt: now },
      });
      if (withdrawn.count === 0) {
        throw new PaymentRuleError(
          'freeze_already_decided',
          'Este congelamiento ya fue decidido.',
        );
      }
      await audit(transaction, {
        actionCode: 'freeze.withdrawn',
        freezeId: freeze.id,
        actorAccountId: principal.accountId,
        actorRole: null,
        occurredAt: now,
        metadata: { subscriptionId: freeze.subscriptionId },
      });
      await settleFreezeRequest(transaction, {
        freezeId: freeze.id,
        decidedAt: now,
      });
      return { state: 'withdrawn' as const };
    });
  };

  return {
    requestFreeze,
    decideFreeze: decide,
    withdrawFreeze,
    FreezeAccessDeniedError,
  };
};
