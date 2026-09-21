import type { PrismaClient } from '../generated/prisma/client';
import type { SessionAvailabilityDto } from './booking.dto';

export type SessionAvailabilityHandler = (input: {
  branchId: string;
  from: Date;
  until: Date;
  limit: number;
}) => Promise<SessionAvailabilityDto[]>;

export const listSessionAvailability =
  (prisma: PrismaClient): SessionAvailabilityHandler =>
  async ({ branchId, from, until, limit }) => {
    const sessions = await prisma.session.findMany({
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
        classType: { select: { name: true } },
        trainer: { select: { name: true } },
        _count: {
          select: {
            bookings: { where: { state: 'BOOKED' } },
            waitlistEntries: { where: { closedAt: null } },
          },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      branchId: session.branchId,
      classTypeId: session.classTypeId,
      trainerStaffMemberId: session.trainerStaffMemberId,
      classTypeName: session.classType.name,
      trainerName: session.trainer.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      bookedCount: session._count.bookings,
      availableSeats: Math.max(0, session.capacity - session._count.bookings),
      waitlistCount: session._count.waitlistEntries,
    }));
  };
