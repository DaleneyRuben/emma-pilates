import { cn } from "../../lib/cn";

/**
 * A small exclusive choice drawn as side-by-side chips over native radios,
 * so keyboard and screen readers get the platform's radio group behavior.
 */
export function ChoiceChips<Value extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">{legend}</legend>
      {options.map(([option, label]) => (
        <label
          key={option}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center rounded-control border border-borde-fuerte px-3 py-2 text-nota text-texto-secundario has-focus-visible:shadow-foco",
            option === value &&
              "border-primario bg-primario-tinte font-medium text-primario-profundo",
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
