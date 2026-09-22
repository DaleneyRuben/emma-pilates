import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

type UpcomingSessionFacts = {
  sessionId: string;
  branchId: string;
  classTypeName: string;
  trainerName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
};

export type UpcomingClientBooking =
  | ({ kind: 'booking'; bookingId: string } & UpcomingSessionFacts)
  | ({ kind: 'waitlist'; waitlistEntryId: string } & UpcomingSessionFacts);

type ListClientBookingsDependencies = {
  principal: AuthenticatedPrincipal;
  findUpcoming(input: {
    clientId: string;
    from: Date;
  }): Promise<UpcomingClientBooking[]>;
  now(): Date;
};

export const listClientBookings = async (
  dependencies: ListClientBookingsDependencies,
): Promise<UpcomingClientBooking[]> => {
  if (dependencies.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  return dependencies.findUpcoming({
    clientId: dependencies.principal.identity.clientId,
    from: dependencies.now(),
  });
};
