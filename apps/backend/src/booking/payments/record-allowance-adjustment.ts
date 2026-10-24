import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministrationError,
  requireAdministrator,
} from '../administration/administration-errors';
import type { AdjustmentReason } from './allowance-adjustment-copy';

// Courtesy and a class return are the Administrator's to make (decisions
// §4.3). Campaigns are the same person, but the bulk grant is BKM-015, and
// the gift and the invitation reward are applied by the system.
export type RecordedAdjustment = {
  id: string;
  classes: number;
  reason: AdjustmentReason;
};

const administratorReasons = ['courtesy', 'class_return'] as const;
export type AdministratorAdjustmentReason =
  (typeof administratorReasons)[number];

export class AllowanceAdjustmentError extends Error {
  readonly status = 400;

  constructor(readonly code: 'invalid_adjustment') {
    super(code);
    this.name = 'AllowanceAdjustmentError';
  }
}

export type RecordAdjustmentCommand = {
  clientId: string;
  classes: number;
  reason: AdministratorAdjustmentReason;
};

type Dependencies = {
  principal: AuthenticatedPrincipal;
  now: Date;
  findSubscription: (clientId: string) => Promise<{ id: string } | null>;
  record: (input: {
    subscriptionId: string;
    clientId: string;
    classes: number;
    reason: AdjustmentReason;
    authorAccountId: string;
    now: Date;
  }) => Promise<RecordedAdjustment>;
};

export const recordAdministratorAdjustment = async (
  command: RecordAdjustmentCommand,
  dependencies: Dependencies,
): Promise<RecordedAdjustment> => {
  const actor = requireAdministrator(dependencies.principal);
  if (!administratorReasons.includes(command.reason) || command.classes === 0) {
    throw new AllowanceAdjustmentError('invalid_adjustment');
  }
  const subscription = await dependencies.findSubscription(command.clientId);
  if (subscription === null) {
    throw new AdministrationError('client_not_found');
  }
  return dependencies.record({
    subscriptionId: subscription.id,
    clientId: command.clientId,
    classes: command.classes,
    reason: command.reason,
    authorAccountId: actor.accountId,
    now: dependencies.now,
  });
};
