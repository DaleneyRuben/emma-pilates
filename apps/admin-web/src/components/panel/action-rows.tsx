import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

// FIX-091 (W7 B): a panel's actions gathered at its end, one row each with a
// chevron, under the same spaced capitals and Arcilla frame as SummaryBlock.
export function ActionList({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {title}
      </h3>
      <ul
        aria-label={title}
        className="flex flex-col divide-y divide-divisor overflow-hidden rounded-marco border border-borde bg-lino"
      >
        {children}
      </ul>
    </section>
  );
}

/** One action of an ActionList; the dialog it opens renders beside it. */
export function ActionRow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-nota text-texto hover:bg-hover-fila focus-visible:shadow-foco"
      >
        {label}
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {children}
    </li>
  );
}
