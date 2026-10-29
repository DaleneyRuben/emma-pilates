import type { NewNotification } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { PaymentRuleError } from './payment-errors';

export class FreezeAccessDeniedError extends Error {
  readonly code = 'freeze_access_denied';

  constructor() {
    super('Freeze access is denied');
    this.name = 'FreezeAccessDeniedError';
  }
}

type RequestedFreeze = {
  id: string;
  clientAccountId: string;
  subscriptionId: string;
  state: 'requested' | 'approved' | 'refused';
  endsOn: Date;
};

type DecideFreezeDependencies = {
  principal: AuthenticatedPrincipal;
  loadFreeze(freezeId: string): Promise<RequestedFreeze | null>;
  approve(input: {
    freezeId: string;
    decidedByAccountId: string;
    decidedAt: Date;
  }): Promise<void>;
  refuse(input: {
    freezeId: string;
    decidedByAccountId: string;
    decidedAt: Date;
  }): Promise<void>;
  record(notification: NewNotification): Promise<void>;
  now(): Date;
};

const requireAdministrator = (principal: AuthenticatedPrincipal): void => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new FreezeAccessDeniedError();
  }
};

export const decideFreeze = async (
  command: { freezeId: string; decision: 'approved' | 'refused' },
  dependencies: DecideFreezeDependencies,
): Promise<{ state: 'approved' | 'refused' }> => {
  requireAdministrator(dependencies.principal);
  const freeze = await dependencies.loadFreeze(command.freezeId);
  if (freeze === null) throw new FreezeAccessDeniedError();
  if (freeze.state !== 'requested') {
    throw new PaymentRuleError(
      'freeze_already_decided',
      'Este congelamiento ya fue decidido.',
    );
  }
  const decidedAt = dependencies.now();
  const input = {
    freezeId: freeze.id,
    decidedByAccountId: dependencies.principal.accountId,
    decidedAt,
  };
  if (command.decision === 'approved') await dependencies.approve(input);
  else await dependencies.refuse(input);

  const approved = command.decision === 'approved';
  await dependencies.record({
    accountId: freeze.clientAccountId,
    category: 'subscription_payment',
    type: approved ? 'freeze_approved' : 'freeze_refused',
    businessEventKey: `freeze-decided:${freeze.id}`,
    title: approved ? 'Congelamiento aprobado' : 'Congelamiento rechazado',
    message: approved
      ? `Tu plan está congelado hasta el ${freeze.endsOn.toISOString().slice(0, 10)}.`
      : 'Tu solicitud de congelamiento fue rechazada.',
    destination: { type: 'subscription', id: freeze.subscriptionId },
    occurredAt: decidedAt,
  });
  return { state: command.decision };
};
