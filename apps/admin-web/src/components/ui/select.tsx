import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Native select: the platform already gives it keyboard and screen-reader
// behavior (ADR-0040 prefers semantic HTML where it suffices).
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "select-chevron h-[44px] w-full rounded-panel border border-borde bg-crema px-3 pr-9 text-cuerpo text-texto focus-visible:border-primario focus-visible:shadow-foco disabled:opacity-70 aria-invalid:border-rosa-profundo aria-invalid:inset-ring aria-invalid:inset-ring-rosa-profundo",
        className,
      )}
      {...props}
    />
  );
}
