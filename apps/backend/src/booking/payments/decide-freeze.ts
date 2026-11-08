import type { NewNotification } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { runsOperations } from '../staff-access';
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
  state: 'requested' | 'approved' | 'refused' | 'withdrawn';
  startsOn: Date;
  endsOn: Date;
  /** The plan's end before this Freeze moves it. */
  planEndsOn: Date;
};

const months = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const dayMilliseconds = 86_400_000;
const dayMonth = (date: Date) =>
  `${date.getUTCDate()} de ${months[date.getUTCMonth()]}`;

// Walkthrough finding 53: «del 1 al 10 de noviembre», or both months when
// the Freeze crosses one, and the plan's new end; never an ISO date.
const approvalMessage = (freeze: RequestedFreeze): string => {
  const days =
    Math.round(
      (freeze.endsOn.getTime() - freeze.startsOn.getTime()) / dayMilliseconds,
    ) + 1;
  const newEnd = new Date(freeze.planEndsOn.getTime() + days * dayMilliseconds);
  const range =
    freeze.startsOn.getUTCMonth() === freeze.endsOn.getUTCMonth()
      ? `del ${freeze.startsOn.getUTCDate()} al ${dayMonth(freeze.endsOn)}`
      : `del ${dayMonth(freeze.startsOn)} al ${dayMonth(freeze.endsOn)}`;
  return `Aprobamos tu congelamiento ${range}. Tu plan ahora vence el ${dayMonth(newEnd)}.`;
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

// A Freeze moves no money: the Administrator and the Coordinator decide it
// (ADR-0108).
const requireOperations = (principal: AuthenticatedPrincipal): void => {
  if (!runsOperations(principal)) throw new FreezeAccessDeniedError();
};

export const decideFreeze = async (
  command: { freezeId: string; decision: 'approved' | 'refused' },
  dependencies: DecideFreezeDependencies,
): Promise<{ state: 'approved' | 'refused' }> => {
  requireOperations(dependencies.principal);
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
      ? approvalMessage(freeze)
      : 'Tu solicitud de congelamiento fue rechazada.',
    destination: { type: 'subscription', id: freeze.subscriptionId },
    occurredAt: decidedAt,
  });
  return { state: command.decision };
};
