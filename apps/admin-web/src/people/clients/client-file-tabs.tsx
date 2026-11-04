import { useId, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";
import type { AdminRole } from "../../session/admin-role";

export type ClientFileTab = "resumen" | "reservas" | "pagos" | "evaluaciones";

const allTabs: readonly {
  value: ClientFileTab;
  label: string;
  administratorOnly?: true;
}[] = [
  { value: "resumen", label: "Resumen" },
  { value: "reservas", label: "Reservas" },
  // ADR-0102, ADR-0108: the Coordinator never sees a Payment.
  { value: "pagos", label: "Pagos", administratorOnly: true },
  { value: "evaluaciones", label: "Evaluaciones" },
];

const clientFileTabsFor = (role: AdminRole) =>
  allTabs.filter((tab) => role === "administrator" || !tab.administratorOnly);

// P03 / P11: the Client file's tabs on an Arena hairline, the chosen one in
// Rosa enlace over a Rosa profundo underline, like the destination tabs.
// Arrow keys move between them (WAI-ARIA tabs).
export function ClientFileTabs({
  role,
  value,
  onChange,
  panelBase,
}: {
  role: AdminRole;
  value: ClientFileTab;
  onChange: (tab: ClientFileTab) => void;
  /** The tab panel's id is `${panelBase}-${tab}`. */
  panelBase: string;
}) {
  const tabs = clientFileTabsFor(role);
  const idBase = useId();
  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next === undefined) return;
    onChange(next.value);
    document.getElementById(`${idBase}-${next.value}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Ficha de la clienta"
      className="-mt-2 flex gap-1 overflow-x-auto border-b border-arena-linea px-7"
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${idBase}-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${panelBase}-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "-mb-px inline-flex h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-cuerpo text-tenue hover:text-texto focus-visible:shadow-foco",
              selected &&
                "border-rosa-profundo font-semibold text-rosa-enlace hover:text-rosa-enlace",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
