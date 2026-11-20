import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const tones = {
  destacado: "bg-destacado text-blanco shadow-destacado",
  medio: "bg-medio text-blanco",
  tarjeta: "bg-superficie text-texto shadow-tarjeta",
} as const;

/**
 * FIX-091, Rosa Emma (rw.py kpis): one figure at the top of a page. The row
 * leads with the Rosa profundo block (`destacado`, its 11 px label on 600);
 * a Palo de rosa block (`medio`) carries large white text only, so its
 * label sits under the figure at 19 px bold; the rest are white cards.
 */
export function StatTile({
  label,
  figure,
  line,
  tone = "tarjeta",
  children,
}: {
  label: string;
  figure: string;
  line?: ReactNode;
  tone?: keyof typeof tones;
  children?: ReactNode;
}) {
  const medio = tone === "medio";
  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-tarjeta px-5 py-[18px]",
        medio && "justify-end gap-0.5",
        tones[tone],
      )}
    >
      {medio ? null : (
        <h2 className="font-sans text-etiqueta font-bold tracking-[0.14em] uppercase">
          {label}
        </h2>
      )}
      <p className="font-serif text-cifra-grande leading-tight whitespace-nowrap tabular">
        {figure}
      </p>
      {medio ? (
        <h2 className="font-sans text-grande leading-tight font-bold">
          {label}
        </h2>
      ) : null}
      {line === undefined ? null : (
        <div className="flex flex-col gap-1 text-nota">{line}</div>
      )}
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
        "grid grid-cols-2 gap-3 md:auto-cols-fr md:grid-flow-col md:grid-cols-none md:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
