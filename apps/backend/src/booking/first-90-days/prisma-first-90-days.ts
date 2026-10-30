import { boliviaDate } from '../../time/bolivia-time';
import { dateTriggeredPushInstant } from '../../notifications/date-triggered-push';
import { classesInsideFirstDays } from './first-90-days-alerts';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  BookingState,
  ContactAlertReason as PrismaContactAlertReason,
  LifecycleMilestone as PrismaLifecycleMilestone,
} from '../../generated/prisma/enums';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { ContactAlertReason } from './first-90-days-alerts';
import type { LifecycleMilestone } from './first-90-days-milestones';
import {
  sendLifecycleMessages,
  type FirstRealPlan,
  type LifecycleSend,
} from './send-lifecycle-messages';
import {
  sweepContactAlerts,
  type ClientAlertState,
} from './sweep-contact-alerts';

const milestoneValues: Record<LifecycleMilestone, PrismaLifecycleMilestone> = {
  day_2: PrismaLifecycleMilestone.DAY_2,
  week_1: PrismaLifecycleMilestone.WEEK_1,
  day_30: PrismaLifecycleMilestone.DAY_30,
  day_90: PrismaLifecycleMilestone.DAY_90,
};

const milestoneNames: Record<PrismaLifecycleMilestone, LifecycleMilestone> = {
  DAY_2: 'day_2',
  WEEK_1: 'week_1',
  DAY_30: 'day_30',
  DAY_90: 'day_90',
};

const reasonValues: Record<ContactAlertReason, PrismaContactAlertReason> = {
  no_booking_7_days: PrismaContactAlertReason.NO_BOOKING_7_DAYS,
  fewer_than_2_classes_by_day_15:
    PrismaContactAlertReason.FEWER_THAN_2_CLASSES_BY_DAY_15,
  fewer_than_4_classes_in_first_30_days:
    PrismaContactAlertReason.FEWER_THAN_4_CLASSES_IN_FIRST_30_DAYS,
};

const reasonNames: Record<PrismaContactAlertReason, ContactAlertReason> = {
  NO_BOOKING_7_DAYS: 'no_booking_7_days',
  FEWER_THAN_2_CLASSES_BY_DAY_15: 'fewer_than_2_classes_by_day_15',
  FEWER_THAN_4_CLASSES_IN_FIRST_30_DAYS:
    'fewer_than_4_classes_in_first_30_days',
};

const firstRealPlan = (
  rows: {
    clientId: string;
    startsOn: Date;
    client: {
      account: { id: string } | null;
      lifecycleMessages: { milestone: PrismaLifecycleMilestone }[];
    };
  }[],
): FirstRealPlan[] => {
  const first = new Map<string, FirstRealPlan>();
  for (const row of rows) {
    if (first.has(row.clientId) || row.client.account === null) continue;
    first.set(row.clientId, {
      clientId: row.clientId,
      accountId: row.client.account.id,
      startsOn: row.startsOn,
      sentMilestones: row.client.lifecycleMessages.map(
        (message) => milestoneNames[message.milestone],
      ),
    });
  }
  return [...first.values()];
};

const withinNinetyDays = (today: Date) => ({
  gte: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1_000),
  lte: today,
});

const findFirstRealPlans = (prisma: PrismaClient): Promise<FirstRealPlan[]> =>
  prisma.subscription
    .findMany({
      where: {
        plan: { priceCentavos: { gt: 0 }, hiddenAt: null },
        // A Client sent the day-90 message has nothing left to receive.
        client: {
          deletedAt: null,
          lifecycleMessages: {
            none: {
              milestone: PrismaLifecycleMilestone.DAY_90,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: [{ startsOn: 'asc' }, { id: 'asc' }],
      select: {
        clientId: true,
        startsOn: true,
        client: {
          select: {
            account: { select: { id: true } },
            lifecycleMessages: {
              where: { deletedAt: null },
              select: { milestone: true },
            },
          },
        },
      },
    })
    .then(firstRealPlan);

const alertStateFrom = (
  startsOn: Date,
  clientId: string,
  bookings: {
    createdAt: Date;
    session: { startsAt: Date };
  }[],
  alerts: {
    reason: PrismaContactAlertReason;
    contactedAt: Date | null;
  }[],
  instant: Date,
): ClientAlertState => {
  const booked = bookings;
  const lastBookedAt = booked.reduce<Date | null>(
    (latest, booking) =>
      latest === null || booking.createdAt > latest
        ? booking.createdAt
        : latest,
    null,
  );
  const openUncontacted: ClientAlertState['openUncontacted'] = {};
  const lastContactedAt: ClientAlertState['lastContactedAt'] = {};
  const everOpened: ClientAlertState['everOpened'] = {};
  for (const alert of alerts) {
    const reason = reasonNames[alert.reason];
    everOpened[reason] = true;
    const previous = lastContactedAt[reason];
    if (alert.contactedAt === null) openUncontacted[reason] = true;
    else if (
      previous === undefined ||
      previous === null ||
      alert.contactedAt > previous
    ) {
      lastContactedAt[reason] = alert.contactedAt;
    }
  }
  return {
    clientId,
    startsOn,
    lastBookedOn: lastBookedAt === null ? null : boliviaDate(lastBookedAt),
    lastBookedAt,
    hasUpcomingBooking: booked.some(
      (booking) => booking.session.startsAt > instant,
    ),
    bookedClassCount: classesInsideFirstDays(
      startsOn,
      15,
      booked.map((booking) => booking.session.startsAt),
    ),
    bookedClassCount30: classesInsideFirstDays(
      startsOn,
      30,
      booked.map((booking) => booking.session.startsAt),
    ),
    openUncontacted,
    lastContactedAt,
    everOpened,
  };
};

const findClientAlertStates = async (
  prisma: PrismaClient,
  instant: Date,
): Promise<ClientAlertState[]> => {
  // The clock starts at each Client's first real Plan; a renewal within the
  // window never restarts it.
  const firsts = await prisma.subscription.groupBy({
    by: ['clientId'],
    where: {
      plan: { priceCentavos: { gt: 0 }, hiddenAt: null },
      client: { deletedAt: null },
    },
    _min: { startsOn: true },
    having: { startsOn: { _min: withinNinetyDays(boliviaDate(instant)) } },
  });
  const firstStarts = new Map<string, Date>();
  for (const row of firsts) {
    if (row._min.startsOn !== null)
      firstStarts.set(row.clientId, row._min.startsOn);
  }
  const clientIds = [...firstStarts.keys()];
  if (clientIds.length === 0) return [];
  const [bookings, alerts] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: { in: clientIds }, state: BookingState.BOOKED },
      select: {
        clientId: true,
        createdAt: true,
        session: { select: { startsAt: true } },
      },
    }),
    prisma.contactAlert.findMany({
      where: { clientId: { in: clientIds }, deletedAt: null },
      select: { clientId: true, reason: true, contactedAt: true },
    }),
  ]);
  const bookingsByClient = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const list = bookingsByClient.get(booking.clientId) ?? [];
    list.push(booking);
    bookingsByClient.set(booking.clientId, list);
  }
  const alertsByClient = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const list = alertsByClient.get(alert.clientId) ?? [];
    list.push(alert);
    alertsByClient.set(alert.clientId, list);
  }
  return [...firstStarts.entries()].map(([clientId, startsOn]) =>
    alertStateFrom(
      startsOn,
      clientId,
      bookingsByClient.get(clientId) ?? [],
      alertsByClient.get(clientId) ?? [],
      instant,
    ),
  );
};

const recordLifecycle = async (
  transaction: Prisma.TransactionClient,
  recordNotification: NotificationRecorder,
  send: LifecycleSend,
  sentAt: Date,
): Promise<boolean> => {
  const inserted = await transaction.lifecycleMessage.createMany({
    data: {
      clientId: send.clientId,
      milestone: milestoneValues[send.milestone],
      sentAt,
    },
    skipDuplicates: true,
  });
  if (inserted.count === 0) return false;
  if (send.notification !== null) {
    await recordNotification(transaction, send.notification);
  }
  return true;
};

const openContactAlerts = (
  prisma: PrismaClient,
  alerts: { clientId: string; reason: ContactAlertReason }[],
  openedAt: Date,
): Promise<number> =>
  prisma.contactAlert
    .createMany({
      data: alerts.map((alert) => ({
        clientId: alert.clientId,
        reason: reasonValues[alert.reason],
        openedAt,
      })),
      skipDuplicates: true,
    })
    .then((result) => result.count);

export const createFirst90DaysJob = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
  recordNotification: NotificationRecorder,
) => ({
  execute: async () => {
    const instant = now();
    const today = boliviaDate(instant);
    const occurredAt = dateTriggeredPushInstant(instant);
    const messages =
      occurredAt === null
        ? { sent: 0 }
        : await sendLifecycleMessages({
            today,
            occurredAt,
            findFirstRealPlans: () => findFirstRealPlans(prisma),
            record: (send) =>
              prisma.$transaction((transaction) =>
                recordLifecycle(transaction, recordNotification, send, instant),
              ),
          });
    const alerts = await sweepContactAlerts({
      today,
      findClientStates: () => findClientAlertStates(prisma, instant),
      open: (rows) => openContactAlerts(prisma, rows, instant),
    });
    return { messages: messages.sent, alerts: alerts.opened };
  },
});
