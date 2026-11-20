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
    // Rosa Emma (RW-gastos, RW-informes): a white card around the arrows
    // and the month in Lora, so it reads on the page and on the band.
    <div className="flex items-center gap-2 self-start rounded-tarjeta bg-superficie p-1.5 shadow-tarjeta">
      <Button
        variant="neutral"
        size="icon"
        className="size-[44px] rounded-[10px] inset-ring-borde-fuerte md:size-8"
        aria-label="Mes anterior"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <p
        aria-live="polite"
        className="min-w-[150px] text-center tipo-titulo-bloque text-texto"
      >
        {formatMonth(month)}
      </p>
      <Button
        variant="neutral"
        size="icon"
        className="size-[44px] rounded-[10px] inset-ring-borde-fuerte md:size-8"
        aria-label="Mes siguiente"
        disabled={month >= latest}
        onClick={() => onChange(addMonths(month, 1))}
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </div>
  );
}
