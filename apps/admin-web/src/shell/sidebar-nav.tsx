import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { navigationGroups, type NavigationItem } from "../app/navigation";
import { countFormat } from "../components/table/pagination";
import { pendingPaymentCountQueryOptions } from "../payments/payment-queries";

// AW28: the transfers waiting for review, beside Pagos; nothing when none
// wait or the count cannot be read.
function usePendingPaymentCount(): number {
  const { data } = useQuery(pendingPaymentCountQueryOptions());
  return data ?? 0;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pendingPayments = usePendingPaymentCount();
  const badgeOf = (item: NavigationItem): number =>
    item.badge === "pendingPayments" ? pendingPayments : 0;

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
          {group.items.map((item) => {
            const badge = badgeOf(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                activeOptions={{ exact: true, includeSearch: false }}
                aria-label={
                  badge === 0
                    ? undefined
                    : `${item.label}, ${countFormat.format(badge)} por revisar`
                }
                className="flex h-9 items-center rounded-control px-3 text-fila-menu text-texto-secundario hover:bg-hover-fila hover:text-texto data-[status=active]:bg-primario-tinte data-[status=active]:font-medium data-[status=active]:text-primario-profundo"
              >
                {item.label}
                {badge === 0 ? null : (
                  <span className="ml-auto rounded-full bg-primario-tinte px-2 text-ayuda font-medium text-primario-profundo tabular">
                    {countFormat.format(badge)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
