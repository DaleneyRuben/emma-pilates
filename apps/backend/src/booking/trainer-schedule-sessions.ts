import type { PrismaClient } from '../generated/prisma/client';
import {
  cancellationFields,
  countBookingsAtCancellation,
  shownSessionStates,
  toSessionCancellation,
} from './sessions/session-cancellation';
import type { TrainerScheduleSession } from './trainer-schedule';

const hour = 60 * 60 * 1_000;

// The Trainer's Sessions on one Bolivian civil day (UTC−4, no DST); FIX-042
// adds the day's cancelled ones, with their cause, when the agenda asks.
export const findTrainerScheduleSessions =
  (prisma: PrismaClient) =>
  async (input: {
    trainerStaffMemberId: string;
    on: Date;
    includeCancelled: boolean;
  }): Promise<TrainerScheduleSession[]> => {
    const start = new Date(input.on.getTime() + 4 * hour);
    const end = new Date(start.getTime() + 24 * hour);
    const sessions = await prisma.session.findMany({
      where: {
        trainerStaffMemberId: input.trainerStaffMemberId,
        ...shownSessionStates(input.includeCancelled),
        startsAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        ...cancellationFields,
        startsAt: true,
        endsAt: true,
        capacity: true,
        classType: { select: { name: true } },
        branch: { select: { name: true } },
        _count: { select: { bookings: { where: { state: 'BOOKED' } } } },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    const bookedAtCancellation = await countBookingsAtCancellation(
      prisma,
      sessions,
    );
    return sessions.map((session) => ({
      sessionId: session.id,
      classTypeName: session.classType.name,
      branchName: session.branch.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      bookedCount: session._count.bookings,
      cancellation: toSessionCancellation(session, bookedAtCancellation),
    }));
  };
