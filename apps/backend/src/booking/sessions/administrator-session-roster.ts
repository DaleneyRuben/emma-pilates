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

export const loadAdministratorSessionRoster: (
  sessionId: string,
  principal: AuthenticatedPrincipal,
  findRoster: FindAdministratorSessionRoster,
) => Promise<AdministratorSessionRoster> = () =>
  Promise.reject(new Error('not implemented'));
