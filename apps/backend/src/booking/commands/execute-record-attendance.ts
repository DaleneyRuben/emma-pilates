import type { Prisma } from '../../generated/prisma/client';
import { AttendanceOutcome, BookingState } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { recordAttendanceCorrections } from './attendance-audit';
import { recordAttendance } from './record-attendance';

export async function executeRecordAttendance(
  transaction: Prisma.TransactionClient,
  command: {
    sessionId: string;
    outcomes: { bookingId: string; outcome: 'attended' | 'no_show' }[];
  },
  principal: AuthenticatedPrincipal,
  now: () => Date,
): Promise<void> {
  await recordAttendance(command, {
    principal,
    loadSession: async (sessionId) => {
      const session = await transaction.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          branchId: true,
          trainerStaffMemberId: true,
          endsAt: true,
          state: true,
        },
      });
      return session === null
        ? null
        : {
            ...session,
            state: session.state.toLowerCase() as 'scheduled' | 'cancelled',
          };
    },
    loadBookedIds: async (sessionId) =>
      (
        await transaction.booking.findMany({
          where: { sessionId, state: BookingState.BOOKED },
          select: { id: true },
        })
      ).map(({ id }) => id),
    save: async ({ sessionId, branchId, outcomes, recordedByAccountId }) => {
      await recordAttendanceCorrections(transaction, {
        sessionId,
        branchId,
        outcomes,
        principal,
        occurredAt: now(),
      });
      await Promise.all(
        outcomes.map(({ bookingId, outcome }) =>
          transaction.attendanceRecord.upsert({
            where: { bookingId },
            create: {
              bookingId,
              outcome:
                outcome === 'attended'
                  ? AttendanceOutcome.ATTENDED
                  : AttendanceOutcome.NO_SHOW,
              recordedByAccountId,
              recordedAt: new Date(),
            },
            update: {
              outcome:
                outcome === 'attended'
                  ? AttendanceOutcome.ATTENDED
                  : AttendanceOutcome.NO_SHOW,
              recordedByAccountId,
            },
          }),
        ),
      );
    },
    now,
  });
}
