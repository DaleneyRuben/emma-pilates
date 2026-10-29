import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

const civil = (date: Date): Date =>
  new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { endLapsedFounderMemberships } from './end-lapsed-founder-memberships';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * dayMilliseconds);

// The real end is the stored end. A Freeze does not count as a gap; BKM-012
// will pass the frozen days when it exists.
const earliest = (dates: Date[]): Date | null =>
  dates.reduce<Date | null>(
    (soonest, date) =>
      soonest === null || date.getTime() < soonest.getTime() ? date : soonest,
    null,
  );

const realEnd = (
  subscriptions: { endsOn: Date; startsOn: Date; state: string }[],
  pendingStarts: Date[],
  today: Date,
): { latestRealEnd: Date | null; nextStart: Date | null } => {
  const started = subscriptions.filter(
    (subscription) =>
      subscription.startsOn.getTime() <= today.getTime() ||
      subscription.state !== 'ACTIVE',
  );
  const latestRealEnd = started.reduce<Date | null>(
    (latest, subscription) =>
      latest === null || subscription.endsOn.getTime() > latest.getTime()
        ? subscription.endsOn
        : latest,
    null,
  );
  const nextStart = earliest([
    ...subscriptions
      .filter(
        (subscription) => subscription.startsOn.getTime() > today.getTime(),
      )
      .map((subscription) => subscription.startsOn),
    ...pendingStarts,
  ]);
  return { latestRealEnd, nextStart };
};

export const createFounderMembershipJob = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
  recordNotification: NotificationRecorder = defaultNotificationRecorder,
) => ({
  execute: async (): Promise<{ ended: number }> => {
    const today = boliviaDate(now());
    const version = await prisma.studioSettingsVersion.findFirst({
      orderBy: { version: 'desc' },
      select: {
        founderPlaces: true,
        founderDiscountPercent: true,
        founderGapDays: true,
      },
    });
    if (version === null) throw new Error('Studio Settings have no version');

    return endLapsedFounderMemberships({
      today,
      rules: version,
      findActive: async () => {
        const rows = await prisma.founderMembership.findMany({
          where: { status: FounderMembershipStatus.ACTIVE, deletedAt: null },
          select: {
            id: true,
            clientId: true,
            number: true,
            client: {
              select: {
                account: { select: { id: true } },
                subscriptions: {
                  where: {
                    payment: {
                      state: { not: 'VOIDED' },
                      method: { not: PaymentMethod.COURTESY },
                    },
                  },
                  select: { startsOn: true, endsOn: true, state: true },
                },
                payments: {
                  where: { state: PaymentState.PENDING },
                  select: { startsOn: true },
                },
              },
            },
          },
        });
        return rows.map((row) => {
          const ends = realEnd(
            row.client.subscriptions,
            row.client.payments.map((payment) => payment.startsOn),
            today,
          );
          return {
            id: row.id,
            clientId: row.clientId,
            accountId: row.client.account?.id ?? null,
            number: row.number,
            latestRealEnd:
              ends.latestRealEnd === null ? null : civil(ends.latestRealEnd),
            nextStart: ends.nextStart === null ? null : civil(ends.nextStart),
          };
        });
      },
      markLost: (input) =>
        prisma.$transaction(async (transaction) => {
          const changed = await transaction.founderMembership.updateMany({
            where: { id: input.id, status: FounderMembershipStatus.ACTIVE },
            data: {
              status: FounderMembershipStatus.LOST,
              reason: input.reason,
              lostAt: input.occurredAt,
            },
          });
          if (changed.count === 0) return;
          await transaction.auditRecord.create({
            data: {
              actionCode: 'founder_membership.lost',
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.SYSTEM,
              targetType: 'founder_membership',
              targetId: input.id,
              correlationId: input.id,
              occurredAt: input.occurredAt,
              metadata: { reason: input.reason },
            },
          });
        }),
      record: (notification) =>
        prisma.$transaction((transaction) =>
          recordNotification(transaction, notification),
        ),
    });
  },
});

export const founderCoveredUntil = addDays;
