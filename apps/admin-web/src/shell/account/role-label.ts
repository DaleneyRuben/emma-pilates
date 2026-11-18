import { staffRoleLabel, type StaffProfileDto } from "@pilates/api-contracts";

// Same labels the Staff app's Perfil uses (S23): a role, not a status pill.
// FIX-081 (finding 118): the person's Role in her gender, «Coordinadora» or
// «Administrador», as the owner chose over the area names.
export const roleLabelOf = (profile: StaffProfileDto | undefined): string =>
  staffRoleLabel(profile?.role ?? "administrator", profile?.gender);
