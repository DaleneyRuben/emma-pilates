import type { StaffMemberDto } from "@pilates/api-contracts";
import { holdsEveryBranch, type StaffRole } from "../people-search";

// AW23's labels: a Role is a fixed category, drawn as a neutral label.
export const roleLabels: Record<StaffRole, string> = {
  trainer: "Entrenador",
  assistant: "Asistente",
  administrator: "Administrador",
  nutritionist: "Nutricionista",
  coordinator: "Coordinador",
};

type Status = StaffMemberDto["status"];

export const statusPills: Record<
  Status,
  { tone: "exito" | "advertencia" | "neutral"; label: string }
> = {
  active: { tone: "exito", label: "Activo" },
  pending: { tone: "advertencia", label: "Pendiente" },
  deactivated: { tone: "neutral", label: "Desactivado" },
};

/** "Todas" for the Roles that hold every Branch implicitly. */
export function branchNames(
  member: Pick<StaffMemberDto, "role" | "branchIds">,
  names: ReadonlyMap<string, string>,
): string {
  if (holdsEveryBranch(member.role)) return "Todas";
  return member.branchIds
    .map((id) => names.get(id))
    .filter((name): name is string => name !== undefined)
    .sort((a, b) => a.localeCompare(b, "es"))
    .join(", ");
}
