import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Input({
  className,
  type = "text",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[44px] w-full rounded-panel border border-borde bg-crema px-3 text-cuerpo text-texto tabular placeholder:text-texto-muy-tenue focus-visible:border-primario focus-visible:shadow-foco disabled:opacity-70 aria-invalid:border-rosa-profundo aria-invalid:inset-ring aria-invalid:inset-ring-rosa-profundo",
        className,
      )}
      {...props}
    />
  );
}
