import type { StaffMemberDto } from "@pilates/api-contracts";

/** A deactivated Staff Member can still get a final payment (BKO-001 D10). */
export const staffOptionLabel = (member: StaffMemberDto): string =>
  member.status === "deactivated"
    ? `${member.name} (cuenta desactivada)`
    : member.name;
