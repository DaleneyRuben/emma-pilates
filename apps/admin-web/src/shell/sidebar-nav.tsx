import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  navigationGroupsFor,
  navigationItemOf,
  type NavigationItem,
} from "../app/navigation";
import { branchSuppliesQueryOptions } from "../back-office/supplies/supply-queries";
import { countFormat } from "../components/table/pagination";
import { cn } from "../lib/cn";
import { contactAlertCountQueryOptions } from "../people/contact-alerts/contact-alert-queries";
import { pendingPaymentCountQueryOptions } from "../payments/payment-queries";
import { useAdminRole } from "../session/admin-role";
import { useBranchSelection } from "./branch/use-branch-selection";

// AW28: the transfers waiting for review, beside Pagos; nothing when none
// wait or the count cannot be read.
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

// AW08: the selected Branch's Supplies at or below their threshold, beside
// Insumos; another Branch's stock never shows here.
function useLowStockCount(enabled: boolean): number {
  const { selectedBranch } = useBranchSelection();
  const { data } = useQuery({
    ...branchSuppliesQueryOptions(selectedBranch?.id ?? ""),
    select: (page) => page.lowStockCount,
    enabled: enabled && selectedBranch !== undefined,
  });
  return data ?? 0;
}

const badges = {
  pendingPayments: {
    tone: "bg-primario-tinte text-primario-profundo",
    label: "por revisar",
  },
  lowStock: {
    tone: "bg-advertencia/15 text-advertencia-texto",
    label: "con stock bajo",
  },
  contactAlerts: {
    tone: "bg-primario-tinte text-primario-profundo",
    label: "para contactar",
  },
} as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  // ADR-0102: the Coordinator's sidebar has no money, so no count is read.
  const role = useAdminRole();
  const administrator = role === "administrator";
  const counts = {
    pendingPayments: usePendingPaymentCount(administrator),
    lowStock: useLowStockCount(administrator),
    contactAlerts: useContactAlertCount(),
  };

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5 px-3 py-4">
      {navigationGroupsFor(role).map((group, index) => (
        <div
          key={group.label ?? `group-${index}`}
          className="flex flex-col gap-0.5"
        >
          {group.label === undefined ? null : (
            <p className="px-3 pb-1.5 text-etiqueta-campo font-medium tracking-[0.14em] text-texto-muy-tenue uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              count={item.badge === undefined ? 0 : counts[item.badge]}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  item,
  count,
  onNavigate,
}: {
  item: NavigationItem;
  count: number;
  onNavigate?: () => void;
}) {
  const badge =
    item.badge === undefined || count === 0 ? undefined : badges[item.badge];
  // A sub-page (AW31, AW35) keeps its entry marked though the path differs.
  const onSubPage = useRouterState({
    select: (state) =>
      state.location.pathname !== item.to &&
      navigationItemOf(state.location.pathname) === item,
  });
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: true, includeSearch: false }}
      aria-current={onSubPage ? "page" : undefined}
      aria-label={
        badge === undefined
          ? undefined
          : `${item.label}, ${countFormat.format(count)} ${badge.label}`
      }
      className={cn(
        "flex h-9 items-center rounded-control px-3 text-fila-menu text-texto-secundario hover:bg-hover-fila hover:text-texto data-[status=active]:bg-primario-tinte data-[status=active]:font-medium data-[status=active]:text-primario-profundo",
        onSubPage && "bg-primario-tinte font-medium text-primario-profundo",
      )}
    >
      {item.label}
      {badge === undefined ? null : (
        <span
          className={cn(
            "ml-auto rounded-full px-2 text-ayuda font-medium tabular",
            badge.tone,
          )}
        >
          {countFormat.format(count)}
        </span>
      )}
    </Link>
  );
}
