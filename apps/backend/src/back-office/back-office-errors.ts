import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';

export type BackOfficeErrorCode =
  | 'back_office_access_denied'
  | 'branch_not_found'
  | 'branch_archived'
  | 'supply_not_found'
  | 'supply_name_taken'
  | 'supply_archived'
  | 'insufficient_stock'
  | 'invalid_back_office_value'
  | 'date_in_future'
  | 'staff_member_not_found'
  | 'salary_payment_not_found'
  | 'pay_statement_not_found'
  | 'expense_not_found'
  | 'expense_category_not_found'
  | 'expense_category_name_taken'
  | 'expense_category_in_use'
  | 'idempotency_key_reused';

const statuses: Record<BackOfficeErrorCode, number> = {
  back_office_access_denied: 403,
  branch_not_found: 404,
  branch_archived: 409,
  supply_not_found: 404,
  supply_name_taken: 409,
  supply_archived: 409,
  insufficient_stock: 409,
  invalid_back_office_value: 400,
  date_in_future: 400,
  staff_member_not_found: 404,
  salary_payment_not_found: 404,
  pay_statement_not_found: 404,
  expense_not_found: 404,
  expense_category_not_found: 404,
  expense_category_name_taken: 409,
  expense_category_in_use: 409,
  idempotency_key_reused: 409,
};

export class BackOfficeError extends Error {
  readonly status: number;

  constructor(readonly code: BackOfficeErrorCode) {
    super(code);
    this.name = 'BackOfficeError';
    this.status = statuses[code];
  }
}

export type BackOfficeActor = { accountId: string };

// Back Office is admin-only (CONTEXT-MAP, BKO-001 D2).
export const requireAdministrator = (
  principal: AuthenticatedPrincipal,
): BackOfficeActor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new BackOfficeError('back_office_access_denied');
  }
  return { accountId: principal.accountId };
};

// Constraint names arrive only in the driver cause (see NUT-002 notes).
export const databaseCause = (error: unknown): string => {
  const meta = (
    error as { meta?: { driverAdapterError?: { cause?: unknown } } }
  )?.meta;
  const cause = meta?.driverAdapterError?.cause as
    { originalMessage?: string } | undefined;
  return `${cause?.originalMessage ?? ''} ${JSON.stringify(cause ?? {})} ${
    error instanceof Error ? error.message : ''
  }`;
};
