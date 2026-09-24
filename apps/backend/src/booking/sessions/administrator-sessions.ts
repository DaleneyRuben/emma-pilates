import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

export type AdministratorSessionQuery = {
  from: Date;
  until: Date;
  limit: number;
  branchId?: string;
};

// API-002: Administrators act on the schedule across every Branch, so their
// Session search is not scoped to one ("Todas las sucursales").
export const listAdministratorSessions = async <Session>(
  query: AdministratorSessionQuery,
  principal: AuthenticatedPrincipal,
  read: (query: AdministratorSessionQuery) => Promise<Session[]>,
): Promise<Session[]> => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new BookingAccessDeniedError();
  }
  return read(query);
};
