import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './commands/create-booking';

type TrainerSessionRoster = {
  sessionId: string;
  trainerStaffMemberId: string;
  classTypeName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
  bookings: {
    bookingId: string;
    clientName: string;
    attendanceOutcome: 'attended' | 'no_show' | null;
  }[];
};

export type TrainerSessionRosterResult = Omit<
  TrainerSessionRoster,
  'trainerStaffMemberId'
>;

type LoadTrainerSessionRosterDependencies = {
  principal: AuthenticatedPrincipal;
  findRoster(sessionId: string): Promise<TrainerSessionRoster | null>;
};

export const loadTrainerSessionRoster = async (
  input: { sessionId: string },
  dependencies: LoadTrainerSessionRosterDependencies,
): Promise<TrainerSessionRosterResult> => {
  if (
    dependencies.principal.identity.kind !== 'staff' ||
    dependencies.principal.identity.role !== 'trainer'
  ) {
    throw new BookingAccessDeniedError();
  }

  const roster = await dependencies.findRoster(input.sessionId);
  if (
    roster === null ||
    roster.trainerStaffMemberId !==
      dependencies.principal.identity.staffMemberId
  ) {
    throw new BookingAccessDeniedError();
  }

  return {
    sessionId: roster.sessionId,
    classTypeName: roster.classTypeName,
    branchName: roster.branchName,
    startsAt: roster.startsAt,
    endsAt: roster.endsAt,
    bookings: roster.bookings,
  };
};
