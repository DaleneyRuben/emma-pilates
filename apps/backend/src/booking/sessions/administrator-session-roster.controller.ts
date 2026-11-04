import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { AdministratorSessionRoster } from './administrator-session-roster';

export type AdministratorSessionRosterHandler = (
  sessionId: string,
  principal: AuthenticatedPrincipal,
) => Promise<AdministratorSessionRoster>;

export class AdministratorSessionRosterController {
  constructor(
    private readonly loadRoster: AdministratorSessionRosterHandler,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  readonly read: (
    sessionId: string,
    authorization: string | undefined,
  ) => Promise<AdministratorSessionRoster> = () =>
    Promise.reject(new Error('not implemented'));
}
