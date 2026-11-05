import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "../../lib/cn";
import { phoneCountryByIso, type PhoneCountry } from "../../lib/phone-number";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { PhoneCountryList } from "./phone-country-list";
import type { PhoneValue } from "./phone-value";

function PhoneInput({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  onBlur: () => void;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const picked = useRef(false);
  const digitsRef = useRef<HTMLInputElement>(null);
  const country = phoneCountryByIso(value.iso);

  const pick = (next: PhoneCountry) => {
    picked.current = true;
    onChange({ ...value, iso: next.iso });
    setOpen(false);
  };

  return (
    <div className="flex min-h-[44px] w-full rounded-tarjeta border border-borde bg-lino focus-within:border-primario focus-within:shadow-foco has-[input[aria-invalid=true]]:border-error">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`País: ${country.name}, +${country.dial}`}
            className="flex shrink-0 items-center gap-1.5 rounded-l-tarjeta border-r border-arena-linea pr-2.5 pl-3 text-cuerpo font-semibold text-rosa-enlace hover:bg-rosa-tinte focus-visible:shadow-foco"
          >
            <span aria-hidden="true" className="leading-none">
              {country.flag}
            </span>
            <span className="tabular">+{country.dial}</span>
            <ChevronDown
              size={18}
              strokeWidth={1.6}
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label="Elige el país"
          className="flex max-h-[min(420px,var(--radix-popover-content-available-height))] w-[340px] max-w-[calc(100vw-32px)] flex-col"
          collisionPadding={16}
          onCloseAutoFocus={(event) => {
            if (!picked.current) return;
            picked.current = false;
            event.preventDefault();
            digitsRef.current?.focus();
          }}
        >
          <PhoneCountryList chosen={country} onPick={pick} />
        </PopoverContent>
      </Popover>
      <FormControl>
        <input
          ref={digitsRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name={name}
          placeholder={`${country.lengths[0] ?? 8} dígitos`}
          value={value.digits}
          onChange={(event) =>
            onChange({ ...value, digits: event.target.value })
          }
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-cuerpo text-texto tabular outline-none placeholder:text-texto-muy-tenue"
        />
      </FormControl>
    </div>
  );
}

/**
 * FIX-037 (follow-up 236, boards A5–A6): «Celular» is one box with a country
 * prefix «🇧🇴 +591 ⌄» that opens the country list; the digits follow. The
 * prefix's own label («País: …») never contains «Celular», so label lookups
 * of the digits stay unique.
 */
export function PhoneFormField<TFieldValues extends FieldValues, TTransformed>({
  control,
  name,
  description,
}: {
  control: Control<TFieldValues, unknown, TTransformed>;
  name: FieldPath<TFieldValues>;
  description?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Celular</FormLabel>
          <PhoneInput
            value={field.value as PhoneValue}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
          />
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
