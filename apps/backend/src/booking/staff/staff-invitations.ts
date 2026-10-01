import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  activationWindow,
  audit,
  requireActivationEmailRoom,
  requireAdministrator,
  requireManageable,
  reread,
  StaffManagementError,
  type Actor,
  type StaffManagementDependencies,
  type StaffManagementTransaction,
  type StaffMemberRecord,
} from './staff-management-model';

// WEB-012 (proposal W1–W4): the pending Staff invitation's own commands,
// mirroring the Assistant's Client invitations (MOB-021).

const requirePending = async (
  transaction: StaffManagementTransaction,
  actor: Actor,
  staffMemberId: string,
): Promise<StaffMemberRecord> => {
  const member = await requireManageable(transaction, actor, staffMemberId);
  if (member.status !== 'pending') {
    throw new StaffManagementError('staff_member_not_pending');
  }
  return member;
};

/** W4: the same email in «Nuevo miembro» reopens the pending invitation. */
export const reopenStaffInvitation = async (
  transaction: StaffManagementTransaction,
  dependencies: StaffManagementDependencies,
  actor: Actor,
  input: { staffMemberId: string; now: Date },
): Promise<StaffMemberRecord> => {
  const member = await requirePending(transaction, actor, input.staffMemberId);
  await requireActivationEmailRoom(transaction, {
    email: member.email,
    now: input.now,
  });
  await transaction.reissueActivation({
    accountId: member.accountId,
    email: member.email,
    ...activationWindow(input.now),
  });
  await transaction.recordAudit(
    audit(dependencies, actor, {
      actionCode: 'staff_member.invitation_reopened',
      targetAccountId: member.accountId,
      occurredAt: input.now,
    }),
  );
  return {
    ...(await reread(transaction, member.id)),
    invitationReopened: true,
  };
};

/** W1, W2: «Cambiar correo» on a pending invitation. */
export const correctStaffInvitationEmail = async (
  command: { staffMemberId: string; email: string },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();
  const email = command.email.trim().toLowerCase();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requirePending(
      transaction,
      actor,
      command.staffMemberId,
    );
    if (email === member.email) {
      throw new StaffManagementError('email_unchanged');
    }
    const taken = await transaction.findAccountByEmail(email);
    if (taken?.kind === 'client') {
      throw new StaffManagementError('email_belongs_to_client');
    }
    if (taken !== null) throw new StaffManagementError('email_in_use');
    await requireActivationEmailRoom(transaction, { email, now });

    await transaction.setAccountEmail({ accountId: member.accountId, email });
    await transaction.reissueActivation({
      accountId: member.accountId,
      email,
      ...activationWindow(now),
    });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.email_corrected',
        targetAccountId: member.accountId,
        metadata: { previousEmail: member.email },
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};

/** W3: «Cancelar invitación» removes the pending member, never a row. */
export const cancelStaffInvitation = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<void> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();

  await dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requirePending(
      transaction,
      actor,
      command.staffMemberId,
    );
    await transaction.removePendingStaffMember({
      accountId: member.accountId,
      staffMemberId: member.id,
      now,
    });
    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.invitation_cancelled',
        targetAccountId: member.accountId,
        metadata: { email: member.email },
        occurredAt: now,
      }),
    );
  });
};
