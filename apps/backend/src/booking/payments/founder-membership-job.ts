import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { dateTriggeredPushInstant } from '../../notifications/date-triggered-push';

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
type NextStart = { startsOn: Date; soldAt: Date | null };

// The day a next Plan was sold: its Purchase Intent's, else its Payment's.
const soldAt = (
  payment: {
    createdAt: Date;
    purchaseIntent: { createdAt: Date } | null;
  } | null,
): Date | null =>
  payment?.purchaseIntent?.createdAt ?? payment?.createdAt ?? null;

const earliest = (starts: NextStart[]): NextStart | null =>
  starts.reduce<NextStart | null>(
    (soonest, start) =>
      soonest === null || start.startsOn.getTime() < soonest.startsOn.getTime()
        ? start
        : soonest,
    null,
  );

const realEnd = (
  subscriptions: {
    endsOn: Date;
    startsOn: Date;
    state: string;
    payment: {
      createdAt: Date;
      purchaseIntent: { createdAt: Date } | null;
    } | null;
  }[],
  pendingStarts: NextStart[],
  today: Date,
): {
  latestRealEnd: Date | null;
  nextStart: Date | null;
  nextSoldOn: Date | null;
} => {
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
  const next = earliest([
    ...subscriptions
      .filter(
        (subscription) => subscription.startsOn.getTime() > today.getTime(),
      )
      .map((subscription) => ({
        startsOn: subscription.startsOn,
        soldAt: soldAt(subscription.payment),
      })),
    ...pendingStarts,
  ]);
  return {
    latestRealEnd,
    nextStart: next?.startsOn ?? null,
    nextSoldOn:
      next === null || next.soldAt === null ? null : boliviaDate(next.soldAt),
  };
};

export const createFounderMembershipJob = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
  recordNotification: NotificationRecorder = defaultNotificationRecorder,
) => ({
  execute: async (): Promise<{ ended: number }> => {
    const instant = now();
    const occurredAt = dateTriggeredPushInstant(instant);
    if (occurredAt === null) return { ended: 0 };
    const today = boliviaDate(instant);
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
      occurredAt,
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
                  select: {
                    startsOn: true,
                    endsOn: true,
                    state: true,
                    payment: {
                      select: {
                        createdAt: true,
                        purchaseIntent: { select: { createdAt: true } },
                      },
                    },
                  },
                },
                payments: {
                  where: { state: PaymentState.PENDING },
                  select: {
                    startsOn: true,
                    createdAt: true,
                    purchaseIntent: { select: { createdAt: true } },
                  },
                },
              },
            },
          },
        });
        return rows.map((row) => {
          const ends = realEnd(
            row.client.subscriptions,
            row.client.payments.map((payment) => ({
              startsOn: payment.startsOn,
              soldAt: soldAt(payment),
            })),
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
            nextSoldOn: ends.nextSoldOn,
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
          if (changed.count === 0) return false;
          await transaction.auditRecord.create({
            data: {
              actionCode: 'founder_membership.lost',
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.SYSTEM,
              targetType: 'founder_membership',
              targetId: input.id,
              correlationId: input.id,
              occurredAt,
              metadata: { reason: input.reason },
            },
          });
          if (input.accountId === null) return true;
          await recordNotification(transaction, {
            accountId: input.accountId,
            category: 'reminder',
            type: 'founder_membership_lost',
            businessEventKey: `founder-membership-lost:${input.id}`,
            title: 'Membresía fundadora',
            message: `Pasaron más de ${version.founderGapDays} días sin plan, así que tu membresía fundadora se perdió.`,
            destination: { type: 'subscription', id: null },
            occurredAt,
          });
          return true;
        }),
    });
  },
});

export const founderCoveredUntil = addDays;
