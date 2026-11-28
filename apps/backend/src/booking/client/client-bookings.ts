import type { StaffPhotoRef } from '../staff/photo/staff-photo-of';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

type UpcomingSessionFacts = {
  sessionId: string;
  branchId: string;
  classTypeName: string;
  trainerName: string;
  trainerPhoto: StaffPhotoRef;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  /** Booked places, hers included. */
  bookedCount: number;
  /** Who else is coming, in booking order, by initials only. */
  attendeeInitials: string[];
};

export type UpcomingClientBooking =
  | ({
      kind: 'booking';
      bookingId: string;
      /** The Subscription the Booking consumed. */
      subscriptionId: string;
    } & UpcomingSessionFacts)
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
