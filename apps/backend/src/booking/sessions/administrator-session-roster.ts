import { AdministrationError } from '../administration/administration-errors';
import { runsOperations } from '../staff-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

export type AdministratorSessionRoster = {
  sessionId: string;
  bookings: {
    bookingId: string;
    clientId: string;
    clientName: string;
    attendanceOutcome: 'attended' | 'no_show' | null;
  }[];
  waitlist: {
    waitlistEntryId: string;
    clientId: string;
    clientName: string;
    position: number;
  }[];
};

export type FindAdministratorSessionRoster = (
  sessionId: string,
) => Promise<AdministratorSessionRoster | null>;

// WEB-039 / ADR-0108: Horario's class panel shows who booked a Session and
// who waits for it to the people who run the schedule. Names only: no plan,
// no amount.
export const loadAdministratorSessionRoster = async (
  sessionId: string,
  principal: AuthenticatedPrincipal,
  findRoster: FindAdministratorSessionRoster,
): Promise<AdministratorSessionRoster> => {
  if (!runsOperations(principal)) {
    throw new AdministrationError('administration_access_denied');
  }
  const roster = await findRoster(sessionId);
  if (roster === null) throw new AdministrationError('session_not_found');
  return roster;
};
