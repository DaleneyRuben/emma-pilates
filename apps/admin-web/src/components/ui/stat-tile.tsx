import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * FIX-091: one figure at the top of a page (Comentarios' counters, Informes'
 * three and four numbers). Crema with an Arcilla border; `emphasis` makes it
 * the Palo de rosa block with Crema text, for the one figure that leads.
 */
export function StatTile({
  label,
  figure,
  line,
  emphasis = false,
  children,
}: {
  label: string;
  figure: string;
  line?: ReactNode;
  emphasis?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-marco border px-4 py-3.5",
        emphasis
          ? "border-palo-de-rosa bg-palo-de-rosa text-crema"
          : "border-arcilla bg-crema text-rosa-profundo",
      )}
    >
      <h2 className="font-sans text-etiqueta-campo font-semibold tracking-[0.14em] uppercase">
        {label}
      </h2>
      <p className="font-serif text-cifra-grande leading-tight whitespace-nowrap tabular">
        {figure}
      </p>
      {line === undefined ? null : <div className="text-nota">{line}</div>}
      {children}
    </section>
  );
}

/** Lays the tiles side by side from md up, stacked at phone width. */
export function StatTiles({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:auto-cols-fr md:grid-flow-col md:grid-cols-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
