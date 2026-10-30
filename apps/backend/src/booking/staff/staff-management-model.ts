import {
  auditActorOf,
  type AuditActor,
} from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

// Staff Accounts activate like invited Clients (ADR-0029): a 7-day Activation
// Link inside a 30-day pending window.
const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const pendingLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

export type StaffRoleName =
  'trainer' | 'nutritionist' | 'assistant' | 'administrator' | 'coordinator';

// Administrators and the Coordinator hold every Branch implicitly and carry no
// Branch rows (glossary «Staff Member», ADR-0102).
export const holdsEveryBranch = (role: StaffRoleName): boolean =>
  role === 'administrator' || role === 'coordinator';

export type StaffStatus = 'pending' | 'active' | 'deactivated';

export type StaffManagementErrorCode =
  | 'staff_access_denied'
  | 'staff_member_not_found'
  | 'email_in_use'
  | 'email_throttled'
  | 'invalid_branch_assignment'
  | 'trainer_has_upcoming_sessions'
  | 'last_administrator'
  | 'own_staff_member'
  | 'staff_member_deactivated'
  | 'staff_member_not_pending'
  | 'email_belongs_to_client'
  | 'email_unchanged';

export class StaffManagementError extends Error {
  constructor(
    readonly code: StaffManagementErrorCode,
    /** WEB-012 W6: the recipient wait of `email_throttled`, in seconds. */
    readonly retryAfterSeconds = 0,
  ) {
    super(code);
    this.name = 'StaffManagementError';
  }
}

export type StaffMemberRecord = {
  id: string;
  accountId: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRoleName;
  branchIds: string[];
  status: StaffStatus;
  activationExpiresAt: Date | null;
  /** WEB-012 W4: the create reopened this pending invitation. */
  invitationReopened?: boolean;
};

export type StaffAudit = {
  actionCode:
    | 'staff_member.created'
    | 'staff_member.activation_resent'
    | 'staff_member.role_changed'
    | 'staff_member.branches_changed'
    | 'staff_member.deactivated'
    | 'staff_member.email_corrected'
    | 'staff_member.invitation_cancelled'
    | 'staff_member.invitation_reopened';
  actorAccountId: string;
  actorRole: AuditActor['role'];
  impersonationId: string | null;
  targetAccountId: string;
  correlationId: string;
  metadata: Record<string, string | string[]> | null;
  occurredAt: Date;
};

export interface StaffManagementTransaction {
  // The live Account using the address, and whose it is (WEB-012 W2, W5).
  findAccountByEmail: (email: string) => Promise<{
    id: string;
    kind: 'client' | 'staff';
    staffMemberId: string | null;
    pending: boolean;
  } | null>;
  findStaffMember: (staffMemberId: string) => Promise<StaffMemberRecord | null>;
  // The subset of the given Branch ids that exist and are not archived.
  findUsableBranchIds: (branchIds: string[]) => Promise<string[]>;
  // Activated, non-disabled Administrator Accounts.
  countActiveAdministrators: () => Promise<number>;
  // Upcoming scheduled Sessions and still-effective Session Schedules the
  // Trainer leads, optionally only at the given Branches.
  countTrainerCommitments: (input: {
    staffMemberId: string;
    branchIds?: string[];
    now: Date;
  }) => Promise<number>;
  // Seconds until the activation recipient lane has room, 0 when it has.
  activationEmailWaitSeconds: (input: {
    email: string;
    now: Date;
  }) => Promise<number>;
  setAccountEmail: (input: {
    accountId: string;
    email: string;
  }) => Promise<void>;
  // Marks the pending Account and Staff Member removed (ADR-0086).
  removePendingStaffMember: (input: {
    accountId: string;
    staffMemberId: string;
    now: Date;
  }) => Promise<void>;
  // Creates the Staff Member, its Branch rows, and the pending Account, and
  // issues the Activation Link email under the recipient throttle.
  createPendingStaffMember: (input: {
    accountId: string;
    staffMemberId: string;
    name: string;
    email: string;
    phone: string | null;
    role: StaffRoleName;
    branchIds: string[];
    pendingExpiresAt: Date;
    activationExpiresAt: Date;
  }) => Promise<void>;
  reissueActivation: (input: {
    accountId: string;
    email: string;
    pendingExpiresAt: Date;
    activationExpiresAt: Date;
  }) => Promise<void>;
  setRole: (input: {
    staffMemberId: string;
    role: StaffRoleName;
  }) => Promise<void>;
  replaceBranches: (input: {
    staffMemberId: string;
    branchIds: string[];
  }) => Promise<void>;
  // NUT-002 D15 port.
  endNutritionistAvailability: (input: {
    staffMemberId: string;
    branchId?: string;
    actorAccountId: string;
    now: Date;
  }) => Promise<void>;
  // Disables the Account and revokes every Authentication Session (ADR-0030).
  disableAccount: (input: { accountId: string; now: Date }) => Promise<void>;
  recordAudit: (audit: StaffAudit) => Promise<void>;
}

export interface StaffManagementUnitOfWork {
  execute: <Result>(
    work: (transaction: StaffManagementTransaction) => Promise<Result>,
  ) => Promise<Result>;
}

export type StaffManagementDependencies = {
  unitOfWork: StaffManagementUnitOfWork;
  now: () => Date;
  newId: () => string;
};

// `accountId` is the acting Staff Member's own Account, for unaudited actor
// columns; `audit` is who the audit record names (ADR-0100).
export type Actor = {
  accountId: string;
  staffMemberId: string;
  audit: AuditActor;
  /** Decision 6: the Coordinator changes the Branches of Trainers only. */
  manages?: StaffRoleName;
};

// ADR-0102: the Coordinator reads Staff details for the schedule. Inviting,
// Role, and access changes stay with the Administrator. Decision 6 lets her
// assign a Trainer's Branches.
export const requireStaffReader = (principal: AuthenticatedPrincipal): void => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'administrator' &&
      principal.identity.role !== 'coordinator')
  ) {
    throw new StaffManagementError('staff_access_denied');
  }
};

// Decision 6: assigning a Trainer's Branches is an operation, not a money
// decision, so the Coordinator may; every other Role's stay with the
// Administrator.
export const requireBranchAssigner = (
  principal: AuthenticatedPrincipal,
): Actor => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'administrator' &&
      principal.identity.role !== 'coordinator')
  ) {
    throw new StaffManagementError('staff_access_denied');
  }
  return {
    accountId: principal.accountId,
    staffMemberId: principal.identity.staffMemberId,
    audit: auditActorOf(principal),
    ...(principal.identity.role === 'coordinator'
      ? { manages: 'trainer' }
      : {}),
  };
};

export const requireAdministrator = (
  principal: AuthenticatedPrincipal,
): Actor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new StaffManagementError('staff_access_denied');
  }
  return {
    accountId: principal.accountId,
    staffMemberId: principal.identity.staffMemberId,
    audit: auditActorOf(principal),
  };
};

// W6: a full recipient lane refuses with the wait the server computed.
export const requireActivationEmailRoom = async (
  transaction: StaffManagementTransaction,
  input: { email: string; now: Date },
): Promise<void> => {
  const wait = await transaction.activationEmailWaitSeconds(input);
  if (wait > 0) throw new StaffManagementError('email_throttled', wait);
};

export const unique = (values: string[]): string[] => [...new Set(values)];

// Roles holding every Branch carry no Branch rows; every other Role needs at
// least one usable Branch.
export const resolveBranches = async (
  transaction: StaffManagementTransaction,
  role: StaffRoleName,
  branchIds: string[] | undefined,
): Promise<string[]> => {
  if (holdsEveryBranch(role)) return [];
  const requested = unique(branchIds ?? []);
  if (requested.length === 0) {
    throw new StaffManagementError('invalid_branch_assignment');
  }
  const usable = await transaction.findUsableBranchIds(requested);
  if (usable.length !== requested.length) {
    throw new StaffManagementError('invalid_branch_assignment');
  }
  return requested;
};

export const requireManageable = async (
  transaction: StaffManagementTransaction,
  actor: Actor,
  staffMemberId: string,
): Promise<StaffMemberRecord> => {
  const member = await transaction.findStaffMember(staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  if (actor.manages !== undefined && member.role !== actor.manages) {
    throw new StaffManagementError('staff_access_denied');
  }
  if (member.id === actor.staffMemberId) {
    throw new StaffManagementError('own_staff_member');
  }
  if (member.status === 'deactivated') {
    throw new StaffManagementError('staff_member_deactivated');
  }
  return member;
};

export const requireNotLastAdministrator = async (
  transaction: StaffManagementTransaction,
  member: StaffMemberRecord,
): Promise<void> => {
  if (
    member.role === 'administrator' &&
    member.status === 'active' &&
    (await transaction.countActiveAdministrators()) <= 1
  ) {
    throw new StaffManagementError('last_administrator');
  }
};

export const requireNoTrainerCommitments = async (
  transaction: StaffManagementTransaction,
  input: { staffMemberId: string; branchIds?: string[]; now: Date },
): Promise<void> => {
  if ((await transaction.countTrainerCommitments(input)) > 0) {
    throw new StaffManagementError('trainer_has_upcoming_sessions');
  }
};

export const activationWindow = (now: Date) => ({
  pendingExpiresAt: new Date(now.getTime() + pendingLifetimeMilliseconds),
  activationExpiresAt: new Date(now.getTime() + activationLifetimeMilliseconds),
});

export const audit = (
  dependencies: StaffManagementDependencies,
  actor: Actor,
  input: Pick<StaffAudit, 'actionCode' | 'targetAccountId' | 'occurredAt'> & {
    metadata?: StaffAudit['metadata'];
  },
): StaffAudit => ({
  actionCode: input.actionCode,
  actorAccountId: actor.audit.accountId,
  actorRole: actor.audit.role,
  impersonationId: actor.audit.impersonationId,
  targetAccountId: input.targetAccountId,
  correlationId: dependencies.newId(),
  metadata: input.metadata ?? null,
  occurredAt: input.occurredAt,
});

export const reread = async (
  transaction: StaffManagementTransaction,
  staffMemberId: string,
): Promise<StaffMemberRecord> => {
  const member = await transaction.findStaffMember(staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  return member;
};
