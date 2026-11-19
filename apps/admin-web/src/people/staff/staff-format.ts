import type { StaffMemberDto } from "@pilates/api-contracts";
import { holdsEveryBranch } from "../people-search";

type Status = StaffMemberDto["status"];

export const statusPills: Record<
  Status,
  { tone: "exito" | "advertencia" | "neutral"; label: string }
> = {
  active: { tone: "exito", label: "Activa" },
  pending: { tone: "advertencia", label: "Pendiente" },
  deactivated: { tone: "neutral", label: "Desactivada" },
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

/** FIX-039: «Camila» from «Camila Rojas», as the email change copy names her. */
export const firstName = (name: string): string => name.split(" ")[0] ?? name;

/** Addresses compare without case or surrounding spaces. */
export const sameEmail = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
