import { cn } from "../../lib/cn";
import type { ClientFilter } from "../people-search";

const chips: readonly { value: ClientFilter | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  { value: "active", label: "Con plan" },
  { value: "none", label: "Sin plan" },
  { value: "expired", label: "Expirado" },
  { value: "founder", label: "Fundadora" },
];

// P03 / P11: Clientas › Todas's chips, one at a time, as the destination
// tabs draw their views (Lino pills, the chosen one in Rosa tinte).
export function ClientFilterChips({
  value,
  onChange,
}: {
  value: ClientFilter | undefined;
  onChange: (value: ClientFilter | undefined) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar clientas"
      className="flex flex-wrap gap-2"
    >
      {chips.map((chip) => {
        const chosen = chip.value === value;
        return (
          <button
            key={chip.label}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-9 items-center rounded-full bg-lino px-3.5 text-celda text-texto hover:bg-rosa-tinte focus-visible:shadow-foco",
              chosen && "bg-rosa-tinte font-semibold text-rosa-enlace",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
