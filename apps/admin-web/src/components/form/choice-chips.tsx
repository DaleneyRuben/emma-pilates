import { cn } from "../../lib/cn";
import { chipClass as baseChip, selectedClass } from "../ui/chip";

const chipClass = cn(baseChip, "flex flex-1 cursor-pointer");
const chosenClass = selectedClass;

/**
 * A small exclusive choice drawn as side-by-side chips over native radios,
 * so keyboard and screen readers get the platform's radio group behavior.
 * `className` lays the chips out differently (AW24's 2×2 Role grid).
 */
export function ChoiceChips<Value extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
  showLegend = false,
  onStrong = false,
}: {
  legend: string;
  name: string;
  /** No chip is chosen while the value matches none of the options. */
  value: Value | "";
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
  className?: string;
  /** Draw the legend as a field label above the chips. */
  showLegend?: boolean;
  /** Over a Rosa profundo head: white outline, the chosen one solid white. */
  onStrong?: boolean;
}) {
  return (
    <fieldset className={cn("flex gap-2", className)}>
      <legend
        className={showLegend ? "mb-2 tipo-compacto-600 text-texto" : "sr-only"}
      >
        {legend}
      </legend>
      {options.map(([option, label]) => (
        <label
          key={option}
          className={cn(
            chipClass,
            option === value && chosenClass,
            onStrong &&
              (option === value
                ? "bg-blanco text-texto inset-ring-blanco hover:bg-blanco"
                : "bg-transparent text-sobre-primario inset-ring-[1.5px] inset-ring-blanco hover:bg-blanco/10"),
          )}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={option === value}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/** The same chips over native checkboxes, for a choice of several. */
export function MultiChoiceChips<Value extends string>({
  legend,
  name,
  values,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  values: readonly Value[];
  options: readonly (readonly [Value, string])[];
  onChange: (values: Value[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{legend}</legend>
      {options.map(([option, label]) => {
        const checked = values.includes(option);
        return (
          <label
            key={option}
            className={cn(chipClass, "flex-none", checked && chosenClass)}
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? values.filter((value) => value !== option)
                    : [...values, option],
                )
              }
              className="sr-only"
            />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
