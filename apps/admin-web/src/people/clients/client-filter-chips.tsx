import { FilterChips } from "../../components/ui/filter-chips";
import type { ClientFilter } from "../people-search";

// P03 / P11: Clientas › Todas's chips, one at a time. FIX-091 (W8 A): «Por
// vencer» and «Sin reservar» first, each with how many it holds once the
// directory says so; «Fundadoras» in the plural like «Todas».
export function ClientFilterChips({
  value,
  onChange,
  counts,
}: {
  value: ClientFilter | undefined;
  onChange: (value: ClientFilter | undefined) => void;
  counts?: { expiring?: number; unbooked?: number };
}) {
  return (
    <FilterChips
      label="Filtrar clientas"
      value={value}
      onChange={onChange}
      options={[
        { value: undefined, label: "Todas" },
        { value: "expiring", label: "Por vencer", count: counts?.expiring },
        { value: "unbooked", label: "Sin reservar", count: counts?.unbooked },
        { value: "active", label: "Con plan" },
        { value: "none", label: "Sin plan" },
        { value: "expired", label: "Plan vencido" },
        { value: "founder", label: "Fundadoras" },
        // FIX-065 (walkthrough finding 91, follow-up 268).
        { value: "closed", label: "Cuenta cerrada" },
      ]}
    />
  );
}
