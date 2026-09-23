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
        "block text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase",
        className,
      )}
      {...props}
    />
  );
}
