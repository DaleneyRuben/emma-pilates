import { Link } from "@tanstack/react-router";
import type { NavigationItem } from "../app/navigation";
import { countFormat } from "../components/table/pagination";
import {
  segmentBadgeClass,
  segmentClass,
  segmentCurrentClass,
  segmentedBarClass,
} from "../components/ui/segmented";
import { cn } from "../lib/cn";
import { countedName, useRail } from "./rail/use-rail";

// Rosa Emma (rw.py tabs / views): a destination's pages as a white
// segmented bar on the page, the current one solid Rosa profundo with white
// text; a tab's views as the same bar, one step smaller, under it.
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
          className={segmentedBarClass}
        >
          {tabs.map((tab) => {
            const count = countOf(tab);
            return (
              <PageLink
                key={tab.to}
                item={tab}
                current={tab.to === place.tab.to}
                label={countedName(tab.label, count)}
                className={segmentClass}
                currentClassName={segmentCurrentClass}
              >
                {tab.label}
                {count === undefined ? null : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      segmentBadgeClass,
                      tab.to === place.tab.to
                        ? "bg-blanco text-texto"
                        : "bg-rosa-600 text-blanco",
                    )}
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
          className={segmentedBarClass}
        >
          {views.map((view) => (
            <PageLink
              key={view.to}
              item={view}
              current={view.to === place.page.to}
              className={cn(segmentClass, "h-9 px-3.5 text-celda")}
              currentClassName={segmentCurrentClass}
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
