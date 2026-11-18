import {
  staffRoleLabel,
  useGetCurrentStaffMemberProfile,
  type StaffProfileDto,
} from "@pilates/api-contracts";

import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";

/**
 * FIX-081 (finding 118, owner 2026-11-18): the signed-in (or acted-as)
 * person's Role in their gender, «Coordinadora» or «Coordinador», for the
 * tab eyebrows. Feminine until Perfil's read answers, as the labels always
 * read.
 */
export function useOwnRoleLabel(): string {
  const fetcher = useStaffFetcher();
  const role = useStaffRole();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const gender = profile.data?.status === 200 ? profile.data.data.gender : undefined;
  return staffRoleLabel(role, gender);
}

export function branchesLabel(profile: StaffProfileDto): string {
  // The Administrator and the Coordinator hold every Branch implicitly.
  if (profile.role === "administrator" || profile.role === "coordinator") {
    return "Todas las sucursales";
  }
  return profile.branches.map((branch) => branch.name).join(", ");
}
