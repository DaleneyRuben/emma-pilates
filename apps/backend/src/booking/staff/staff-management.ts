import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  activationWindow,
  audit,
  holdsEveryBranch,
  requireActivationEmailRoom,
  requireAdministrator,
  requireManageable,
  requireNoTrainerCommitments,
  requireNotLastAdministrator,
  reread,
  requireStaffReader,
  resolveBranches,
  StaffManagementError,
  type StaffManagementDependencies,
  type StaffMemberRecord,
  type StaffRoleName,
  type StaffStatus,
} from './staff-management-model';
import { reopenStaffInvitation } from './staff-invitations';

export * from './staff-management-model';

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
    const existing = await transaction.findAccountByEmail(email);
    if (existing?.kind === 'client') {
      throw new StaffManagementError('email_belongs_to_client');
    }
    if (
      existing !== null &&
      existing.pending &&
      existing.staffMemberId !== null
    ) {
      return reopenStaffInvitation(transaction, dependencies, actor, {
        staffMemberId: existing.staffMemberId,
        now,
      });
    }
    if (existing !== null) throw new StaffManagementError('email_in_use');
    const branchIds = await resolveBranches(
      transaction,
      command.role,
      command.branchIds,
    );
    await requireActivationEmailRoom(transaction, { email, now });
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
    await requireActivationEmailRoom(transaction, { email: member.email, now });
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

    // Leaving an every-Branch Role needs an explicit Branch set; other
    // changes keep the current Branches unless the command replaces them.
    const branchIds = await resolveBranches(
      transaction,
      command.role,
      command.branchIds ??
        (holdsEveryBranch(member.role) ? [] : member.branchIds),
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
    if (holdsEveryBranch(member.role)) {
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
  requireStaffReader(principal);
  return directory.list(query);
};

export const readStaffMember = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  directory: StaffDirectory,
): Promise<StaffMemberRecord> => {
  requireStaffReader(principal);
  const member = await directory.read(command.staffMemberId);
  if (member === null) throw new StaffManagementError('staff_member_not_found');
  return member;
};
