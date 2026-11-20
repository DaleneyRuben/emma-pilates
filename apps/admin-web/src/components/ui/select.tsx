import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Native select: the platform already gives it keyboard and screen-reader
// behavior (ADR-0040 prefers semantic HTML where it suffices).
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "select-chevron h-[44px] w-full rounded-panel border-[1.5px] border-borde-fuerte bg-superficie px-3 pr-9 tipo-cuerpo text-texto focus-visible:border-primario focus-visible:shadow-foco disabled:bg-superficie-hundida disabled:border-borde aria-invalid:border-2 aria-invalid:border-primario",
        className,
      )}
      {...props}
    />
  );
}
