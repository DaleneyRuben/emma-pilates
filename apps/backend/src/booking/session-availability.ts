import { staffPhotoOf } from './staff/photo/staff-photo-of';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import type {
  AdministratorSessionAvailabilityDto,
  SessionAvailabilityDto,
} from './booking.dto';
import {
  cancellationFields,
  countBookingsAtCancellation,
  shownSessionStates,
  toSessionCancellation,
} from './sessions/session-cancellation';

export type SessionAvailabilityHandler = (input: {
  branchId: string;
  from: Date;
  until: Date;
  limit: number;
  /** FIX-052: the Staff Horario shows cancelled classes in place. */
  includeCancelled?: boolean;
}) => Promise<SessionAvailabilityDto[]>;

const findScheduledSessions = async (
  prisma: PrismaClient,
  input: {
    branchId?: string;
    from: Date;
    until: Date;
    limit: number;
    includeCancelled?: boolean;
  },
) => {
  const where: Prisma.SessionWhereInput = {
    ...(input.branchId === undefined ? {} : { branchId: input.branchId }),
    ...shownSessionStates(input.includeCancelled === true),
    startsAt: { gte: input.from, lt: input.until },
  };
  const sessions = await prisma.session.findMany({
    where,
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    take: input.limit,
    select: {
      id: true,
      sessionScheduleId: true,
      isException: true,
      ...cancellationFields,
      branchId: true,
      classTypeId: true,
      trainerStaffMemberId: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      branch: { select: { name: true } },
      classType: { select: { name: true } },
      trainer: { select: { name: true, profileImageAssetId: true } },
      _count: {
        select: {
          bookings: { where: { state: 'BOOKED' } },
          waitlistEntries: { where: { closedAt: null } },
        },
      },
    },
  });

  const bookedAtCancellation = await countBookingsAtCancellation(
    prisma,
    sessions,
  );
  return sessions.map((session) => ({
    availability: {
      id: session.id,
      branchId: session.branchId,
      branchName: session.branch.name,
      classTypeId: session.classTypeId,
      trainerStaffMemberId: session.trainerStaffMemberId,
      classTypeName: session.classType.name,
      trainerName: session.trainer.name,
      trainerPhoto: staffPhotoOf(session.trainer.profileImageAssetId),
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      bookedCount: session._count.bookings,
      availableSeats: Math.max(0, session.capacity - session._count.bookings),
      waitlistCount: session._count.waitlistEntries,
    },
    sessionScheduleId: session.sessionScheduleId,
    isException: session.isException,
    cancellation: toSessionCancellation(session, bookedAtCancellation),
  }));
};

export const listSessionAvailability =
  (prisma: PrismaClient): SessionAvailabilityHandler =>
  async (input) =>
    (await findScheduledSessions(prisma, input)).map(
      ({ availability, cancellation }) =>
        input.includeCancelled === true
          ? { ...availability, cancellation }
          : availability,
    );

// API-002: every Branch at once, for the Administrator's Session search;
// WEB-003's week grid narrows it to the selected Branch and needs to know
// which Sessions a weekly schedule generated; FIX-042 asks for its
// cancelled Sessions too, with their cause.
export const listSessionsAcrossBranches =
  (prisma: PrismaClient) =>
  async (input: {
    branchId?: string;
    from: Date;
    until: Date;
    limit: number;
    includeCancelled?: boolean;
  }): Promise<AdministratorSessionAvailabilityDto[]> =>
    (await findScheduledSessions(prisma, input)).map(
      ({ availability, ...schedule }) => ({ ...availability, ...schedule }),
    );
