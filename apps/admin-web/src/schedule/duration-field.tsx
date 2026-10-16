import type { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { cn } from "../lib/cn";

// Follow-up 98: AW07's former Duración box, with the fixed «min» suffix
// inside the control; a weekly row uses the compact padding.
export function MinutesInput({
  className,
  compact = false,
  ...props
}: ComponentProps<"input"> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[44px] min-w-0 items-center overflow-hidden rounded-control border border-borde-fuerte bg-blanco focus-within:border-primario focus-within:shadow-foco has-[[aria-invalid=true]]:border-error",
        className,
      )}
    >
      <input
        inputMode="numeric"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-cuerpo text-texto tabular outline-none",
          compact ? "pr-2 pl-2.5" : "px-3",
        )}
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-full items-center border-l border-divisor bg-superficie text-nota text-texto-tenue",
          compact ? "px-2" : "px-3",
        )}
      >
        min
      </span>
    </div>
  );
}

export function DurationField({ description }: { description?: string }) {
  const { control } = useFormContext<{ durationMinutes: string }>();
  return (
    <FormField
      control={control}
      name="durationMinutes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Duración</FormLabel>
          <FormControl>
            <MinutesInput {...field} />
          </FormControl>
          {description === undefined ? null : (
            <FormDescription>{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
