import type { KeyboardEvent, ReactNode } from "react";
import {
  segmentClass,
  segmentCompactClass,
  segmentCurrentClass,
  segmentedBarClass,
} from "../components/ui/segmented";
import { cn } from "../lib/cn";

export type SessionTab = "reservas" | "editar" | "serie";

const sessionTabId = (base: string, tab: SessionTab) => `${base}-tab-${tab}`;
const sessionTabPanelId = (base: string, tab: SessionTab) =>
  `${base}-panel-${tab}`;

// FIX-091 (W1, Editar clase A): the class panel's tabs on a Rubor hairline,
// the chosen one in bold over a Rosa profundo underline. Arrow keys move
// between them (WAI-ARIA tabs).
export function SessionTabs({
  tabs,
  value,
  onChange,
  idBase,
}: {
  tabs: readonly { value: SessionTab; label: string }[];
  value: SessionTab;
  onChange: (tab: SessionTab) => void;
  idBase: string;
}) {
  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next === undefined) return;
    onChange(next.value);
    document.getElementById(sessionTabId(idBase, next.value))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Clase"
      // Rosa Emma (RW-horario-clase): the panel's tabs as the white
      // segmented bar, the chosen one solid Rosa profundo.
      className={cn(segmentedBarClass, "mx-7 flex-nowrap overflow-x-auto")}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={sessionTabId(idBase, tab.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={sessionTabPanelId(idBase, tab.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              segmentClass,
              segmentCompactClass,
              segmentCompactClass,
              "shrink-0",
              selected && segmentCurrentClass,
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function SessionTabPanel({
  tab,
  idBase,
  children,
}: {
  tab: SessionTab;
  idBase: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={sessionTabPanelId(idBase, tab)}
      aria-labelledby={sessionTabId(idBase, tab)}
      className="flex flex-1 flex-col"
    >
      {children}
    </div>
  );
}
