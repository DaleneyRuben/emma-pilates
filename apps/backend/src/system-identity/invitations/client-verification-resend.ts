import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  audit,
  ClientInvitationNotFoundError,
  issueLink,
  requireAssistant,
  requirePendingAccount,
  requireThrottleRoom,
  type ClientInvitationDependencies,
} from './client-invitations';

// ADR-0029: a self-registered pending Account keeps its 24-hour verification
// link and its 7-day pending window; a new link restarts both.
const verificationLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

/**
 * S05 «Enviar enlace de verificación»: the Assistant sends a Client who
 * registered herself a new verification link, without changing her name,
 * email, or password. Older verification links stop working.
 */
export const sendClientVerification = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<{ clientId: string; email: string }> => {
  const actor = requireAssistant(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const pending = await requirePendingAccount(transaction, command.clientId);
    if (pending.pendingFlow !== 'self_registration') {
      throw new ClientInvitationNotFoundError();
    }

    await requireThrottleRoom(transaction, {
      email: pending.email,
      purpose: 'verification',
      now,
    });
    const link = issueLink(dependencies, now);
    await transaction.replaceSelfRegistrationVerification({
      accountId: pending.accountId,
      pendingExpiresAt: new Date(
        now.getTime() + pendingRegistrationLifetimeMilliseconds,
      ),
      verificationToken: link.stored(verificationLifetimeMilliseconds),
    });
    await link.send(transaction, {
      accountId: pending.accountId,
      email: pending.email,
      purpose: 'verification',
    });
    await transaction.recordAudit(
      audit(actor, dependencies, {
        actionCode: 'client_invitation.verification_sent',
        targetAccountId: pending.accountId,
        occurredAt: now,
      }),
    );

    return { clientId: pending.clientId, email: pending.email };
  });
};
