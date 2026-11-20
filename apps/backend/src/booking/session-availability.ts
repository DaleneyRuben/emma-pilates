import { staffPhotoOf } from './staff/photo/staff-photo-of';
import { nameInitials } from './client/name-initials';
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
  /** E7: the Assistant's «Hoy» shows who is coming, by initials only. */
  includeAttendees?: boolean;
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

// Booked Clients' initials per Session, in booking order; never their names.
const findAttendeeInitials = async (
  prisma: PrismaClient,
  sessionIds: string[],
): Promise<Map<string, string[]>> => {
  const bookings = await prisma.booking.findMany({
    where: { sessionId: { in: sessionIds }, state: 'BOOKED' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { sessionId: true, client: { select: { name: true } } },
  });
  const initials = new Map<string, string[]>();
  for (const booking of bookings) {
    const list = initials.get(booking.sessionId) ?? [];
    list.push(nameInitials(booking.client.name));
    initials.set(booking.sessionId, list);
  }
  return initials;
};

export const listSessionAvailability =
  (prisma: PrismaClient): SessionAvailabilityHandler =>
  async (input) => {
    const sessions = await findScheduledSessions(prisma, input);
    const attendees =
      input.includeAttendees === true
        ? await findAttendeeInitials(
            prisma,
            sessions.map(({ availability }) => availability.id),
          )
        : undefined;
    return sessions.map(({ availability, cancellation }) => ({
      ...availability,
      ...(input.includeCancelled === true ? { cancellation } : {}),
      ...(attendees === undefined
        ? {}
        : { attendeeInitials: attendees.get(availability.id) ?? [] }),
    }));
  };

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
