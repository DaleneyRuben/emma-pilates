import { Link } from "@tanstack/react-router";
import { countFormat } from "../../components/table/pagination";
import { cn } from "../../lib/cn";
import { DestinationIcon } from "./destination-icon";
import { countedName, useRail } from "./use-rail";

// P01 (follow-up 232): a 96 px Lino rail with the nine destinations (no
// brand mark since FIX-042: the top bar carries «Emma Pilates Studio»), each an icon in a 56 × 32 pill over a 12 px label; the
// current one is a Rosa profundo pill, and a count sits on the pill's corner.
export function IconRail() {
  const { destinations, place, destinationCount } = useRail();

  return (
    <nav
      aria-label="Secciones"
      className="sticky top-0 flex h-svh w-[96px] shrink-0 flex-col gap-1 overflow-y-auto bg-lino px-2 py-5"
    >
      {destinations.map((destination) => {
        const current = place?.destination.label === destination.label;
        const count = destinationCount(destination);
        return (
          <Link
            key={destination.label}
            to={destination.tabs[0]?.to ?? "/"}
            activeOptions={{ exact: true, includeSearch: false }}
            aria-current={current ? "page" : undefined}
            aria-label={countedName(destination.label, count)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-control py-1.5 text-pie font-medium text-texto focus-visible:shadow-foco",
              current && "text-rosa-enlace",
            )}
          >
            <span
              className={cn(
                "relative flex h-8 w-14 items-center justify-center rounded-full text-primario group-hover:bg-rosa-tinte",
                current &&
                  "bg-rosa-profundo text-blanco group-hover:bg-rosa-profundo",
              )}
            >
              <DestinationIcon icon={destination.icon} size={22} />
              {count === undefined ? null : (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-lino bg-rosa-profundo px-1 text-[11px] font-semibold text-blanco tabular"
                >
                  {countFormat.format(count.value)}
                </span>
              )}
            </span>
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
