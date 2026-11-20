import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Follow-up 285: the one empty message. A white card, centred: an optional
 * first line in `titulo-fila`, then the explanation in `cuerpo` and an
 * optional action. Never Lora (rule 1) and never loose on the page 100.
 */
export function EmptyState({
  title,
  children,
  action,
  bare = false,
  className,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Inside a card that is already white (a table body, a panel). */
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 px-6 py-10 text-center text-texto",
        !bare && "rounded-tarjeta bg-superficie shadow-tarjeta",
        className,
      )}
    >
      {title === undefined ? null : <p className="tipo-titulo-fila">{title}</p>}
      {children === undefined ? null : (
        <div className="tipo-cuerpo">{children}</div>
      )}
      {action === undefined ? null : <div className="mt-3">{action}</div>}
    </div>
  );
}
