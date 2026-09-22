import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './commands/create-booking';

export type ClassHistoryEntry = {
  bookingId: string;
  sessionId: string;
  classTypeName: string;
  trainerName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
};

type ClassHistoryDependencies = {
  findAttendedBookings(clientId: string): Promise<ClassHistoryEntry[]>;
};

export const listClassHistory = (
  principal: AuthenticatedPrincipal,
  dependencies: ClassHistoryDependencies,
): Promise<ClassHistoryEntry[]> => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  return dependencies.findAttendedBookings(principal.identity.clientId);
};
