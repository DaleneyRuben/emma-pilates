import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

export type AdministrationErrorCode =
  | 'administration_access_denied'
  | 'branch_not_found'
  | 'class_type_not_found'
  | 'plan_not_found'
  | 'session_schedule_not_found'
  | 'session_not_found'
  | 'evaluation_not_found'
  | 'client_not_found'
  | 'contact_alert_not_found'
  | 'client_name_required'
  | 'promotion_contact_not_found'
  | 'branch_in_use'
  | 'class_type_in_use'
  | 'class_type_name_taken'
  | 'invalid_catalog_value'
  | 'invalid_schedule'
  | 'trainer_not_assignable'
  | 'session_overlap'
  | 'schedule_rows_overlap'
  | 'session_not_editable'
  | 'capacity_below_bookings'
  | 'effective_date_invalid';

const statuses: Record<AdministrationErrorCode, number> = {
  administration_access_denied: 403,
  branch_not_found: 404,
  class_type_not_found: 404,
  plan_not_found: 404,
  session_schedule_not_found: 404,
  session_not_found: 404,
  evaluation_not_found: 404,
  client_not_found: 404,
  contact_alert_not_found: 404,
  client_name_required: 400,
  promotion_contact_not_found: 404,
  branch_in_use: 409,
  class_type_in_use: 409,
  class_type_name_taken: 409,
  invalid_catalog_value: 400,
  invalid_schedule: 400,
  trainer_not_assignable: 409,
  session_overlap: 409,
  schedule_rows_overlap: 409,
  session_not_editable: 409,
  capacity_below_bookings: 409,
  effective_date_invalid: 400,
};

export class AdministrationError extends Error {
  readonly status: number;

  constructor(
    readonly code: AdministrationErrorCode,
    detail?: string,
  ) {
    super(detail ?? code);
    this.name = 'AdministrationError';
    this.status = statuses[code];
  }
}

export type AdministratorActor = {
  accountId: string;
  staffMemberId: string;
  impersonationId?: string | null;
};

export const requireAdministrator = (
  principal: AuthenticatedPrincipal,
): AdministratorActor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new AdministrationError('administration_access_denied');
  }
  const actor = auditActorOf(principal);
  return {
    accountId: actor.accountId,
    staffMemberId: principal.identity.staffMemberId,
    impersonationId: actor.impersonationId,
  };
};

export type OperationsActor = AdministratorActor & {
  role: 'administrator' | 'coordinator';
};

// ADR-0102: the studio's operation without money, for the Administrator and
// the Coordinator. Every money decision keeps requireAdministrator.
export const requireOperations = (
  principal: AuthenticatedPrincipal,
): OperationsActor => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'administrator' &&
      principal.identity.role !== 'coordinator')
  ) {
    throw new AdministrationError('administration_access_denied');
  }
  const actor = auditActorOf(principal);
  return {
    accountId: actor.accountId,
    staffMemberId: principal.identity.staffMemberId,
    role: principal.identity.role,
    impersonationId: actor.impersonationId,
  };
};

// The audit actor Role of a schedule or catalog change (ADR-0055, ADR-0102).
export const auditRoleOf = (
  actor: AdministratorActor | OperationsActor,
): 'ADMINISTRATOR' | 'COORDINATOR' =>
  'role' in actor && actor.role === 'coordinator'
    ? 'COORDINATOR'
    : 'ADMINISTRATOR';

// Constraint names arrive only in the driver cause (see NUT-002 notes).
export const databaseCause = (error: unknown): string => {
  const meta = (
    error as { meta?: { driverAdapterError?: { cause?: unknown } } }
  )?.meta;
  const cause = meta?.driverAdapterError?.cause as
    { originalMessage?: string; constraint?: { index?: string } } | undefined;
  return `${cause?.originalMessage ?? ''} ${JSON.stringify(cause ?? {})} ${
    error instanceof Error ? error.message : ''
  }`;
};
