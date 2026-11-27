import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  requireAssistant,
  requirePendingAccount,
  type ClientInvitationDependencies,
} from './client-invitations';

/**
 * Walkthrough n.º 2 (RW-clientas-ficha-correo-rebotado): whether the email
 * sent to a pending Client hard-bounced, so the Clientas file says «El correo
 * rebotó» instead of «Pendiente de activación». It covers both a staff
 * invitation and her own registration.
 */
export const readClientEmailDelivery = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<{ clientId: string; email: string; bounced: boolean }> => {
  requireAssistant(principal);
  return dependencies.unitOfWork.execute(async (transaction) => {
    const pending = await requirePendingAccount(transaction, command.clientId);
    return {
      clientId: pending.clientId,
      email: pending.email,
      bounced: await transaction.isEmailBounced(pending.email),
    };
  });
};
