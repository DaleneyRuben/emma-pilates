import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Follow-up 285: an error about a page, a list or an action, in
 * `titulo-fila` after a «!», inside a 50 box with an Arcilla ring, so it is
 * never small text loose on the page 100 (rule 3). A field's own error is
 * FormMessage (`secundario`).
 */
export function InlineError({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <p
      role="alert"
      id={id}
      className={cn(
        "rounded-[16px] bg-aviso px-[18px] py-3.5 tipo-titulo-fila text-texto inset-ring-[1.5px] inset-ring-borde-fuerte",
        className,
      )}
    >
      <span aria-hidden="true">! </span>
      {children}
    </p>
  );
}
