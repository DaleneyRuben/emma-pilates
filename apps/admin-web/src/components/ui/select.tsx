import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Native select: the platform already gives it keyboard and screen-reader
// behavior (ADR-0040 prefers semantic HTML where it suffices).
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-[44px] w-full rounded-control border border-borde-fuerte bg-blanco px-3 text-cuerpo text-texto focus-visible:border-primario focus-visible:shadow-foco disabled:bg-deshabilitado disabled:text-deshabilitado-texto aria-invalid:border-error",
        className,
      )}
      {...props}
    />
  );
}
