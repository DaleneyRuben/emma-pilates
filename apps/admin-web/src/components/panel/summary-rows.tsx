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
      <h3 className="tipo-etiqueta text-texto">{title}</h3>
      <dl className="flex flex-col divide-y divide-borde rounded-tarjeta bg-superficie shadow-tarjeta">
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
  /** Money and counts, stressed as a row title with tabular figures. */
  figure?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2">
      <dt className="tipo-secundario text-texto">{label}</dt>
      <dd
        className={
          figure
            ? "text-right tipo-titulo-fila text-texto tabular"
            : "text-right tipo-compacto text-texto"
        }
      >
        {children}
      </dd>
    </div>
  );
}
