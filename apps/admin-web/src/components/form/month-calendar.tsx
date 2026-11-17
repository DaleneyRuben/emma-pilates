import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatMonth,
  weekdayName,
  weekdayOf,
} from "../../lib/bolivia-time";
import { cn } from "../../lib/cn";

/** Where a day sits in a drawn range, for the Rosa tinte band. */
type RangePlace = "start" | "end" | "inside" | "single";

export type CalendarLimits = {
  min?: string;
  max?: string;
  minReason: string;
  maxReason: string;
};

const heads = ["L", "M", "M", "J", "V", "S", "D"];

const monthTitle = (month: string): string => {
  const name = formatMonth(month).replace(" de ", " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const dayName = (date: string): string =>
  `${weekdayName(weekdayOf(date))}, ${formatDayMonth(date)} de ${date.slice(0, 4)}`;

/** The days of `month` (`YYYY-MM`), padded with nulls to whole weeks. */
const monthDays = (month: string): (string | null)[] => {
  const first = `${month}-01`;
  const days: (string | null)[] = Array.from(
    { length: weekdayOf(first) - 1 },
    () => null,
  );
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) {
    days.push(date);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

const placeOf = (
  date: string,
  start: string | null,
  end: string | null,
): RangePlace | undefined => {
  if (end === null || start === null) {
    if (date === start) return "start";
    if (date === end) return "end";
    return undefined;
  }
  if (end < start) return undefined;
  if (start === end) return date === start ? "single" : undefined;
  if (date === start) return "start";
  if (date === end) return "end";
  return date > start && date < end ? "inside" : undefined;
};

const bands: Record<RangePlace, string> = {
  start:
    "bg-[linear-gradient(to_right,transparent_50%,var(--color-primario-tinte)_50%)]",
  end: "bg-[linear-gradient(to_right,var(--color-primario-tinte)_50%,transparent_50%)]",
  inside: "bg-primario-tinte",
  single: "",
};

const arrows: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/**
 * Follow-up 266 (265's option A): one month, Monday first, like the client
 * app's `Calendar` (FIX-053). A picked day is a Rosa profundo circle, a
 * range a Rosa tinte band, today a ring; a day outside the limits is struck
 * through and, when clicked, says why.
 */
export function MonthCalendar({
  selected,
  rangeStart,
  rangeEnd,
  today,
  limits,
  focusOnMount,
  onPick,
  onClear,
}: {
  selected: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  today: string;
  limits: CalendarLimits;
  focusOnMount: boolean;
  onPick: (date: string) => void;
  onClear: () => void;
}) {
  const opening = selected ?? rangeStart ?? rangeEnd ?? today;
  const [month, setMonth] = useState(opening.slice(0, 7));
  const [focused, setFocused] = useState(opening);
  const [reason, setReason] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  // Focus follows the focused day only while the keyboard drives the grid.
  const [moving, setMoving] = useState(focusOnMount);

  // A typed date moves the calendar to its month.
  const [seen, setSeen] = useState(selected);
  if (selected !== seen) {
    setSeen(selected);
    // The date came from the field: the cursor stays there.
    setMoving(false);
    if (selected !== null) {
      setMonth(selected.slice(0, 7));
      setFocused(selected);
    }
  }

  useEffect(() => {
    if (!moving) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus();
  }, [focused, month, moving]);

  const why = (date: string): string | null => {
    if (limits.min !== undefined && date < limits.min) return limits.minReason;
    if (limits.max !== undefined && date > limits.max) return limits.maxReason;
    return null;
  };

  const pick = (date: string) => {
    const refused = why(date);
    if (refused === null) onPick(date);
    else setReason(refused);
  };

  const turn = (count: number) => {
    setReason(null);
    setMonth((current) => addMonths(current, count));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = arrows[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setMoving(true);
    const next = addDays(focused, step);
    setFocused(next);
    setMonth(next.slice(0, 7));
  };

  const start = rangeStart ?? (rangeEnd === null ? null : selected);
  const end = rangeEnd ?? (rangeStart === null ? null : selected);
  const focusable = focused.startsWith(month) ? focused : `${month}-01`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => turn(-1)}
          className="flex size-10 items-center justify-center rounded-full text-rosa-profundo hover:bg-primario-tinte focus-visible:shadow-foco"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <span
          aria-live="polite"
          className="font-serif text-cuerpo-grande text-texto"
        >
          {monthTitle(month)}
        </span>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => turn(1)}
          className="flex size-10 items-center justify-center rounded-full text-rosa-profundo hover:bg-primario-tinte focus-visible:shadow-foco"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
      <div aria-hidden className="grid grid-cols-7">
        {heads.map((head, index) => (
          <span
            key={index}
            className="py-1 text-center text-etiqueta font-medium tracking-[0.06em] text-texto-tenue"
          >
            {head}
          </span>
        ))}
      </div>
      <div
        ref={grid}
        role="group"
        aria-label={monthTitle(month)}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-y-0.5"
      >
        {monthDays(month).map((date, index) => {
          if (date === null) return <span key={`blank-${index}`} />;
          const refused = why(date) !== null;
          const place = placeOf(date, start, end);
          const picked = date === selected || date === start || date === end;
          const isToday = date === today;
          return (
            <span
              key={date}
              className={cn(
                "flex h-10 items-center justify-center",
                place === undefined || start === null || end === null
                  ? ""
                  : bands[place],
              )}
            >
              <button
                type="button"
                data-date={date}
                data-range={place}
                tabIndex={date === focusable ? 0 : -1}
                aria-label={`${dayName(date)}${isToday ? ", hoy" : ""}${refused ? ", no disponible" : ""}`}
                aria-pressed={picked}
                aria-disabled={refused || undefined}
                onClick={() => pick(date)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-[1.5px] border-transparent text-celda tabular focus-visible:shadow-foco",
                  picked
                    ? "bg-rosa-profundo font-semibold text-blanco"
                    : "text-texto hover:bg-primario-tinte",
                  isToday && !picked && "border-rosa-profundo font-semibold",
                  refused &&
                    "cursor-not-allowed text-deshabilitado-texto line-through hover:bg-transparent",
                )}
              >
                {Number(date.slice(8, 10))}
              </button>
            </span>
          );
        })}
      </div>
      {reason === null ? null : (
        <p role="status" className="mx-1 text-nota text-error-texto">
          {reason}
        </p>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-divisor pt-2">
        <button
          type="button"
          onClick={() => pick(today)}
          className="h-9 rounded-control px-2.5 text-nota font-semibold text-rosa-enlace hover:bg-primario-tinte focus-visible:shadow-foco"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded-control px-2.5 text-nota font-medium text-texto-tenue hover:bg-primario-tinte focus-visible:shadow-foco"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
