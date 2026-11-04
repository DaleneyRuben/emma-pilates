import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import {
  destinationsFor,
  placeOf,
  type Destination,
  type NavigationItem,
  type Place,
} from "../../app/navigation";
import { branchSuppliesQueryOptions } from "../../back-office/supplies/supply-queries";
import { countFormat } from "../../components/table/pagination";
import { contactAlertCountQueryOptions } from "../../people/contact-alerts/contact-alert-queries";
import { pendingPaymentCountQueryOptions } from "../../payments/payment-queries";
import { useAdminRole } from "../../session/admin-role";
import { staffProfileQueryOptions } from "../../session/staff-profile-query";
import { useBranchSelection } from "../branch/use-branch-selection";

type Badge = NonNullable<NavigationItem["badge"]>;

const badgeLabels: Record<Badge, string> = {
  pendingPayments: "por revisar",
  lowStock: "con stock bajo",
  contactAlerts: "para contactar",
};

// AW28: the transfers waiting for review; nothing when none wait or the
// count cannot be read.
function usePendingPaymentCount(enabled: boolean): number {
  const { data } = useQuery({ ...pendingPaymentCountQueryOptions(), enabled });
  return data ?? 0;
}

// AW39: people waiting on «Para contactar»; the Coordinator sees it too
// because the count is people, never money (ADR-0102).
function useContactAlertCount(): number {
  const { data } = useQuery(contactAlertCountQueryOptions());
  return data ?? 0;
}

// AW08: the selected Branch's Supplies at or below their threshold; another
// Branch's stock never shows here.
function useLowStockCount(enabled: boolean): number {
  const { selectedBranch } = useBranchSelection();
  const { data } = useQuery({
    ...branchSuppliesQueryOptions(selectedBranch?.id ?? ""),
    select: (page) => page.lowStockCount,
    enabled: enabled && selectedBranch !== undefined,
  });
  return data ?? 0;
}

export type Count = { value: number; label: string };

export type Rail = {
  destinations: readonly Destination[];
  /** Where the address sits, when it is one of the rail's pages. */
  place: Place | undefined;
  countOf: (item: NavigationItem) => Count | undefined;
  /** A destination's count is its tab's: one counted tab per destination. */
  destinationCount: (destination: Destination) => Count | undefined;
};

/** «Dinero, 3 por revisar»: the name a counted link reads out. */
export const countedName = (label: string, count: Count | undefined) =>
  count === undefined
    ? undefined
    : `${label}, ${countFormat.format(count.value)} ${count.label}`;

/**
 * The rail the signed-in Role sees and what waits on it. The session Role is
 * administrator or coordinator; a profile that has answered and is neither
 * still reaches this shell, so money stays hidden from it. Until the profile
 * answers, the session Role decides (ADR-0102).
 */
export function useRail(): Rail {
  const role = useAdminRole();
  const { data: profile } = useQuery(staffProfileQueryOptions());
  const seesMoney =
    role === "administrator" &&
    (profile === undefined || profile.role === "administrator");
  const counts: Record<Badge, number> = {
    pendingPayments: usePendingPaymentCount(seesMoney),
    lowStock: useLowStockCount(seesMoney),
    contactAlerts: useContactAlertCount(),
  };
  const place = useRouterState({
    select: (state) => placeOf(state.location.pathname),
  });

  const countOf = (item: NavigationItem): Count | undefined =>
    item.badge === undefined || counts[item.badge] === 0
      ? undefined
      : { value: counts[item.badge], label: badgeLabels[item.badge] };

  return {
    destinations: destinationsFor(seesMoney ? "administrator" : "coordinator"),
    place,
    countOf,
    destinationCount: (destination) =>
      destination.tabs.map(countOf).find((count) => count !== undefined),
  };
}
