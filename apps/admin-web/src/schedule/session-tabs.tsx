import type { KeyboardEvent, ReactNode } from "react";
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
      className="mx-7 flex gap-4 overflow-x-auto border-b border-divisor"
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
              "-mb-px inline-flex h-11 shrink-0 items-center border-b-[3px] border-transparent px-0.5 text-cuerpo text-texto focus-visible:shadow-foco",
              selected && "border-rosa-profundo font-bold",
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
