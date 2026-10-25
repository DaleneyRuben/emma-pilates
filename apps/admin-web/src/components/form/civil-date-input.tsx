import { useState, type ChangeEvent, type ComponentProps } from "react";
import { Input } from "../ui/input";
import { displayCivilDate, maskCivilDate, parseCivilDate } from "./civil-date";

type CivilDateInputProps = Omit<
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
 * A Bolivia civil date the Administrator types as `dd/mm/aaaa`. The form
 * keeps `YYYY-MM-DD` once the text is a real date, and the typed text
 * otherwise, so an invalid date stays on screen and cannot be submitted.
 */
export function CivilDateInput({
  value,
  onChange,
  onBlur,
  placeholder = "dd/mm/aaaa",
  ...props
}: CivilDateInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? displayCivilDate(value);

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={shown}
      onChange={(event) => {
        const raw = event.target.value;
        const filled = !isKeystroke(event) ? parseCivilDate(raw) : null;
        const text =
          filled === null ? maskCivilDate(raw) : displayCivilDate(filled);
        const parsed = parseCivilDate(text);
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
