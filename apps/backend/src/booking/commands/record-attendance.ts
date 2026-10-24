import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type AttendanceOutcome = 'attended' | 'no_show';

type RecordAttendanceDependencies = {
  principal: AuthenticatedPrincipal;
  loadSession(sessionId: string): Promise<{
    id: string;
    branchId: string;
    trainerStaffMemberId: string;
    endsAt: Date;
    state: 'scheduled' | 'cancelled';
  } | null>;
  loadBookedIds(sessionId: string): Promise<string[]>;
  save(input: {
    sessionId: string;
    branchId: string;
    outcomes: { bookingId: string; outcome: AttendanceOutcome }[];
    recordedByAccountId: string;
  }): Promise<void>;
  now(): Date;
};

export const recordAttendance = async (
  command: {
    sessionId: string;
    outcomes: { bookingId: string; outcome: AttendanceOutcome }[];
  },
  dependencies: RecordAttendanceDependencies,
): Promise<void> => {
  const session = await dependencies.loadSession(command.sessionId);
  if (
    session === null ||
    session.state !== 'scheduled' ||
    session.endsAt > dependencies.now() ||
    dependencies.principal.identity.kind !== 'staff' ||
    dependencies.principal.identity.role !== 'trainer' ||
    dependencies.principal.identity.staffMemberId !==
      session.trainerStaffMemberId
  ) {
    throw new BookingAccessDeniedError();
  }

  const bookedIds = await dependencies.loadBookedIds(session.id);
  const outcomeIds = command.outcomes.map(({ bookingId }) => bookingId);
  if (
    outcomeIds.length !== bookedIds.length ||
    new Set(outcomeIds).size !== outcomeIds.length ||
    outcomeIds.some((id) => !bookedIds.includes(id))
  ) {
    throw new Error('Attendance roster is incomplete');
  }

  await dependencies.save({
    sessionId: session.id,
    branchId: session.branchId,
    outcomes: command.outcomes,
    recordedByAccountId: dependencies.principal.accountId,
  });
};
