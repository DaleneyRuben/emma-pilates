import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // FIX-089 (FormB): a 14 px weight-600 label above the field.
        "block text-celda font-semibold text-texto",
        className,
      )}
      {...props}
    />
  );
}
