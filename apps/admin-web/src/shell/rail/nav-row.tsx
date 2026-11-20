import { Link } from "@tanstack/react-router";
import { countFormat } from "../../components/table/pagination";
import { cn } from "../../lib/cn";
import type { Destination } from "../../app/navigation";
import { DestinationIcon } from "./destination-icon";
import { countedName, type Count } from "./use-rail";

// Rosa Emma (rw.py sidebar and drawer_nav): a destination as white text on
// the Rosa profundo sidebar; the current one is a white pill with Rosa
// profundo text, and its count swaps colours with it.
export function NavRow({
  destination,
  current,
  count,
  large = false,
  onNavigate,
}: {
  destination: Destination;
  current: boolean;
  count: Count | undefined;
  large?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={destination.tabs[0]?.to ?? "/"}
      onClick={onNavigate}
      activeOptions={{ exact: true, includeSearch: false }}
      aria-current={current ? "page" : undefined}
      aria-label={countedName(destination.label, count)}
      className={cn(
        "flex items-center gap-3 rounded-boton px-3.5 text-blanco hover:bg-blanco/10 focus-visible:shadow-foco-solido",
        large
          ? "min-h-12 gap-3.5 text-cuerpo-grande"
          : "min-h-[43px] text-cuerpo",
        current && "bg-blanco font-bold text-texto hover:bg-blanco",
      )}
    >
      <DestinationIcon
        icon={destination.icon}
        size={large ? 22 : 20}
        className={current ? "text-texto" : "text-blanco"}
      />
      <span className="flex-1">{destination.label}</span>
      {count === undefined ? null : (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-pie font-bold tabular",
            current ? "bg-rosa-600 text-blanco" : "bg-blanco text-texto",
          )}
        >
          {countFormat.format(count.value)}
        </span>
      )}
    </Link>
  );
}
