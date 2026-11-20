import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[88px] w-full rounded-panel border-[1.5px] border-borde-fuerte bg-superficie px-3 py-2 text-cuerpo text-texto placeholder:text-texto focus-visible:border-primario focus-visible:shadow-foco aria-invalid:border-2 aria-invalid:border-primario",
        className,
      )}
      {...props}
    />
  );
}
