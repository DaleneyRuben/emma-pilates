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
        // Follow-up 285: a field's label is `compacto` in 600.
        "block tipo-compacto-600 text-texto",
        className,
      )}
      {...props}
    />
  );
}
