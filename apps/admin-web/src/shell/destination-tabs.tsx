import { Link } from "@tanstack/react-router";
import type { NavigationItem } from "../app/navigation";
import { countFormat } from "../components/table/pagination";
import { cn } from "../lib/cn";
import { countedName, useRail } from "./rail/use-rail";

// P02–P09: a destination's pages as 44 px tabs on an Arena hairline, the
// current one in Rosa enlace over a Rosa profundo underline; a tab's views
// as pill switches under them.
export function DestinationTabs() {
  const { destinations, place, countOf } = useRail();
  if (place === undefined) return null;
  const destination = destinations.find(
    (shown) => shown.label === place.destination.label,
  );
  const tabs = destination?.tabs ?? [];
  const views =
    place.tab.views === undefined ? [] : [place.tab, ...place.tab.views];

  return (
    <>
      {tabs.length > 1 ? (
        <nav
          aria-label={`Páginas de ${place.destination.label}`}
          className="flex flex-wrap gap-1 border-b border-arena-linea"
        >
          {tabs.map((tab) => {
            const count = countOf(tab);
            return (
              <PageLink
                key={tab.to}
                item={tab}
                current={tab.to === place.tab.to}
                label={countedName(tab.label, count)}
                className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-cuerpo text-tenue hover:text-texto"
                currentClassName="border-rosa-profundo font-semibold text-rosa-enlace hover:text-rosa-enlace"
              >
                {tab.label}
                {count === undefined ? null : (
                  <span
                    aria-hidden="true"
                    className="ml-1.5 rounded-full bg-rosa-profundo px-[7px] py-0.5 text-pie font-semibold text-blanco tabular"
                  >
                    {countFormat.format(count.value)}
                  </span>
                )}
              </PageLink>
            );
          })}
        </nav>
      ) : null}
      {views.length > 0 ? (
        <nav
          aria-label={`Vistas de ${place.tab.label}`}
          className="flex flex-wrap gap-2"
        >
          {views.map((view) => (
            <PageLink
              key={view.to}
              item={view}
              current={view.to === place.page.to}
              className="inline-flex h-9 items-center rounded-full bg-lino px-3.5 text-celda text-texto hover:bg-rosa-tinte"
              currentClassName="bg-rosa-tinte font-semibold text-rosa-enlace"
            >
              {view === place.tab ? (view.viewLabel ?? view.label) : view.label}
            </PageLink>
          ))}
        </nav>
      ) : null}
    </>
  );
}

function PageLink({
  item,
  current,
  label,
  className,
  currentClassName,
  children,
}: {
  item: NavigationItem;
  current: boolean;
  label?: string;
  className: string;
  currentClassName: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: true, includeSearch: false }}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className={cn(
        "focus-visible:shadow-foco",
        className,
        current && currentClassName,
      )}
    >
      {children}
    </Link>
  );
}
