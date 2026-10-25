import { useState, type ChangeEvent, type ComponentProps } from "react";
import { Input } from "../ui/input";
import { maskCivilTime, parseCivilTime } from "./civil-time";

type CivilTimeInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

/** A fill or a paste arrives whole; a keystroke is one character. */
const isKeystroke = (event: ChangeEvent<HTMLInputElement>): boolean =>
  event.nativeEvent instanceof InputEvent &&
  event.nativeEvent.inputType === "insertText" &&
  (event.nativeEvent.data ?? "").length <= 1;

/**
 * A 24-hour wall clock the Administrator types as `HH:mm`. A real clock is
 * what the form keeps; an invalid one stays as typed and cannot be submitted.
 */
export function CivilTimeInput({
  value,
  onChange,
  onBlur,
  placeholder = "hh:mm",
  ...props
}: CivilTimeInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={draft ?? value}
      onChange={(event) => {
        const raw = event.target.value;
        const filled = !isKeystroke(event) ? parseCivilTime(raw) : null;
        const text = filled ?? maskCivilTime(raw);
        const parsed = parseCivilTime(text);
        setDraft(parsed === null ? text : null);
        onChange(parsed ?? text);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
