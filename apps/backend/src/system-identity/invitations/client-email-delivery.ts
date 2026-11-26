import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import type { ClientInvitationDependencies } from './client-invitations';

export const readClientEmailDelivery = (
  _command: { clientId: string },
  _principal: AuthenticatedPrincipal,
  _dependencies: ClientInvitationDependencies,
): Promise<{ clientId: string; email: string; bounced: boolean }> =>
  Promise.reject(new Error('not implemented'));
