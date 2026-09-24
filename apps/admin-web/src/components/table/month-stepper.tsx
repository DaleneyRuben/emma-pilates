import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth } from "../../lib/bolivia-time";
import { Button } from "../ui/button";

/**
 * A month picker drawn as arrows around the month's name ("septiembre de
 * 2026"): browsers disagree on native month inputs, and a later month than
 * `latest` has nothing to show yet.
 */
export function MonthStepper({
  month,
  latest,
  onChange,
}: {
  month: string;
  latest: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="neutral"
        size="icon"
        aria-label="Mes anterior"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <p
        aria-live="polite"
        className="min-w-[150px] text-center font-serif text-[17px] text-texto"
      >
        {formatMonth(month)}
      </p>
      <Button
        variant="neutral"
        size="icon"
        aria-label="Mes siguiente"
        disabled={month >= latest}
        onClick={() => onChange(addMonths(month, 1))}
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </div>
  );
}
