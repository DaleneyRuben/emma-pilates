import { useId, useState } from "react";
import { countFormat } from "../components/table/pagination";
import { formatMonth } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { formatBolivianos } from "../lib/money";
import { chartScale, type ReportMonth } from "./report-range";

const axisLabel = (centavos: number) =>
  `Bs ${countFormat.format(centavos / 100)}`;

const shortMonth = (month: string) => {
  const name = formatMonth(month);
  return `${name.charAt(0).toLocaleUpperCase("es")}${name.slice(1, 3)}`;
};

const describe = (month: ReportMonth) =>
  `${formatMonth(month.month)}: ingresos ${formatBolivianos(month.incomeCentavos)}, gastos ${formatBolivianos(month.expensesCentavos)}`;

function Legend() {
  return (
    <ul className="flex items-center gap-4 text-nota text-texto-secundario">
      {[
        ["Ingresos", "bg-exito"],
        ["Gastos", "bg-error"],
      ].map(([label, tone]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-sm", tone)}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * AW16's "Mes por mes": paired flat bars per Bolivia month on one linear
 * scale with three reference lines, no gradients and no value on every bar
 * (design README). The closed palette's Éxito and Error are close for
 * deuteranopes, so the legend names them, a 2 px gap parts each pair, every
 * month reads its figures on hover or focus, and the month table below is
 * the exact view.
 */
export function MonthChart({ months }: { months: readonly ReportMonth[] }) {
  const titleId = useId();
  const [active, setActive] = useState<string | null>(null);
  const { topCentavos, ticksCentavos } = chartScale(
    Math.max(
      ...months.flatMap((month) => [
        month.incomeCentavos,
        month.expensesCentavos,
      ]),
    ),
  );
  const height = (centavos: number) => `${(centavos / topCentavos) * 100}%`;
  const shown = months.find((month) => month.month === active);

  return (
    <figure
      aria-labelledby={titleId}
      className="m-0 flex flex-col gap-4 rounded-tarjeta border border-borde bg-blanco px-5 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="text-titulo-panel text-texto">
            Mes por mes
          </h2>
          <p className="text-nota text-texto-tenue">
            Ingresos y gastos comparados por mes, en bolivianos
          </p>
        </div>
        <Legend />
      </div>
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="relative h-48 w-[72px] shrink-0 text-ayuda text-texto-muy-tenue tabular"
        >
          {ticksCentavos.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: height(tick) }}
            >
              {axisLabel(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative h-48">
            {ticksCentavos.map((tick) => (
              <span
                key={tick}
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-divisor"
                style={{ bottom: height(tick) }}
              />
            ))}
            <div className="absolute inset-0 flex">
              {months.map((month) => (
                <div
                  key={month.month}
                  role="img"
                  aria-label={describe(month)}
                  tabIndex={0}
                  onMouseEnter={() => setActive(month.month)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(month.month)}
                  onBlur={() => setActive(null)}
                  className="flex flex-1 items-end justify-center gap-0.5 rounded-control hover:bg-hover-fila focus-visible:shadow-foco"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-exito"
                    style={{ height: height(month.incomeCentavos) }}
                  />
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-error"
                    style={{ height: height(month.expensesCentavos) }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="flex pt-2">
            {months.map((month) => (
              <span
                key={month.month}
                className="flex-1 text-center text-ayuda text-texto-tenue"
              >
                {shortMonth(month.month)}
              </span>
            ))}
          </div>
          {shown === undefined ? null : (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-0 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-control border border-borde bg-blanco px-3 py-2 text-nota text-texto shadow-popover tabular"
            >
              <span className="font-medium">{formatMonth(shown.month)}</span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm bg-exito"
                />
                {`Ingresos ${formatBolivianos(shown.incomeCentavos)}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm bg-error"
                />
                {`Gastos ${formatBolivianos(shown.expensesCentavos)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
