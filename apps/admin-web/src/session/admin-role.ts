import type { CurrentAuthenticationPrincipalDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { currentSessionQueryOptions } from "./session-queries";

/** Who holds an admin-web session (ADR-0084, ADR-0102). */
export type AdminRole = "administrator" | "coordinator";

export const adminRoleOf = (
  principal: CurrentAuthenticationPrincipalDto,
): AdminRole =>
  principal.identity.kind === "staff" &&
  principal.identity.role === "administrator"
    ? "administrator"
    : "coordinator";

/**
 * The signed-in Role. The session guard has read the session before any page
 * draws; until then the least-privileged Role is assumed, so no money is read.
 */
export function useAdminRole(): AdminRole {
  const { data } = useQuery(currentSessionQueryOptions());
  return data === undefined ? "coordinator" : adminRoleOf(data);
}
