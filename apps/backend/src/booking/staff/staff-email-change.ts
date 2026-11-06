import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  audit,
  requireAdministrator,
  requireManageable,
  reread,
  StaffManagementError,
  type StaffManagementDependencies,
  type StaffManagementTransaction,
  type StaffMemberRecord,
} from './staff-management-model';

// FIX-039 (DES-012, proposal A, owner 2026-11-06): the Administrator changes
// another active Staff Member's login email. IDN-008 holds: the address
// changes only when the link sent to it is opened, the current address gets
// a notice, and sessions stay open. Unlike the Account's own change, the
// studio is told when the address is taken or the lane is full (E8 keeps
// the self-service answer neutral; the Administrator already sees it when
// inviting).

const requireEmailRoom = async (
  transaction: StaffManagementTransaction,
  email: string,
  now: Date,
): Promise<void> => {
  const wait = await transaction.emailChangeWaitSeconds({ email, now });
  if (wait > 0) throw new StaffManagementError('email_throttled', wait);
};

const requirePending = (
  member: StaffMemberRecord,
): { email: string; expiresAt: Date } => {
  if (member.pendingEmail === null) {
    throw new StaffManagementError('email_change_not_pending');
  }
  return member.pendingEmail;
};

export const requestStaffEmailChange = async (
  command: { staffMemberId: string; email: string },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();
  const email = command.email.trim().toLowerCase();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    // A pending invitation keeps «Cambiar correo» (WEB-012 W1).
    if (member.status !== 'active') {
      throw new StaffManagementError('staff_member_not_active');
    }
    if (email === member.email.toLowerCase()) {
      throw new StaffManagementError('email_unchanged');
    }
    const owner = await transaction.findAccountByEmail(email);
    if (owner !== null) {
      throw new StaffManagementError(
        owner.kind === 'client' ? 'email_belongs_to_client' : 'email_in_use',
      );
    }
    await requireEmailRoom(transaction, email, now);
    await transaction.requestEmailChange({
      accountId: member.accountId,
      email,
      now,
    });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.email_change_requested',
        targetAccountId: member.accountId,
        metadata: { previousEmail: member.email, email },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

// IDN-008 E12: a resend is not audited; the throttle event records it.
export const resendStaffEmailChange = async (
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
    const pending = requirePending(member);
    await requireEmailRoom(transaction, pending.email, now);
    await transaction.resendEmailChange({ accountId: member.accountId, now });
    return reread(transaction, member.id);
  });
};

export const cancelStaffEmailChange = async (
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
    const pending = requirePending(member);
    await transaction.cancelEmailChange({ accountId: member.accountId, now });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.email_change_cancelled',
        targetAccountId: member.accountId,
        metadata: { email: pending.email },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};
