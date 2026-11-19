import { chipClass, selectedClass } from "../../components/ui/chip";
import { cn } from "../../lib/cn";
import type { ClientFilter } from "../people-search";

const chips: readonly { value: ClientFilter | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  { value: "active", label: "Con plan" },
  { value: "none", label: "Sin plan" },
  { value: "expired", label: "Expirado" },
  { value: "founder", label: "Fundadora" },
  // FIX-065 (walkthrough finding 91, follow-up 268).
  { value: "closed", label: "Cuenta cerrada" },
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
            className={cn(chipClass, chosen && selectedClass)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
