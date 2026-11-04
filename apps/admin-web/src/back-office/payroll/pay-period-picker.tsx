import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChoiceChips } from "../../components/form/choice-chips";
import { CivilDateInput } from "../../components/form/civil-date-input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  addDays,
  addMonths,
  boliviaMonth,
  boliviaToday,
  weekStartOf,
} from "../../lib/bolivia-time";
import {
  searchFor,
  windowOf,
  type PayPeriodKind,
  type PayStatementsSearch,
} from "./pay-period-search";

const kinds = [
  ["day", "Día"],
  ["week", "Semana"],
  ["range", "Rango"],
  ["month", "Mes"],
] as const;

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
        className="min-w-[150px] text-center font-serif text-cuerpo-grande text-texto"
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
 * BKO-009: Día · Semana · Rango · Mes over Sueldos › Por aprobar. Día, Semana
 * and Mes step with arrows; Rango takes two `dd/mm/aaaa` dates, both included.
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ChoiceChips<PayPeriodKind>
          legend="Período"
          name="pay-period"
          value={shown.kind}
          options={kinds}
          onChange={(kind) => onChange(searchFor(kind, search, today))}
          className="w-full sm:w-auto"
        />
        {shown.kind === "range" ? null : (
          <PeriodStepper
            names={stepNames[shown.kind]}
            label={shown.label}
            atLatest={atLatest}
            onStep={step}
          />
        )}
      </div>
      {shown.kind === "range" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-period-from">Desde</Label>
            <CivilDateInput
              id="pay-period-from"
              className="w-[150px]"
              value={shown.from}
              onChange={(value) => setRange("from", value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-period-to">Hasta</Label>
            <CivilDateInput
              id="pay-period-to"
              className="w-[150px]"
              value={shown.to}
              onChange={(value) => setRange("to", value)}
            />
          </div>
        </div>
      ) : null}
      {shown.kind === "range" && shown.query === null ? (
        <p role="alert" className="text-ayuda text-error-texto">
          La fecha final no puede ser anterior a la inicial.
        </p>
      ) : null}
    </div>
  );
}
