import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingCancellationCause,
  BookingState,
  FreezeState,
  PrismaClient,
  StaffRole,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { decideFreeze, FreezeAccessDeniedError } from './decide-freeze';
import { decideFreezeRequest } from './freeze';
import { PaymentRuleError } from './payment-errors';

type Transaction = Prisma.TransactionClient;

const civil = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

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

// A Freeze returns the class the same way a cancellation does: the Booking
// becomes cancelled and the allowance comes back. The waitlist is not
// promoted here; the returned class is the allowance, not a new booking.
const cancelInside = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    clientId: string;
    startsOn: Date;
    endsOn: Date;
    decidedByAccountId: string;
    decidedAt: Date;
  },
): Promise<number> => {
  const bookings = await transaction.booking.findMany({
    where: {
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      state: BookingState.BOOKED,
      session: {
        startsAt: { gte: input.startsOn, lt: addDay(input.endsOn) },
      },
    },
    select: { id: true },
  });
  if (bookings.length === 0) return 0;
  const cancelled = await transaction.booking.updateMany({
    where: {
      id: { in: bookings.map((booking) => booking.id) },
      state: BookingState.BOOKED,
    },
    data: {
      state: BookingState.CANCELLED,
      cancelledAt: new Date(),
      cancelledByAccountId: input.decidedByAccountId,
      cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
    },
  });
  await transaction.subscription.update({
    where: { id: input.subscriptionId },
    data: { remainingClassAllowance: { increment: cancelled.count } },
  });
  return cancelled.count;
};

const addDay = (date: Date): Date =>
  new Date(date.getTime() + 24 * 60 * 60 * 1_000);

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
      const decision = decideFreezeRequest({
        subscriptionId: subscription.id,
        clientId,
        durationDays: subscription.durationDaysSnapshot,
        endsOn: subscription.endsOn,
        today: dependencies.now(),
        startsOn: civil(command.startsOn),
        endsOnRequest: civil(command.endsOn),
        existingRequest:
          subscription.freezes[0] === undefined
            ? null
            : (subscription.freezes[0].state.toLowerCase() as 'requested'),
      });
      if (!decision.allowed) {
        throw new PaymentRuleError(
          'freeze_not_allowed',
          'Este plan no se puede congelar.',
        );
      }
      const now = dependencies.now();
      const created = await transaction.freeze.create({
        data: {
          subscriptionId: subscription.id,
          clientId,
          startsOn: civil(command.startsOn),
          endsOn: civil(command.endsOn),
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
    prisma.$transaction(async (transaction) =>
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
        approve: async (input) => {
          const row = await transaction.freeze.findUniqueOrThrow({
            where: { id: input.freezeId },
            select: {
              subscriptionId: true,
              clientId: true,
              startsOn: true,
              endsOn: true,
              subscription: { select: { endsOn: true } },
            },
          });
          const decision = decideFreezeRequest({
            subscriptionId: row.subscriptionId,
            clientId: row.clientId,
            durationDays: 90,
            endsOn: row.subscription.endsOn,
            today: row.startsOn,
            startsOn: row.startsOn,
            endsOnRequest: row.endsOn,
            existingRequest: null,
          });
          if (!decision.allowed) {
            throw new PaymentRuleError(
              'freeze_not_allowed',
              'Este plan no se puede congelar.',
            );
          }
          const cancelledBookings = await cancelInside(transaction, {
            subscriptionId: row.subscriptionId,
            clientId: row.clientId,
            startsOn: row.startsOn,
            endsOn: row.endsOn,
            decidedByAccountId: input.decidedByAccountId,
            decidedAt: input.decidedAt,
          });
          await transaction.subscription.update({
            where: { id: row.subscriptionId },
            data: { endsOn: decision.extendedEndsOn },
          });
          const auditRecordId = await audit(transaction, {
            actionCode: 'freeze.approved',
            freezeId: input.freezeId,
            actorAccountId: input.decidedByAccountId,
            actorRole: StaffRole.ADMINISTRATOR,
            occurredAt: input.decidedAt,
            metadata: {
              subscriptionId: row.subscriptionId,
              frozenDays: decision.frozenDays,
              cancelledBookings,
            },
          });
          await transaction.freeze.update({
            where: { id: input.freezeId },
            data: {
              state: FreezeState.APPROVED,
              decidedByAccountId: input.decidedByAccountId,
              decidedAt: input.decidedAt,
              auditRecordId,
            },
          });
        },
        refuse: async (input) => {
          const row = await transaction.freeze.findUniqueOrThrow({
            where: { id: input.freezeId },
            select: { subscriptionId: true },
          });
          const auditRecordId = await audit(transaction, {
            actionCode: 'freeze.refused',
            freezeId: input.freezeId,
            actorAccountId: input.decidedByAccountId,
            actorRole: StaffRole.ADMINISTRATOR,
            occurredAt: input.decidedAt,
            metadata: { subscriptionId: row.subscriptionId },
          });
          await transaction.freeze.update({
            where: { id: input.freezeId },
            data: {
              state: FreezeState.REFUSED,
              decidedByAccountId: input.decidedByAccountId,
              decidedAt: input.decidedAt,
              auditRecordId,
            },
          });
        },
        record: (notification) =>
          dependencies.recordNotification(transaction, notification),
        now: dependencies.now,
      }),
    );

  return {
    requestFreeze,
    decideFreeze: decide,
    FreezeAccessDeniedError,
  };
};
