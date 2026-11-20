import { NavRow } from "./nav-row";
import { useRail } from "./use-rail";

// Rosa Emma (design/v3/admin, every page): a 232 px Rosa profundo sidebar
// with «Emma Pilates Studio» in Lora and the nine destinations in white.
export function Sidebar() {
  const { destinations, place, destinationCount } = useRail();

  return (
    <nav
      aria-label="Secciones"
      className="sticky top-0 flex h-svh w-[232px] shrink-0 flex-col gap-0.5 overflow-y-auto bg-lateral px-4 py-7"
    >
      <span className="px-3 pb-6 font-serif text-[20px] leading-tight whitespace-nowrap text-blanco">
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
  );
}
