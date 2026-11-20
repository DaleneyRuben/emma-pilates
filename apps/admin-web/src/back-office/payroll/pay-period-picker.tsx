import { ChevronLeft, ChevronRight } from "lucide-react";
import { CivilDateInput } from "../../components/form/civil-date-input";
import { Button } from "../../components/ui/button";
import { TextLink } from "../../components/ui/text-link";
import { fieldMessageClass } from "../../components/form/form";
import { Label } from "../../components/ui/label";
import {
  addDays,
  addMonths,
  boliviaMonth,
  boliviaToday,
  weekStartOf,
} from "../../lib/bolivia-time";
import {
  otherPeriodSearch,
  searchFor,
  windowOf,
  type PayStatementsSearch,
} from "./pay-period-search";

const stepNames = {
  day: ["Día anterior", "Día siguiente"],
  week: ["Semana anterior", "Semana siguiente"],
  month: ["Mes anterior", "Mes siguiente"],
} as const;

function PeriodStepper({
  names,
  label,
  atLatest,
  onStep,
}: {
  names: readonly [string, string];
  label: string;
  atLatest: boolean;
  onStep: (step: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="neutral"
        size="icon"
        aria-label={names[0]}
        onClick={() => onStep(-1)}
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <p
        aria-live="polite"
        className="min-w-[150px] text-center tipo-titulo-bloque text-texto"
      >
        {label}
      </p>
      <Button
        variant="neutral"
        size="icon"
        aria-label={names[1]}
        disabled={atLatest}
        onClick={() => onStep(1)}
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * BKO-009, FIX-084 (Sueldos B): one control, «‹ Noviembre de 2026 ›», with
 * «Otro período» for a range of days (both included, typed `dd/mm/aaaa`).
 * A day or a week opened by its address still steps with arrows; every
 * other period goes back to its month with «Volver al mes».
 */
export function PayPeriodPicker({
  search,
  onChange,
}: {
  search: PayStatementsSearch;
  onChange: (search: PayStatementsSearch) => void;
}) {
  const today = boliviaToday();
  const shown = windowOf(search, today);
  const step = (direction: -1 | 1) => {
    if (shown.kind === "month") {
      onChange({ month: addMonths(search.month, direction) });
    } else if (shown.kind === "day" || shown.kind === "week") {
      const date = addDays(
        shown.date,
        direction * (shown.kind === "day" ? 1 : 7),
      );
      onChange({ month: date.slice(0, 7), period: shown.kind, date });
    }
  };
  const atLatest =
    shown.kind === "month"
      ? search.month >= boliviaMonth()
      : shown.kind === "week"
        ? shown.date >= weekStartOf(today)
        : shown.date >= today;
  const setRange = (end: "from" | "to", value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const range = { from: shown.from, to: shown.to, [end]: value };
    onChange({ month: range.from.slice(0, 7), period: "range", ...range });
  };
  const otherPeriod = () => onChange(otherPeriodSearch(search, today));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 self-start rounded-tarjeta bg-superficie py-1.5 pr-4 pl-1.5 shadow-tarjeta">
        {shown.kind === "range" ? null : (
          <PeriodStepper
            names={stepNames[shown.kind]}
            label={shown.label}
            atLatest={atLatest}
            onStep={step}
          />
        )}
        {shown.kind === "month" ? (
          <TextLink className="h-9 rounded-control px-1" onClick={otherPeriod}>
            Otro período
          </TextLink>
        ) : (
          <TextLink
            className="h-9 rounded-control px-1"
            onClick={() => onChange(searchFor("month", search, today))}
          >
            Volver al mes
          </TextLink>
        )}
      </div>
      {shown.kind === "range" ? (
        // Follow-up 285: the range's labels and its error are small text, so
        // they sit in a white card, never loose on the page 100 (rule 3).
        <div className="flex flex-col gap-2 self-start rounded-tarjeta bg-superficie px-4 py-3.5 shadow-tarjeta">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-period-from">Desde</Label>
              <CivilDateInput
                id="pay-period-from"
                className="w-[150px]"
                value={shown.from}
                rangeEnd={shown.to}
                onChange={(value) => setRange("from", value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-period-to">Hasta</Label>
              <CivilDateInput
                id="pay-period-to"
                className="w-[150px]"
                value={shown.to}
                rangeStart={shown.from}
                align="end"
                onChange={(value) => setRange("to", value)}
              />
            </div>
          </div>
          {shown.query === null ? (
            <p role="alert" className={fieldMessageClass}>
              La fecha final no puede ser anterior a la inicial.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
