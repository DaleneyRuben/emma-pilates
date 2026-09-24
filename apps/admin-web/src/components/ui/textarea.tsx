import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[88px] w-full rounded-control border border-borde-fuerte bg-blanco px-3 py-2 text-cuerpo text-texto placeholder:text-texto-muy-tenue focus-visible:border-primario focus-visible:shadow-foco aria-invalid:border-error",
        className,
      )}
      {...props}
    />
  );
}
