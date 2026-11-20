import { cn } from "../../lib/cn";
import { chipClass, selectedClass } from "./chip";

export type FilterChipOption<Value extends string> = {
  readonly value: Value | undefined;
  readonly label: string;
  /** Shown after a dot («Sin leer · 19») when known. */
  readonly count?: number;
};

/**
 * FIX-091: a list's filter as a row of chips, one chosen at a time (the
 * catch-all chip carries `undefined`). The chosen chip is the solid Rosa
 * profundo of the base (FIX-089).
 */
export function FilterChips<Value extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: Value | undefined;
  options: readonly FilterChipOption<Value>[];
  onChange: (value: Value | undefined) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const chosen = option.value === value;
        const text =
          option.count === undefined
            ? option.label
            : `${option.label} · ${option.count}`;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(option.value)}
            className={cn(chipClass, chosen && selectedClass)}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
