import { Menu, X } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { cn } from "../../lib/cn";
import { NavRow } from "./nav-row";
import { useRail } from "./use-rail";

const squareButton =
  "inline-flex size-11 items-center justify-center rounded-tarjeta focus-visible:shadow-foco";

// RW-marco-menu-420: at phone width the sidebar becomes a menu opened from
// the Rosa profundo top bar, a 320 px drawer of the same white rows; it
// closes once a destination opens.
export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const { destinations, place, destinationCount } = useRail();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          className={cn(
            squareButton,
            "text-sobre-primario focus-visible:shadow-foco-solido",
          )}
        >
          <Menu size={24} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        hideClose
        aria-describedby={undefined}
        className="w-[320px] gap-0.5 overflow-y-auto border-0 bg-lateral px-4 py-[22px]"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="flex items-center gap-2 pb-5 pl-2">
          <span className="flex-1 tipo-titulo-bloque text-sobre-primario">
            Emma Pilates Studio
          </span>
          <SheetClose
            aria-label="Cerrar menú"
            className={cn(
              squareButton,
              "text-sobre-primario focus-visible:shadow-foco-solido",
            )}
          >
            <X size={22} strokeWidth={1.6} aria-hidden="true" />
          </SheetClose>
        </div>
        {destinations.map((destination) => (
          <NavRow
            key={destination.label}
            destination={destination}
            current={place?.destination.label === destination.label}
            count={destinationCount(destination)}
            large
            onNavigate={() => setOpen(false)}
          />
        ))}
      </SheetContent>
    </Sheet>
  );
}
