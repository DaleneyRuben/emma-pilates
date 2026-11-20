import type { AdminClientDto } from "@pilates/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { ClientResult } from "./client-result";
import { useClientMatches } from "./use-client-matches";

type Result =
  { kind: "client"; client: AdminClientDto } | { kind: "all"; words: string };

/**
 * Follow-up 232's global search, Ctrl K, narrowed by FIX-091 (W9 B) to
 * Clientas: her matches answer while typing and open her file; the last
 * result lists every match in Clientas. Classes and payments are searched in
 * Horario, Pagos and her file.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const words = query.trim();
  const matches = useClientMatches(words);

  const results: Result[] =
    matches.clients.length === 0
      ? []
      : [
          ...matches.clients.map((client) => ({
            kind: "client" as const,
            client,
          })),
          { kind: "all", words },
        ];
  const current = Math.min(active, Math.max(results.length - 1, 0));

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
    if (result.kind === "all") {
      void navigate({ to: "/clientas", search: { q: result.words } });
    } else {
      // Searched by her email, so Clientas lists her and opens her file
      // (walkthrough finding 88).
      void navigate({
        to: "/clientas",
        search: { q: result.client.email, cliente: result.client.id },
      });
    }
  };
  const optionId = (index: number) => `${listId}-${index}`;
  const open = results.length > 0;
  const status = (() => {
    if (words === "" || open) return null;
    if (matches.failed) return "No pudimos buscar. Inténtalo de nuevo.";
    return matches.settled ? `Ninguna clienta con «${words}»` : "Buscando…";
  })();

  return (
    <div className={cn("relative", className)}>
      <label className="flex h-11 items-center gap-2.5 rounded-boton bg-superficie px-3.5 shadow-tarjeta focus-within:shadow-foco">
        <Search
          size={18}
          strokeWidth={1.6}
          aria-hidden="true"
          className="shrink-0 text-primario"
        />
        <input
          ref={input}
          role="combobox"
          aria-label="Buscar una clienta"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(current) : undefined}
          placeholder="Buscar una clienta"
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
              setActive((current + 1) % results.length);
            } else if (open && event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current - 1 + results.length) % results.length);
            } else if (words !== "" && event.key === "Enter") {
              event.preventDefault();
              // Before the matches answer these words (none yet, or older
              // ones), Enter lists every match instead of opening a Clienta.
              const result =
                open && matches.settled
                  ? results[current]
                  : ({ kind: "all", words } as const);
              if (result !== undefined) choose(result);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-celda text-texto outline-none placeholder:text-texto focus-visible:shadow-none"
        />
        <kbd className="hidden rounded-[6px] px-1.5 py-0.5 font-sans text-pie font-semibold text-texto ring-1 ring-borde lg:inline">
          Ctrl K
        </kbd>
      </label>
      {words === "" ? null : (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 flex flex-col gap-1 rounded-[18px] bg-superficie p-2 shadow-popover">
          <p className="px-3 pt-1 text-nota text-texto">
            Busca clientas por nombre, celular o correo
          </p>
          {status === null ? null : (
            <p role="status" className="px-3 py-2 text-cuerpo text-texto">
              {status}
            </p>
          )}
          {open ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Clientas"
              className="flex flex-col"
            >
              {results.map((result, index) => (
                <li
                  key={result.kind === "client" ? result.client.id : "all"}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === current}
                  // The input keeps focus, so its blur does not close the
                  // list before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(result)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-1.5 text-cuerpo",
                    index === current && "bg-superficie-hundida",
                    result.kind === "all" && "font-medium text-texto",
                  )}
                >
                  {result.kind === "client" ? (
                    <ClientResult client={result.client} />
                  ) : (
                    `Ver todas las clientas con «${result.words}»`
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
