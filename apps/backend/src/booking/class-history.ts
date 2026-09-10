import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './commands/create-booking';

type ClassHistoryDependencies = {
  findAttendedBookings(clientId: string): Promise<
    {
      bookingId: string;
      sessionId: string;
    }[]
  >;
};

export const listClassHistory = (
  principal: AuthenticatedPrincipal,
  dependencies: ClassHistoryDependencies,
): Promise<{ bookingId: string; sessionId: string }[]> => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  return dependencies.findAttendedBookings(principal.identity.clientId);
};
