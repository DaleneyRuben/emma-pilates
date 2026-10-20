import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

export type AccountClosureErrorCode =
  | 'closure_access_denied'
  | 'client_not_found'
  | 'closure_payment_pending'
  | 'current_password_incorrect';

export class AccountClosureError extends Error {
  readonly status: number;

  constructor(readonly code: AccountClosureErrorCode) {
    super(code);
    this.name = 'AccountClosureError';
    this.status = statuses[code];
  }
}

export type ClosureSummary = {
  closedWaitlistEntries: number;
  cancelledBookings: number;
  cancelledEvaluations: number;
  forfeitedClasses: number;
  forfeitedCreditCentavos: number;
};

type Actor = { accountId: string; occurredAt: Date };

export type ClosureTransaction = {
  lockClient: (
    clientId: string,
  ) => Promise<{ clientId: string; accountId: string } | null>;
  hasPendingTransferPayment: (clientId: string) => Promise<boolean>;
  closeWaitlistEntries: (
    input: Actor & { clientId: string },
  ) => Promise<number>;
  cancelFutureBookings: (
    input: Actor & { clientId: string },
  ) => Promise<{ count: number; sessionIds: string[] }>;
  cancelFutureEvaluations: (
    input: Actor & { clientId: string },
  ) => Promise<number>;
  releaseOpenPurchaseIntent: (
    input: Actor & { clientId: string },
  ) => Promise<boolean>;
  endSubscription: (
    input: Actor & { clientId: string },
  ) => Promise<{ forfeitedClasses: number } | null>;
  forfeitCredit: (
    input: Actor & { clientId: string; correlationId: string },
  ) => Promise<number>;
  promoteWaitlists: (sessionIds: string[], now: Date) => Promise<void>;
  // Ends the Client's open Promotions Consent and answers when it was given.
  endPromotionsConsent: (input: {
    clientId: string;
    occurredAt: Date;
  }) => Promise<Date | null>;
  keepPromotionContact: (input: {
    clientId: string;
    accountId: string;
    consentedAt: Date;
  }) => Promise<void>;
  closeAccount: (input: {
    accountId: string;
    occurredAt: Date;
  }) => Promise<void>;
  removeClient: (input: {
    clientId: string;
    occurredAt: Date;
  }) => Promise<void>;
  recordAudit: (input: {
    actorAccountId: string;
    actorRole: 'administrator' | null;
    targetAccountId: string;
    targetClientId: string;
    correlationId: string;
    occurredAt: Date;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
};

export type ClosureDependencies = {
  unitOfWork: {
    execute: <Result>(
      work: (transaction: ClosureTransaction) => Promise<Result>,
    ) => Promise<Result>;
  };
  verifyPassword: (accountId: string, password: string) => Promise<boolean>;
  now: () => Date;
  newId: () => string;
};

const statuses: Record<AccountClosureErrorCode, number> = {
  closure_access_denied: 403,
  client_not_found: 404,
  closure_payment_pending: 409,
  current_password_incorrect: 400,
};

type Requester = {
  initiatedBy: 'client' | 'administrator';
  actorRole: 'administrator' | null;
};

// G2: a Client closes only their own Account (re-entering the password); an
// Administrator closes any Client's. Staff Members are never closed here.
const requesterOf = (
  clientId: string,
  principal: AuthenticatedPrincipal,
): Requester => {
  const { identity } = principal;
  if (identity.kind === 'client' && identity.clientId === clientId) {
    return { initiatedBy: 'client', actorRole: null };
  }
  if (identity.kind === 'staff' && identity.role === 'administrator') {
    return { initiatedBy: 'administrator', actorRole: 'administrator' };
  }
  throw new AccountClosureError('closure_access_denied');
};

export type CloseClientAccountCommand = {
  clientId: string;
  password?: string;
  keepPromotions?: boolean;
};

export const closeClientAccount = async (
  command: CloseClientAccountCommand,
  principal: AuthenticatedPrincipal,
  dependencies: ClosureDependencies,
): Promise<ClosureSummary> => {
  const requester = requesterOf(command.clientId, principal);
  if (
    requester.initiatedBy === 'client' &&
    !(await dependencies.verifyPassword(
      principal.accountId,
      command.password ?? '',
    ))
  ) {
    throw new AccountClosureError('current_password_incorrect');
  }

  const now = dependencies.now();
  const correlationId = dependencies.newId();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const target = await transaction.lockClient(command.clientId);
    if (target === null) throw new AccountClosureError('client_not_found');
    // G3: no Payment decision may land on a closed Account.
    if (await transaction.hasPendingTransferPayment(target.clientId)) {
      throw new AccountClosureError('closure_payment_pending');
    }

    const step = {
      clientId: target.clientId,
      accountId: principal.accountId,
      occurredAt: now,
    };
    const closedWaitlistEntries = await transaction.closeWaitlistEntries(step);
    const bookings = await transaction.cancelFutureBookings(step);
    const cancelledEvaluations =
      await transaction.cancelFutureEvaluations(step);
    // An open Purchase Intent holds Credit; release it before the forfeiture.
    await transaction.releaseOpenPurchaseIntent(step);
    const subscription = await transaction.endSubscription(step);
    const forfeitedCreditCentavos = await transaction.forfeitCredit({
      ...step,
      correlationId,
    });
    // The Client's own Bookings are gone, so freed seats reach the Waitlist.
    await transaction.promoteWaitlists(bookings.sessionIds, now);
    const liveConsentAt = await transaction.endPromotionsConsent({
      clientId: target.clientId,
      occurredAt: now,
    });
    // Only the Client can consent, and the contact is copied before the
    // closure erases it (ADR-0097); a live consent keeps its first time
    // (ADR-0098).
    const keptPromotionContact =
      requester.initiatedBy === 'client' && command.keepPromotions === true;
    if (keptPromotionContact) {
      await transaction.keepPromotionContact({
        clientId: target.clientId,
        accountId: target.accountId,
        consentedAt: liveConsentAt ?? now,
      });
    }
    await transaction.closeAccount({
      accountId: target.accountId,
      occurredAt: now,
    });
    await transaction.removeClient({
      clientId: target.clientId,
      occurredAt: now,
    });

    const summary: ClosureSummary = {
      closedWaitlistEntries,
      cancelledBookings: bookings.count,
      cancelledEvaluations,
      forfeitedClasses: subscription?.forfeitedClasses ?? 0,
      forfeitedCreditCentavos,
    };
    await transaction.recordAudit({
      actorAccountId: principal.accountId,
      actorRole: requester.actorRole,
      targetAccountId: target.accountId,
      targetClientId: target.clientId,
      correlationId,
      occurredAt: now,
      metadata: {
        initiatedBy: requester.initiatedBy,
        ...summary,
        keptPromotionContact,
        endedPromotionsConsent: liveConsentAt !== null,
      },
    });
    return summary;
  });
};
