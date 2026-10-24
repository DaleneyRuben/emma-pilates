import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError, type BackOfficeActor } from '../back-office-errors';

// The authorization seam for managing Equipment and resolving its faults
// (BKO-004, ADR-0106). The Coordinator is operational, not money (IDN-009).
const equipmentManagerRoles: readonly string[] = [
  'administrator',
  'coordinator',
];

export const requireEquipmentManager = (
  principal: AuthenticatedPrincipal,
): BackOfficeActor => {
  if (
    principal.identity.kind !== 'staff' ||
    !equipmentManagerRoles.includes(principal.identity.role)
  ) {
    throw new BackOfficeError('back_office_access_denied');
  }
  return { accountId: principal.accountId };
};

// A Trainer reports a fault only from a Session she leads; anyone else, and a
// Session that does not exist, gets the same refusal.
export const requireLeadingTrainer = (
  principal: AuthenticatedPrincipal,
  session: { trainerStaffMemberId: string } | null,
): BackOfficeActor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'trainer' ||
    session === null ||
    session.trainerStaffMemberId !== principal.identity.staffMemberId
  ) {
    throw new BackOfficeError('back_office_access_denied');
  }
  return { accountId: principal.accountId };
};
