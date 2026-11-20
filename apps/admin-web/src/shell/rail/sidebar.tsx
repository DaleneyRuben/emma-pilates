import { NavRow } from "./nav-row";
import { useRail } from "./use-rail";

// Rosa Emma (design/v3/admin, every page): a 232 px Rosa profundo sidebar
// with «Emma Pilates Studio» in Lora and the nine destinations in white.
export function Sidebar() {
  const { destinations, place, destinationCount } = useRail();

  return (
    // The Rosa profundo column runs the page's full height; the nav inside
    // it stays in view while the page scrolls.
    <div className="w-[232px] shrink-0 bg-lateral">
      <nav
        aria-label="Secciones"
        className="sticky top-0 flex max-h-svh flex-col gap-0.5 overflow-y-auto px-4 py-7"
      >
        <span className="px-3 pb-6 tipo-titulo-bloque text-sobre-primario">
          Emma Pilates Studio
        </span>
        {destinations.map((destination) => (
          <NavRow
            key={destination.label}
            destination={destination}
            current={place?.destination.label === destination.label}
            count={destinationCount(destination)}
          />
        ))}
      </nav>
    </div>
  );
}
