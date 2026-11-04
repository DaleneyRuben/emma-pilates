import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AdminPath, Destination } from "../../app/navigation";
import { cn } from "../../lib/cn";
import { useRail } from "../rail/use-rail";

type Result =
  | { kind: "page"; label: string; to: AdminPath }
  | { kind: "clients"; label: string; query: string };

// Accents and case aside, so «nutricion» finds Nutrición.
const folded = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const pagesOf = (destinations: readonly Destination[]) =>
  destinations.flatMap((destination) =>
    destination.tabs.flatMap((tab) =>
      [tab, ...(tab.views ?? [])].map((page) => ({
        to: page.to,
        label:
          destination.tabs.length === 1 && tab.views === undefined
            ? destination.label
            : `${destination.label} · ${page.label}`,
      })),
    ),
  );

const maxPages = 6;

/**
 * Follow-up 232's global search, Ctrl K: the pages the Role may open match
 * by name, and the last result searches Clientas for the words. Classes and
 * payments answer here once their pages search by text.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { destinations } = useRail();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const pages = useMemo(() => pagesOf(destinations), [destinations]);

  const words = query.trim();
  const results: Result[] =
    words === ""
      ? []
      : [
          ...pages
            .filter((page) => folded(page.label).includes(folded(words)))
            .slice(0, maxPages)
            .map((page) => ({ kind: "page" as const, ...page })),
          {
            kind: "clients",
            label: `Buscar «${words}» en Clientas`,
            query: words,
          },
        ];

  useEffect(() => {
    const focusOnCtrlK = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", focusOnCtrlK);
    return () => document.removeEventListener("keydown", focusOnCtrlK);
  }, []);

  const close = () => {
    setQuery("");
    setActive(0);
  };
  const choose = (result: Result) => {
    close();
    if (result.kind === "page") void navigate({ to: result.to });
    else void navigate({ to: "/clientas", search: { q: result.query } });
  };
  const optionId = (index: number) => `${listId}-${index}`;
  const open = results.length > 0;

  return (
    <div className={cn("relative", className)}>
      <label className="flex h-12 items-center gap-2.5 rounded-[14px] bg-lino px-4 focus-within:shadow-foco">
        <Search
          size={22}
          strokeWidth={1.6}
          aria-hidden="true"
          className="shrink-0 text-primario"
        />
        <input
          ref={input}
          role="combobox"
          aria-label="Buscar en todo"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(active) : undefined}
          placeholder="Buscar una clienta, una clase, un pago o una página"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onBlur={close}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close();
            } else if (open && event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => (index + 1) % results.length);
            } else if (open && event.key === "ArrowUp") {
              event.preventDefault();
              setActive(
                (index) => (index - 1 + results.length) % results.length,
              );
            } else if (open && event.key === "Enter") {
              event.preventDefault();
              const result = results[active];
              if (result !== undefined) choose(result);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-cuerpo text-texto outline-none placeholder:text-tenue focus-visible:shadow-none"
        />
        <kbd className="hidden rounded-[6px] bg-superficie px-2 py-0.5 font-sans text-pie text-tenue lg:inline">
          Ctrl K
        </kbd>
      </label>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-50 flex flex-col rounded-marco bg-superficie p-2 shadow-popover"
        >
          {results.map((result, index) => (
            <li
              key={result.kind === "page" ? result.to : "clientas"}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // The input keeps focus, so its blur does not close the list
              // before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(result)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-[10px] px-3 text-cuerpo text-texto",
                index === active && "bg-rosa-tinte text-rosa-enlace",
                result.kind === "clients" && "font-medium",
              )}
            >
              {result.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
