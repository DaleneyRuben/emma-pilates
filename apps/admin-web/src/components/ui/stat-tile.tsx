import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const tones = {
  destacado: "bg-destacado text-sobre-primario shadow-destacado",
  medio: "bg-medio text-sobre-primario",
  tarjeta: "bg-superficie text-texto shadow-tarjeta",
} as const;

type StatTileProps = {
  label: string;
  figure: string;
} & (
  | {
      tone?: "destacado" | "tarjeta";
      line?: ReactNode;
      children?: ReactNode;
    }
  | {
      /**
       * A Palo de rosa block carries large white text only (rule 3), so it
       * takes no small line and no children.
       */
      tone: "medio";
      line?: never;
      children?: never;
    }
);

/**
 * FIX-091, Rosa Emma (rw.py kpis), follow-up 285: the one KPI of the admin
 * web. The row leads with the Rosa profundo block (`destacado`, its
 * `etiqueta` on 600); a Palo de rosa block (`medio`) carries large white
 * text only, so its label sits under the figure in `destacado`; the rest are
 * white cards. The figure is `cifra-grande` (28 px below md).
 */
export function StatTile({
  label,
  figure,
  line,
  tone = "tarjeta",
  children,
}: StatTileProps) {
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
      {medio ? null : <h2 className="tipo-etiqueta">{label}</h2>}
      <p className="tipo-cifra-grande whitespace-nowrap">{figure}</p>
      {medio ? <h2 className="tipo-destacado">{label}</h2> : null}
      {line === undefined ? null : (
        <div className="flex flex-col gap-1 tipo-secundario">{line}</div>
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
