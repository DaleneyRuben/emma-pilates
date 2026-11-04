import type { StaffProfileDto } from "@pilates/api-contracts";

// Same labels the Staff app's Perfil uses (S23): a role, not a status pill.
export const roleLabelOf = (profile: StaffProfileDto | undefined): string =>
  profile?.role === "coordinator" ? "Coordinación" : "Administración";
