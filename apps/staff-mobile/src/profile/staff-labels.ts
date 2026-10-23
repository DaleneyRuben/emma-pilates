import type { StaffProfileDto } from "@pilates/api-contracts";

const roleLabels: Record<StaffProfileDto["role"], string> = {
  administrator: "Administración",
  coordinator: "Coordinación",
  assistant: "Asistente",
  nutritionist: "Nutricionista",
  trainer: "Entrenadora",
};

export function roleLabel(role: StaffProfileDto["role"]): string {
  return roleLabels[role];
}

export function branchesLabel(profile: StaffProfileDto): string {
  // The Administrator and the Coordinator hold every Branch implicitly.
  if (profile.role === "administrator" || profile.role === "coordinator") {
    return "Todas las sucursales";
  }
  return profile.branches.map((branch) => branch.name).join(", ");
}
