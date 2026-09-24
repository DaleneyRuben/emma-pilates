import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { navigationGroups, type NavigationItem } from "../app/navigation";
import { branchSuppliesQueryOptions } from "../back-office/supplies/supply-queries";
import { countFormat } from "../components/table/pagination";
import { cn } from "../lib/cn";
import { pendingPaymentCountQueryOptions } from "../payments/payment-queries";
import { useBranchSelection } from "./branch/use-branch-selection";

// AW28: the transfers waiting for review, beside Pagos; nothing when none
// wait or the count cannot be read.
function usePendingPaymentCount(): number {
  const { data } = useQuery(pendingPaymentCountQueryOptions());
  return data ?? 0;
}

// AW08: the selected Branch's Supplies at or below their threshold, beside
// Insumos; another Branch's stock never shows here.
function useLowStockCount(): number {
  const { selectedBranch } = useBranchSelection();
  const { data } = useQuery({
    ...branchSuppliesQueryOptions(selectedBranch?.id ?? ""),
    select: (page) => page.lowStockCount,
    enabled: selectedBranch !== undefined,
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
} as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const counts = {
    pendingPayments: usePendingPaymentCount(),
    lowStock: useLowStockCount(),
  };

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5 px-3 py-4">
      {navigationGroups.map((group, index) => (
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
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.subPages !== true, includeSearch: false }}
      aria-label={
        badge === undefined
          ? undefined
          : `${item.label}, ${countFormat.format(count)} ${badge.label}`
      }
      className="flex h-9 items-center rounded-control px-3 text-fila-menu text-texto-secundario hover:bg-hover-fila hover:text-texto data-[status=active]:bg-primario-tinte data-[status=active]:font-medium data-[status=active]:text-primario-profundo"
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
