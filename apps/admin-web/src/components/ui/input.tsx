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
        "h-[44px] w-full rounded-panel border-[1.5px] border-borde-fuerte bg-superficie px-3 tipo-cuerpo text-texto tabular focus-visible:border-primario focus-visible:shadow-foco disabled:bg-superficie-hundida disabled:border-borde aria-invalid:border-2 aria-invalid:border-primario",
        className,
      )}
      {...props}
    />
  );
}
