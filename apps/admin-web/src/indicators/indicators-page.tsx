import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { PageHeader } from "../components/page/page-header";
import { MonthStepper } from "../components/table/month-stepper";
import { addMonths, boliviaMonth } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";
import { IndicatorChart } from "./indicator-chart";
import { hasAmounts, monthKpisQueryOptions } from "./indicator-queries";

const tenths = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Tile({ name, figure }: { name: string; figure: string }) {
  return (
    <section
      aria-label={name}
      className="flex flex-col gap-1 rounded-tarjeta border border-borde bg-blanco px-5 py-4"
    >
      <h2 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {name}
      </h2>
      <p className="font-serif text-[28px] leading-tight text-texto tabular">
        {figure}
      </p>
    </section>
  );
}

export function IndicatorsPage() {
  const latest = boliviaMonth();
  const [month, setMonth] = useState(latest);
  const series = [addMonths(month, -2), addMonths(month, -1), month];
  const queries = useQueries({
    queries: series.map((item) => monthKpisQueryOptions(item)),
  });
  const current = queries[2];
  const failed = queries.find((query) => query.isError);

  return (
    <article className="flex flex-col gap-6">
      <PageHeader
        title="Indicadores"
        subtitle="Asistencia, ocupación y clientas del mes"
        actions={
          <MonthStepper month={month} latest={latest} onChange={setMonth} />
        }
      />
      {failed !== undefined ? (
        <QueryFailure
          error={failed.error}
          what="los indicadores"
          onRetry={() => {
            for (const query of queries) void query.refetch();
          }}
        />
      ) : current?.data === undefined ? (
        <LoadingNotice>Cargando los indicadores…</LoadingNotice>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Tile
              name="Ocupación"
              figure={`${current.data.occupancyPercent} %`}
            />
            <Tile
              name="Alumnas por clase"
              figure={tenths.format(current.data.averageStudentsTimes10 / 10)}
            />
            <Tile
              name="Clientas activas"
              figure={String(current.data.activeClients)}
            />
            <Tile
              name="Renovación"
              figure={`${current.data.renewalPercent} %`}
            />
          </div>
          {hasAmounts(current.data) ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Tile
                name="Cobrado"
                figure={formatBolivianos(current.data.cashCentavos)}
              />
              <Tile
                name="Devengado"
                figure={formatBolivianos(current.data.accruedCentavos)}
              />
              <Tile
                name="Diferido"
                figure={formatBolivianos(current.data.deferredCentavos)}
              />
            </div>
          ) : null}
          {current.data.sessionsHeld === 0 ? (
            <p className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario">
              Sin clases dictadas en este mes.
            </p>
          ) : (
            <IndicatorChart
              points={series.map((item, index) => ({
                month: item,
                sessionsHeld: queries[index]?.data?.sessionsHeld ?? 0,
              }))}
            />
          )}
        </>
      )}
    </article>
  );
}
