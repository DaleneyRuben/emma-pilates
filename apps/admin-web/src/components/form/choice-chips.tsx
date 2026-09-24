import { cn } from "../../lib/cn";

const chipClass =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border border-borde-fuerte bg-blanco px-3 py-2 text-nota text-texto-secundario has-focus-visible:shadow-foco";
const chosenClass =
  "border-primario bg-primario-tinte font-medium text-primario-profundo";

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
}: {
  legend: string;
  name: string;
  /** No chip is chosen while the value matches none of the options. */
  value: Value | "";
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex gap-2", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map(([option, label]) => (
        <label
          key={option}
          className={cn(chipClass, option === value && chosenClass)}
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
              className="size-3.5 accent-primario"
            />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
