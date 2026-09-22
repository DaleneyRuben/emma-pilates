import type { StaffProfileDto } from "@pilates/api-contracts";

const roleLabels: Record<StaffProfileDto["role"], string> = {
  administrator: "Administración",
  assistant: "Asistente",
  nutritionist: "Nutricionista",
  trainer: "Entrenadora",
};

export function roleLabel(role: StaffProfileDto["role"]): string {
  return roleLabels[role];
}

export function branchesLabel(profile: StaffProfileDto): string {
  if (profile.role === "administrator") return "Todas las sucursales";
  return profile.branches.map((branch) => branch.name).join(", ");
}
