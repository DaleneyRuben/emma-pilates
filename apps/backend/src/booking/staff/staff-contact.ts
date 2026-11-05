import { normalizeContactPhone } from '../../phone/bolivian-mobile';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  audit,
  requireAdministrator,
  requireManageable,
  reread,
  type StaffManagementDependencies,
  type StaffMemberRecord,
} from './staff-management-model';

// FIX-038, decision §19.21 (owner, 2026-11-05): the Administrator corrects
// another Staff Member's name and phone, active or pending. The login email
// is not part of this command: a pending one has «Cambiar correo», and an
// active one needs a confirmed change. The audit keeps the old and the new
// values of what changed ("" for no phone).
export const changeStaffContact = async (
  command: { staffMemberId: string; name: string; phone: string | null },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> => {
  const actor = requireAdministrator(principal);
  const now = dependencies.now();
  const name = command.name.trim();
  const phone = normalizeContactPhone(command.phone);

  return dependencies.unitOfWork.execute(async (transaction) => {
    const member = await requireManageable(
      transaction,
      actor,
      command.staffMemberId,
    );
    const metadata: Record<string, string> = {};
    if (name !== member.name) {
      await transaction.setName({ staffMemberId: member.id, name });
      metadata.previousName = member.name;
      metadata.name = name;
    }
    if (phone !== member.phone) {
      await transaction.setPhone({ staffMemberId: member.id, phone });
      metadata.previousPhone = member.phone ?? '';
      metadata.phone = phone ?? '';
    }
    if (Object.keys(metadata).length === 0) return member;

    await transaction.recordAudit(
      audit(dependencies, actor, {
        actionCode: 'staff_member.contact_changed',
        targetAccountId: member.accountId,
        metadata,
        occurredAt: now,
      }),
    );
    return reread(transaction, member.id);
  });
};
