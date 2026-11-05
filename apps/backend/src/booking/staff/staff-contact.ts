import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type {
  StaffManagementDependencies,
  StaffMemberRecord,
} from './staff-management-model';

export const changeStaffContact = (
  command: { staffMemberId: string; name: string; phone: string | null },
  principal: AuthenticatedPrincipal,
  dependencies: StaffManagementDependencies,
): Promise<StaffMemberRecord> =>
  Promise.reject(
    new Error(
      `not implemented: ${command.staffMemberId} ${principal.accountId} ${typeof dependencies}`,
    ),
  );
