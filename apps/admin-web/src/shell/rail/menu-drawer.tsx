import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { countFormat } from "../../components/table/pagination";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { cn } from "../../lib/cn";
import { Wordmark } from "../wordmark";
import { DestinationIcon } from "./destination-icon";
import { countedName, useRail } from "./use-rail";

const squareButton =
  "inline-flex size-11 items-center justify-center rounded-tarjeta focus-visible:shadow-foco";

// P01d: at phone width the rail becomes a menu opened from the top bar, a
// 300 px Lino drawer of 48 px rows; it closes once a destination opens.
export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const { destinations, place, destinationCount } = useRail();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          className={cn(squareButton, "bg-lino text-primario")}
        >
          <Menu size={24} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        hideClose
        aria-describedby={undefined}
        className="w-[300px] gap-1 overflow-y-auto border-0 bg-lino px-3 py-4"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="flex items-center gap-2 pb-3 pl-3">
          <Wordmark className="flex-1" />
          <SheetClose
            aria-label="Cerrar menú"
            className={cn(squareButton, "bg-superficie text-tenue")}
          >
            <X size={22} strokeWidth={1.6} aria-hidden="true" />
          </SheetClose>
        </div>
        {destinations.map((destination) => {
          const current = place?.destination.label === destination.label;
          const count = destinationCount(destination);
          return (
            <Link
              key={destination.label}
              to={destination.tabs[0]?.to ?? "/"}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: true, includeSearch: false }}
              aria-current={current ? "page" : undefined}
              aria-label={countedName(destination.label, count)}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-tarjeta px-3 text-[16px] text-texto hover:bg-rosa-tinte focus-visible:shadow-foco",
                current &&
                  "bg-rosa-profundo font-semibold text-blanco hover:bg-rosa-profundo",
              )}
            >
              <DestinationIcon
                icon={destination.icon}
                size={22}
                className={current ? "text-blanco" : "text-primario"}
              />
              <span className="flex-1">{destination.label}</span>
              {count === undefined ? null : (
                <span
                  aria-hidden="true"
                  className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rosa-profundo px-[7px] text-pie font-semibold text-blanco tabular"
                >
                  {countFormat.format(count.value)}
                </span>
              )}
            </Link>
          );
        })}
      </SheetContent>
    </Sheet>
  );
}
