import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministrationError,
  requireOperations,
} from '../administration/administration-errors';
import type { ContactAlertReason } from './first-90-days-alerts';

export type MarkContactedStore = {
  mark(input: {
    clientId: string;
    accountId: string;
    actorRole: 'administrator' | 'coordinator';
    occurredAt: Date;
  }): Promise<ContactAlertReason[]>;
};

export const markClientContacted = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: { now: () => Date; store: MarkContactedStore },
): Promise<void> => {
  const actor = requireOperations(principal);
  const reasons = await dependencies.store.mark({
    clientId: command.clientId,
    accountId: actor.accountId,
    actorRole: actor.role,
    occurredAt: dependencies.now(),
  });
  if (reasons.length === 0) {
    throw new AdministrationError('contact_alert_not_found');
  }
};
