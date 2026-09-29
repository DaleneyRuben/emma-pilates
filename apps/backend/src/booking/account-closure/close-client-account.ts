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
    this.status = 500;
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

export const closeClientAccount = (
  command: { clientId: string; password?: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClosureDependencies,
): Promise<ClosureSummary> =>
  Promise.reject(
    new Error(`not implemented ${[command, principal, dependencies].length}`),
  );
