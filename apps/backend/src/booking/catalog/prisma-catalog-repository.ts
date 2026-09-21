import type { Prisma } from '../../generated/prisma/client';
import type { CatalogRepository } from './catalog-repository';

const planSelect = {
  id: true,
  name: true,
  durationMonths: true,
  classAllowance: true,
  priceCentavos: true,
  displayOrder: true,
} as const;

const classTypeSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  defaultCapacity: true,
  equipmentNeeds: true,
} as const;

const subscriptionSelect = {
  id: true,
  planId: true,
  planNameSnapshot: true,
  durationMonthsSnapshot: true,
  originalClassAllowance: true,
  remainingClassAllowance: true,
  startsOn: true,
  endsOn: true,
} as const;

const clientProfileSelect = {
  id: true,
  name: true,
  phone: true,
  referralCode: true,
  account: { select: { email: true } },
} as const;

const toClientProfile = (
  client: {
    id: string;
    name: string;
    phone: string | null;
    referralCode: string;
    account: { email: string } | null;
  } | null,
) =>
  client === null || client.account === null
    ? null
    : {
        id: client.id,
        name: client.name,
        email: client.account.email,
        phone: client.phone,
        referralCode: client.referralCode,
      };

export function createCatalogRepository(
  prisma: Prisma.TransactionClient,
): CatalogRepository {
  return {
    listVisiblePlans: () =>
      prisma.plan.findMany({
        where: { hiddenAt: null },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: planSelect,
      }),
    findVisiblePlan: (id) =>
      prisma.plan.findFirst({
        where: { id, hiddenAt: null },
        select: planSelect,
      }),
    listBranches: () =>
      prisma.branch.findMany({
        where: { archivedAt: null },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, address: true },
      }),
    listClassTypes: () =>
      prisma.classType.findMany({
        where: { archivedAt: null },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: classTypeSelect,
      }),
    findClientProfile: (clientId) =>
      prisma.client
        .findUnique({ where: { id: clientId }, select: clientProfileSelect })
        .then(toClientProfile),
    saveClientProfile: (clientId, changes) =>
      prisma.client
        .update({
          where: { id: clientId },
          data: { name: changes.name, phone: changes.phone },
          select: clientProfileSelect,
        })
        .then((client) => {
          const profile = toClientProfile(client);
          if (profile === null) {
            throw new Error('Client has no Account');
          }
          return profile;
        }),
    findSessionDetail: (sessionId) =>
      prisma.session
        .findFirst({
          where: { id: sessionId, state: 'SCHEDULED' },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            branch: { select: { id: true, name: true, address: true } },
            classType: {
              select: {
                id: true,
                name: true,
                description: true,
                durationMinutes: true,
              },
            },
            trainer: { select: { name: true } },
            _count: {
              select: {
                bookings: { where: { state: 'BOOKED' } },
                waitlistEntries: { where: { closedAt: null } },
              },
            },
          },
        })
        .then((session) =>
          session === null
            ? null
            : {
                id: session.id,
                branch: session.branch,
                classType: session.classType,
                trainerName: session.trainer.name,
                startsAt: session.startsAt,
                endsAt: session.endsAt,
                capacity: session.capacity,
                bookedCount: session._count.bookings,
                availableSeats: Math.max(
                  0,
                  session.capacity - session._count.bookings,
                ),
                waitlistCount: session._count.waitlistEntries,
              },
        ),
    findUpcomingClientBookings: async ({ clientId, from }) => {
      const sessionFacts = {
        id: true,
        startsAt: true,
        endsAt: true,
        classType: { select: { name: true } },
        trainer: { select: { name: true } },
        branch: { select: { name: true } },
      } as const;
      const [bookings, entries] = await Promise.all([
        prisma.booking.findMany({
          where: {
            clientId,
            state: 'BOOKED',
            session: { state: 'SCHEDULED', startsAt: { gt: from } },
          },
          select: { id: true, session: { select: sessionFacts } },
        }),
        prisma.waitlistEntry.findMany({
          where: {
            clientId,
            closedAt: null,
            session: { state: 'SCHEDULED', startsAt: { gt: from } },
          },
          select: { id: true, session: { select: sessionFacts } },
        }),
      ]);
      const facts = (session: (typeof bookings)[number]['session']) => ({
        sessionId: session.id,
        classTypeName: session.classType.name,
        trainerName: session.trainer.name,
        branchName: session.branch.name,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      });

      return [
        ...bookings.map((booking) => ({
          kind: 'booking' as const,
          bookingId: booking.id,
          ...facts(booking.session),
        })),
        ...entries.map((entry) => ({
          kind: 'waitlist' as const,
          waitlistEntryId: entry.id,
          ...facts(entry.session),
        })),
      ].sort(
        (left, right) =>
          left.startsAt.getTime() - right.startsAt.getTime() ||
          left.sessionId.localeCompare(right.sessionId),
      );
    },
    findClassType: (id) =>
      prisma.classType.findUnique({ where: { id }, select: classTypeSelect }),
    findSessionSchedule: (id) =>
      prisma.sessionSchedule.findUnique({
        where: { id },
        select: {
          id: true,
          branchId: true,
          classTypeId: true,
          trainerStaffMemberId: true,
          weekday: true,
          startsAtLocal: true,
          capacity: true,
          effectiveFrom: true,
          effectiveUntil: true,
        },
      }),
    listScheduledSessions: ({ branchId, from, until, limit }) =>
      prisma.session.findMany({
        where: {
          branchId,
          state: 'SCHEDULED',
          startsAt: { gte: from, lt: until },
        },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: limit,
        select: {
          id: true,
          branchId: true,
          classTypeId: true,
          trainerStaffMemberId: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
        },
      }),
    findActiveSubscription: (clientId, onDate) =>
      prisma.subscription.findFirst({
        where: {
          clientId,
          state: 'ACTIVE',
          startsOn: { lte: onDate },
          endsOn: { gte: onDate },
        },
        select: subscriptionSelect,
      }),
    findLatestSubscription: (clientId) =>
      prisma.subscription.findFirst({
        where: { clientId },
        orderBy: [{ endsOn: 'desc' }, { id: 'desc' }],
        select: subscriptionSelect,
      }),
    listPublishedPromotions: (onDate) =>
      prisma.promotion.findMany({
        where: {
          publishedAt: { not: null },
          archivedAt: null,
          displayStartsOn: { lte: onDate },
          displayEndsOn: { gte: onDate },
        },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          headline: true,
          description: true,
          imageAssetId: true,
          displayOrder: true,
        },
      }),
  };
}
