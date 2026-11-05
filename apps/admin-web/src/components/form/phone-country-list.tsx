import { Check, Search } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";
import {
  frequentPhoneCountries,
  phoneCountries,
  searchPhoneCountries,
  type PhoneCountry,
} from "../../lib/phone-number";

const sectionClass =
  "px-4 pt-2.5 pb-1 text-[11px] font-medium tracking-[0.12em] text-texto-tenue uppercase";

// The arrow keys move from the search into the options and between them
// (Home/End jump); Enter or Space choose, as in the Branch selector.
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
  );
  const current = options.indexOf(document.activeElement as HTMLButtonElement);
  const last = options.length - 1;
  const next: Record<string, number> = {
    ArrowDown: current >= last ? 0 : current + 1,
    ArrowUp: current <= 0 ? last : current - 1,
    ...(current === -1 ? {} : { Home: 0, End: last }),
  };
  const target = next[event.key];
  if (target === undefined || options.length === 0) return;
  event.preventDefault();
  options[target]?.focus();
}

function CountryOption({
  country,
  selected = false,
  onPick,
}: {
  country: PhoneCountry;
  selected?: boolean;
  onPick: (country: PhoneCountry) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${country.name} +${country.dial}`}
      tabIndex={-1}
      onClick={() => onPick(country)}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 px-4 text-left text-cuerpo text-texto hover:bg-hover-fila focus-visible:bg-hover-fila focus-visible:shadow-none",
        selected && "bg-rosa-tinte hover:bg-rosa-tinte",
      )}
    >
      <span aria-hidden="true" className="leading-none">
        {country.flag}
      </span>
      <span className="flex-1 truncate">{country.name}</span>
      <span className="text-celda text-texto-tenue tabular">
        +{country.dial}
      </span>
      {selected ? (
        <Check
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-rosa-profundo"
        />
      ) : null}
    </button>
  );
}

function Section({
  title,
  countries,
  onPick,
}: {
  title: string;
  countries: readonly PhoneCountry[];
  onPick: (country: PhoneCountry) => void;
}) {
  return (
    <div role="group" aria-label={title}>
      <p aria-hidden="true" className={sectionClass}>
        {title}
      </p>
      {countries.map((country) => (
        <CountryOption key={country.iso} country={country} onPick={onPick} />
      ))}
    </div>
  );
}

// Boards A5–A6 (follow-up 236): a search, the chosen country ticked, the
// frequent ones, then every country A–Z. A search shows its matches alone.
export function PhoneCountryList({
  chosen,
  onPick,
}: {
  chosen: PhoneCountry;
  onPick: (country: PhoneCountry) => void;
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const others = (countries: readonly PhoneCountry[]) =>
    countries.filter((country) => country.iso !== chosen.iso);
  const matches = searchPhoneCountries(query);

  return (
    <div className="flex max-h-[inherit] flex-col py-2" onKeyDown={moveFocus}>
      <label className="mx-3 mb-2 flex h-10 shrink-0 items-center gap-2 rounded-control bg-lino px-3 focus-within:shadow-foco">
        <Search
          size={18}
          strokeWidth={1.6}
          aria-hidden="true"
          className="text-primario"
        />
        <input
          type="text"
          aria-label="Buscar país o código"
          placeholder="Buscar país o código"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-celda text-texto outline-none placeholder:text-texto-muy-tenue"
        />
      </label>
      <div
        role="listbox"
        aria-label="Países"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {searching ? (
          matches.map((country) => (
            <CountryOption
              key={country.iso}
              country={country}
              selected={country.iso === chosen.iso}
              onPick={onPick}
            />
          ))
        ) : (
          <>
            <CountryOption country={chosen} selected onPick={onPick} />
            <Section
              title="Frecuentes"
              countries={others(frequentPhoneCountries)}
              onPick={onPick}
            />
            <Section
              title="Todos los países"
              countries={others(phoneCountries)}
              onPick={onPick}
            />
          </>
        )}
      </div>
      {searching && matches.length === 0 ? (
        <p className="px-4 py-2 text-ayuda text-texto-tenue">
          No encontramos ese país.
        </p>
      ) : null}
    </div>
  );
}
