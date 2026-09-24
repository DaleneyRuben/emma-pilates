import { useId } from "react";
import { Select } from "../ui/select";

/**
 * One allowlisted filter (ADR-0062) whose value lives in the route search
 * (ADR-0042); changing it goes back to the first page.
 */
export function ListFilter<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase"
      >
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="h-[34px] w-auto min-w-[140px] text-nota"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
