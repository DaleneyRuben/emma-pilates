import type { PrismaClient } from '../generated/prisma/client';
import type { TrainerSessionRoster } from './trainer-session-roster';

const outcomes = { ATTENDED: 'attended', NO_SHOW: 'no_show' } as const;

// The Trainer's class roster and attendance: the booked Clients in booking
// order with the outcome she recorded, if any.
export const findTrainerSessionRoster =
  (prisma: PrismaClient) =>
  async (sessionId: string): Promise<TrainerSessionRoster | null> => {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        trainerStaffMemberId: true,
        startsAt: true,
        endsAt: true,
        classType: { select: { name: true } },
        branch: { select: { name: true } },
        bookings: {
          where: { state: 'BOOKED' },
          select: {
            id: true,
            client: { select: { name: true } },
            attendanceRecord: { select: { outcome: true } },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (session === null) return null;

    return {
      sessionId: session.id,
      trainerStaffMemberId: session.trainerStaffMemberId,
      classTypeName: session.classType.name,
      branchName: session.branch.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      bookings: session.bookings.map((booking) => ({
        bookingId: booking.id,
        clientName: booking.client.name,
        attendanceOutcome:
          booking.attendanceRecord === null
            ? null
            : outcomes[booking.attendanceRecord.outcome],
      })),
    };
  };
