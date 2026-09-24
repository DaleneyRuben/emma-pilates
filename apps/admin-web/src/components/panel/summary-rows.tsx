import type { ReactNode } from "react";

// Read-only rows on Superficie (AW22, AW29): a panel that summarizes a record
// instead of editing it.
export function SummaryBlock({
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
      <dl className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
        {children}
      </dl>
    </section>
  );
}

export function SummaryRow({
  label,
  children,
  figure = false,
}: {
  label: string;
  children: ReactNode;
  /** Money and counts in Lora with tabular figures. */
  figure?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2">
      <dt className="text-nota text-texto-tenue">{label}</dt>
      <dd
        className={
          figure
            ? "text-right font-serif text-[15px] text-texto tabular"
            : "text-right text-nota text-texto"
        }
      >
        {children}
      </dd>
    </div>
  );
}
