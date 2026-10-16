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
// inside the control.
export function MinutesInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div
      className={cn(
        "flex h-[44px] min-w-0 items-center overflow-hidden rounded-control border border-borde-fuerte bg-blanco focus-within:border-primario focus-within:shadow-foco has-[[aria-invalid=true]]:border-error",
        className,
      )}
    >
      <input
        inputMode="numeric"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-cuerpo text-texto tabular outline-none"
        {...props}
      />
      <span
        aria-hidden="true"
        className="flex h-full items-center border-l border-divisor bg-superficie px-3 text-nota text-texto-tenue"
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
