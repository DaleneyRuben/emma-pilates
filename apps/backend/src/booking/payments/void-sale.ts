import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../administration/administration-errors';

export type VoidedSale = {
  paymentId: string;
  state: 'voided';
  voidReason: string;
  cancelledBookings: number;
};

export class VoidSaleError extends Error {
  readonly status: number;

  constructor(
    readonly code:
      | 'void_reason_required'
      | 'payment_already_voided'
      | 'payment_not_found'
      | 'payment_not_voidable',
  ) {
    super(code);
    this.name = 'VoidSaleError';
    this.status =
      code === 'void_reason_required'
        ? 400
        : code === 'payment_not_found'
          ? 404
          : 409;
  }
}

export const voidReasonMaxLength = 300;

export const normalizeVoidReason = (reason: string): string => {
  const trimmed = reason.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0 || trimmed.length > voidReasonMaxLength) {
    throw new VoidSaleError('void_reason_required');
  }
  return trimmed;
};

type Dependencies = {
  principal: AuthenticatedPrincipal;
  now: Date;
  voidPayment: (input: {
    paymentId: string;
    reason: string;
    actorAccountId: string;
    now: Date;
  }) => Promise<VoidedSale>;
};

// A void corrects a mistake. Only an Administrator can do it, and she must
// say why (decisions §4.3, booking ADR-0012).
export const voidSale = async (
  command: { paymentId: string; reason: string },
  dependencies: Dependencies,
): Promise<VoidedSale> => {
  const actor = requireAdministrator(dependencies.principal);
  const reason = normalizeVoidReason(command.reason);
  return dependencies.voidPayment({
    paymentId: command.paymentId,
    reason,
    actorAccountId: actor.accountId,
    now: dependencies.now,
  });
};
