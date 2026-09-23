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
        "h-[44px] w-full rounded-control border border-borde-fuerte bg-blanco px-3 text-cuerpo text-texto tabular placeholder:text-texto-muy-tenue focus-visible:border-primario focus-visible:shadow-foco disabled:bg-deshabilitado disabled:text-deshabilitado-texto aria-invalid:border-error",
        className,
      )}
      {...props}
    />
  );
}
