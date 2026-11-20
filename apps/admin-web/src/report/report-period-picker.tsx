import { useId, useState } from "react";
import { parseCivilDate } from "../components/form/civil-date";
import { CivilDateInput } from "../components/form/civil-date-input";
import { FilterChips } from "../components/ui/filter-chips";
import { periodOf, periodRange, type ReportPeriod } from "./report-period";
import type { ReportRange } from "./report-search";

function DateField({
  label,
  value,
  onChange,
  rangeStart,
  rangeEnd,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rangeStart?: string;
  rangeEnd?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto uppercase"
      >
        {label}
      </label>
      <CivilDateInput
        id={id}
        value={value}
        onChange={onChange}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        align={rangeStart === undefined ? "start" : "end"}
        className="w-auto"
        inputClassName="h-[34px] text-nota"
      />
    </div>
  );
}

// The range fields keep what was typed; only an ordered pair reaches the
// address (and the reports).
function RangeFields({
  range,
  onChange,
}: {
  range: ReportRange;
  onChange: (range: ReportRange) => void;
}) {
  const [draft, setDraft] = useState(range);
  const [shown, setShown] = useState(range);
  if (shown.from !== range.from || shown.to !== range.to) {
    setShown(range);
    setDraft(range);
  }
  const backwards = draft.from > draft.to;
  const change = (next: ReportRange) => {
    setDraft(next);
    if (
      parseCivilDate(next.from) !== null &&
      parseCivilDate(next.to) !== null &&
      next.from <= next.to
    ) {
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <DateField
          label="Desde"
          value={draft.from}
          onChange={(from) => change({ ...draft, from })}
          rangeEnd={draft.to}
        />
        <DateField
          label="Hasta"
          value={draft.to}
          onChange={(to) => change({ ...draft, to })}
          rangeStart={draft.from}
        />
      </div>
      {backwards ? (
        <p role="alert" className="text-ayuda text-texto">
          La fecha inicial no puede ser posterior a la final.
        </p>
      ) : null}
    </div>
  );
}

type Chip = ReportPeriod | "custom";

const chips: { value: Chip; label: string }[] = [
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Últimos 3 meses" },
  { value: "half", label: "Últimos 6 meses" },
  { value: "custom", label: "Elegir fechas" },
];

/**
 * FIX-091 (W5 B): the period as chips that end today. «Elegir fechas», or
 * an address naming a range no chip is, shows the Desde and Hasta fields.
 */
export function ReportPeriodPicker({
  range,
  today,
  onChange,
}: {
  range: ReportRange;
  today: string;
  onChange: (range: ReportRange) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  const chosen: Chip = choosing
    ? "custom"
    : (periodOf(range, today) ?? "custom");
  return (
    <div className="flex flex-col items-end gap-2">
      <FilterChips<Chip>
        label="Período"
        value={chosen}
        options={chips}
        onChange={(value) => {
          if (value === undefined) return;
          setChoosing(value === "custom");
          if (value !== "custom") onChange(periodRange(value, today));
        }}
      />
      {chosen === "custom" ? (
        <RangeFields range={range} onChange={onChange} />
      ) : null}
    </div>
  );
}
