import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatWeekRange, weekStartOf } from "../../lib/bolivia-time";
import { Button } from "../ui/button";

/**
 * The Bolivia week on screen (its Monday) between arrows, with "Hoy" back to
 * the current week and the week's dates beside them (AW02, AW25).
 */
export function WeekStepper({
  monday,
  today,
  onChange,
}: {
  monday: string;
  today: string;
  onChange: (monday: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="neutral"
        size="icon"
        aria-label="Semana anterior"
        onClick={() => onChange(addDays(monday, -7))}
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <Button
        variant="neutral"
        size="icon"
        aria-label="Semana siguiente"
        onClick={() => onChange(addDays(monday, 7))}
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <Button
        variant="neutral"
        size="sm"
        onClick={() => onChange(weekStartOf(today))}
      >
        Hoy
      </Button>
      <p className="font-serif text-cuerpo-grande text-texto">
        {formatWeekRange(monday)}
      </p>
    </div>
  );
}
