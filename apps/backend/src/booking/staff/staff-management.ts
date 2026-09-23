import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

// Staff Accounts activate like invited Clients (ADR-0029): a 7-day Activation
// Link inside a 30-day pending window.
const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const pendingLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

export type StaffRoleName =
  'trainer' | 'nutritionist' | 'assistant' | 'administrator';

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
  | 'staff_member_not_pending';

export class StaffManagementError extends Error {
  constructor(readonly code: StaffManagementErrorCode) {
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
};

export type StaffAudit = {
  actionCode:
    | 'staff_member.created'
    | 'staff_member.activation_resent'
    | 'staff_member.role_changed'
    | 'staff_member.branches_changed'
    | 'staff_member.deactivated';
  actorAccountId: string;
  targetAccountId: string;
  correlationId: string;
  metadata: Record<string, string | string[]> | null;
  occurredAt: Date;
};

export interface StaffManagementTransaction {
  findAccountByEmail: (email: string) => Promise<{ id: string } | null>;
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
  canIssueActivationEmail: (input: {
    email: string;
    now: Date;
  }) => Promise<boolean>;
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

type Actor = { accountId: string; staffMemberId: string };

const requireAdministrator = (principal: AuthenticatedPrincipal): Actor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new StaffManagementError('staff_access_denied');
  }
  return {
    accountId: principal.accountId,
    staffMemberId: principal.identity.staffMemberId,
  };
};

const unique = (values: string[]): string[] => [...new Set(values)];

// Administrators hold every Branch implicitly and carry no Branch rows; every
// other Role needs at least one usable Branch.
const resolveBranches = async (
  transaction: StaffManagementTransaction,
  role: StaffRoleName,
  branchIds: string[] | undefined,
): Promise<string[]> => {
  if (role === 'administrator') return [];
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

const requireManageable = async (
  transaction: StaffManagementTransaction,
  actor: Actor,
  staffMemberId: string,
): Promise<StaffMemberRecord> => {
  const member = await transaction.findStaffMember(staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  if (member.id === actor.staffMemberId) {
    throw new StaffManagementError('own_staff_member');
  }
  if (member.status === 'deactivated') {
    throw new StaffManagementError('staff_member_deactivated');
  }
  return member;
};

const requireNotLastAdministrator = async (
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

const requireNoTrainerCommitments = async (
  transaction: StaffManagementTransaction,
  input: { staffMemberId: string; branchIds?: string[]; now: Date },
): Promise<void> => {
  if ((await transaction.countTrainerCommitments(input)) > 0) {
    throw new StaffManagementError('trainer_has_upcoming_sessions');
  }
};

const activationWindow = (now: Date) => ({
  pendingExpiresAt: new Date(now.getTime() + pendingLifetimeMilliseconds),
  activationExpiresAt: new Date(now.getTime() + activationLifetimeMilliseconds),
});

const audit = (
  dependencies: StaffManagementDependencies,
  actor: Actor,
  input: Pick<StaffAudit, 'actionCode' | 'targetAccountId' | 'occurredAt'> & {
    metadata?: StaffAudit['metadata'];
  },
): StaffAudit => ({
  actionCode: input.actionCode,
  actorAccountId: actor.accountId,
  targetAccountId: input.targetAccountId,
  correlationId: dependencies.newId(),
  metadata: input.metadata ?? null,
  occurredAt: input.occurredAt,
});

const reread = async (
  transaction: StaffManagementTransaction,
  staffMemberId: string,
): Promise<StaffMemberRecord> => {
  const member = await transaction.findStaffMember(staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  return member;
};

export const createStaffMember = async (
  command: {
    name: string;
    email: string;
    phone: string | null;
    role: StaffRoleName;
    branchIds: string[];
  },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();
  const email = command.email.trim().toLowerCase();

  return dependencies.unitOfWork.execute(async (transaction) => {
    if ((await transaction.findAccountByEmail(email)) !== null) {
      throw new StaffManagementError('email_in_use');
    }
    const branchIds = await resolveBranches(
      transaction,
      command.role,
      command.branchIds,
    );
    if (!(await transaction.canIssueActivationEmail({ email, now }))) {
      throw new StaffManagementError('email_throttled');
    }
    const accountId = dependencies.newId();
    const staffMemberId = dependencies.newId();
    await transaction.createPendingStaffMember({
      accountId,
      staffMemberId,
      name: command.name.trim(),
      email,
      phone: command.phone,
      role: command.role,
      branchIds,
      ...activationWindow(now),
    });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.created',
        targetAccountId: accountId,
        metadata: { role: command.role, branchIds },
        occurredAt: now,
      }),
    );
    return reread(transaction, staffMemberId);
  });
};

export const resendStaffActivation = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    if (member.status !== 'pending') {
      throw new StaffManagementError('staff_member_not_pending');
    }
    if (
      !(await transaction.canIssueActivationEmail({ email: member.email, now }))
    ) {
      throw new StaffManagementError('email_throttled');
    }
    await transaction.reissueActivation({
      accountId: member.accountId,
      email: member.email,
      ...activationWindow(now),
    });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.activation_resent',
        targetAccountId: member.accountId,
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

export const changeStaffRole = async (
  command: { staffMemberId: string; role: StaffRoleName; branchIds?: string[] },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    if (member.role === command.role) return member;

    // Leaving Administrator needs an explicit Branch set; other changes keep
    // the current Branches unless the command replaces them.
    const branchIds = await resolveBranches(
      transaction,
      command.role,
      command.branchIds ??
        (member.role === 'administrator' ? [] : member.branchIds),
    );
    await requireNotLastAdministrator(transaction, member);
    if (member.role === 'trainer') {
      await requireNoTrainerCommitments(transaction, {
        staffMemberId: member.id,
        now,
      });
    }
    if (member.role === 'nutritionist') {
      await transaction.endNutritionistAvailability({
        staffMemberId: member.id,
        actorAccountId: actor.accountId,
        now,
      });
    }

    await transaction.setRole({ staffMemberId: member.id, role: command.role });
    const current = [...member.branchIds].sort().join();
    if ([...branchIds].sort().join() !== current) {
      await transaction.replaceBranches({
        staffMemberId: member.id,
        branchIds,
      });
    }
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.role_changed',
        targetAccountId: member.accountId,
        metadata: { previousRole: member.role, role: command.role },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

export const changeStaffBranches = async (
  command: { staffMemberId: string; branchIds: string[] },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    if (member.role === 'administrator') {
      throw new StaffManagementError('invalid_branch_assignment');
    }
    const branchIds = await resolveBranches(
      transaction,
      member.role,
      command.branchIds,
    );
    const added = branchIds.filter((id) => !member.branchIds.includes(id));
    const removed = member.branchIds.filter((id) => !branchIds.includes(id));
    if (added.length === 0 && removed.length === 0) return member;

    if (member.role === 'trainer' && removed.length > 0) {
      await requireNoTrainerCommitments(transaction, {
        staffMemberId: member.id,
        branchIds: removed,
        now,
      });
    }
    if (member.role === 'nutritionist') {
      for (const branchId of removed) {
        await transaction.endNutritionistAvailability({
          staffMemberId: member.id,
          branchId,
          actorAccountId: actor.accountId,
          now,
        });
      }
    }

    await transaction.replaceBranches({ staffMemberId: member.id, branchIds });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.branches_changed',
        targetAccountId: member.accountId,
        metadata: { added, removed },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

export const deactivateStaffMember = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    await requireNotLastAdministrator(transaction, member);
    if (member.role === 'trainer') {
      await requireNoTrainerCommitments(transaction, {
        staffMemberId: member.id,
        now,
      });
    }
    if (member.role === 'nutritionist') {
      await transaction.endNutritionistAvailability({
        staffMemberId: member.id,
        actorAccountId: actor.accountId,
        now,
      });
    }

    await transaction.disableAccount({ accountId: member.accountId, now });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.deactivated',
        targetAccountId: member.accountId,
        metadata: { role: member.role },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

export type StaffDirectoryQuery = {
  page: number;
  pageSize: number;
  role?: StaffRoleName;
  branchId?: string;
  status?: StaffStatus;
};

export type StaffDirectoryPage = {
  items: StaffMemberRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
};

export interface StaffDirectory {
  list: (query: StaffDirectoryQuery) => Promise<StaffDirectoryPage>;
  read: (staffMemberId: string) => Promise<StaffMemberRecord | null>;
}

export const listStaffMembers = async (
  query: StaffDirectoryQuery,
  principal: AuthenticatedPrincipal,
  directory: StaffDirectory,
): Promise<StaffDirectoryPage> => {
  requireAdministrator(principal);
  return directory.list(query);
};

export const readStaffMember = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  directory: StaffDirectory,
): Promise<StaffMemberRecord> => {
  requireAdministrator(principal);
  const member = await directory.read(command.staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  return member;
};
