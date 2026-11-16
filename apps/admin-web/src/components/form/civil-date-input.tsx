import { CalendarDays } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { boliviaToday, formatCivilDate } from "../../lib/bolivia-time";
import { cn } from "../../lib/cn";
import { Input } from "../ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { displayCivilDate, maskCivilDate, parseCivilDate } from "./civil-date";
import { MonthCalendar } from "./month-calendar";

type CivilDateInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange" | "min" | "max"
> & {
  value: string;
  onChange: (value: string) => void;
  /** First and last days the calendar lets the Administrator pick. */
  min?: string;
  max?: string;
  /** Why a day before `min` or after `max` cannot be picked. */
  minReason?: string;
  maxReason?: string;
  /** The other end of a range this field closes or opens, for the band. */
  rangeStart?: string;
  rangeEnd?: string;
  /** The right field of a pair aligns its calendar to its right edge. */
  align?: "start" | "end";
  /** Classes for the text field itself; `className` sizes the whole field. */
  inputClassName?: string;
};

/** A fill or a paste arrives whole; a keystroke is one character. */
const isKeystroke = (event: ChangeEvent<HTMLInputElement>): boolean =>
  event.nativeEvent instanceof InputEvent &&
  event.nativeEvent.inputType === "insertText" &&
  (event.nativeEvent.data ?? "").length <= 1;

const isoOrNull = (value: string | undefined): string | null =>
  value === undefined ? null : parseCivilDate(value);

/**
 * A Bolivia civil date the Administrator types as `dd/mm/aaaa` or picks
 * from a small month calendar under the field (finding 83, follow-up 266).
 * The form keeps `YYYY-MM-DD` once the text is a real date, and the typed
 * text otherwise, so an invalid date stays on screen and cannot be submitted.
 */
export function CivilDateInput({
  value,
  onChange,
  onBlur,
  onClick,
  placeholder = "dd/mm/aaaa",
  min,
  max,
  minReason,
  maxReason,
  rangeStart,
  rangeEnd,
  align = "start",
  className,
  inputClassName,
  disabled,
  ref,
  ...props
}: CivilDateInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Opened from the field, focus stays there for typing; from the button,
  // it moves to the day.
  const [fromButton, setFromButton] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const shown = draft ?? displayCivilDate(value);

  const write = (next: string) => {
    setDraft(null);
    onChange(next);
    returnFocus.current = true;
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchor} className={cn("relative w-full", className)}>
          <Input
            {...props}
            ref={(node) => {
              field.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder}
            disabled={disabled}
            value={shown}
            className={cn("pr-11", inputClassName)}
            onClick={(event) => {
              onClick?.(event);
              setFromButton(false);
              setOpen(true);
            }}
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
          <button
            type="button"
            aria-label="Elegir en el calendario"
            aria-expanded={open}
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={() => {
              setFromButton(true);
              setOpen(!open);
            }}
            className="absolute inset-y-0.5 right-0.5 flex aspect-square items-center justify-center rounded-control text-rosa-profundo hover:bg-primario-tinte focus-visible:shadow-foco disabled:text-deshabilitado-texto"
          >
            <CalendarDays aria-hidden className="size-5" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        role="dialog"
        aria-label="Calendario"
        align={align}
        className="w-[304px] p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current) field.current?.focus();
          returnFocus.current = false;
        }}
        onEscapeKeyDown={() => {
          returnFocus.current = true;
        }}
        onInteractOutside={(event) => {
          if (anchor.current?.contains(event.target as Node)) {
            event.preventDefault();
          }
        }}
      >
        <MonthCalendar
          selected={parseCivilDate(value)}
          rangeStart={isoOrNull(rangeStart)}
          rangeEnd={isoOrNull(rangeEnd)}
          today={boliviaToday()}
          limits={{
            min: isoOrNull(min) ?? undefined,
            max: isoOrNull(max) ?? undefined,
            minReason:
              minReason ??
              `Elige una fecha desde el ${formatCivilDate(min ?? "")}.`,
            maxReason:
              maxReason ??
              `Elige una fecha hasta el ${formatCivilDate(max ?? "")}.`,
          }}
          focusOnMount={fromButton}
          onPick={write}
          onClear={() => write("")}
        />
      </PopoverContent>
    </Popover>
  );
}
