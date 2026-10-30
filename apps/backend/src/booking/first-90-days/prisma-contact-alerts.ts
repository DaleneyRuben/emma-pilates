import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingState,
  ContactAlertReason as PrismaContactAlertReason,
} from '../../generated/prisma/enums';
import type { ContactAlertReason } from './first-90-days-alerts';
import type { OpenContactAlert } from './list-contact-alerts';
import type { MarkContactedStore } from './mark-contacted';

const reasonNames: Record<PrismaContactAlertReason, ContactAlertReason> = {
  NO_BOOKING_7_DAYS: 'no_booking_7_days',
  FEWER_THAN_2_CLASSES_BY_DAY_15: 'fewer_than_2_classes_by_day_15',
  FEWER_THAN_4_CLASSES_IN_FIRST_30_DAYS:
    'fewer_than_4_classes_in_first_30_days',
};

export const createPrismaContactAlerts = (
  prisma: PrismaClient,
): {
  findOpen: () => Promise<OpenContactAlert[]>;
  mark: MarkContactedStore['mark'];
} => ({
  findOpen: () =>
    prisma.contactAlert
      .findMany({
        where: {
          contactedAt: null,
          deletedAt: null,
          client: { deletedAt: null },
        },
        orderBy: [{ openedAt: 'asc' }, { id: 'asc' }],
        select: {
          clientId: true,
          reason: true,
          openedAt: true,
          client: {
            select: {
              name: true,
              phone: true,
              subscriptions: {
                where: {
                  plan: { priceCentavos: { gt: 0 }, hiddenAt: null },
                },
                orderBy: [{ startsOn: 'asc' }, { id: 'asc' }],
                take: 1,
                select: { startsOn: true },
              },
              bookings: {
                where: { state: BookingState.BOOKED },
                select: { createdAt: true },
              },
            },
          },
        },
      })
      .then((rows) =>
        rows.flatMap((row) => {
          const startedOn = row.client.subscriptions[0]?.startsOn;
          if (startedOn === undefined) return [];
          return [
            {
              clientId: row.clientId,
              name: row.client.name,
              phone: row.client.phone,
              startedOn,
              reason: reasonNames[row.reason],
              openedAt: row.openedAt,
              bookedAt: row.client.bookings.map((booking) => booking.createdAt),
            },
          ];
        }),
      ),

  mark: async (input) => {
    const reasons = await prisma.$transaction(async (transaction) => {
      const open = await transaction.contactAlert.findMany({
        where: {
          clientId: input.clientId,
          contactedAt: null,
          deletedAt: null,
        },
        select: { reason: true },
      });
      if (open.length === 0) return [];
      await transaction.contactAlert.updateMany({
        where: {
          clientId: input.clientId,
          contactedAt: null,
          deletedAt: null,
        },
        data: {
          contactedAt: input.occurredAt,
          contactedByAccountId: input.accountId,
        },
      });
      await transaction.auditRecord.create({
        data: {
          actionCode: 'contact_alert.contacted',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: input.audit.accountId,
          actorRole: input.audit.role,
          impersonationId: input.audit.impersonationId,
          targetType: 'client',
          targetId: input.clientId,
          correlationId: randomUUID(),
          occurredAt: input.occurredAt,
          metadata: {
            reasons: open.map((row) => reasonNames[row.reason]),
          },
        },
      });
      return open.map((row) => reasonNames[row.reason]);
    });
    return reasons;
  },
});
