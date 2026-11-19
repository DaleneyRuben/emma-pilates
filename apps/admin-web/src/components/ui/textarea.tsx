import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[88px] w-full rounded-panel border border-borde bg-crema px-3 py-2 text-cuerpo text-texto placeholder:text-texto-muy-tenue focus-visible:border-primario focus-visible:shadow-foco aria-invalid:border-rosa-profundo aria-invalid:inset-ring aria-invalid:inset-ring-rosa-profundo",
        className,
      )}
      {...props}
    />
  );
}
