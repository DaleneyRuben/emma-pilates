import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { PageHeader } from "../components/page/page-header";
import { MonthStepper } from "../components/table/month-stepper";
import { addMonths, boliviaMonth } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";
import { IndicatorChart } from "./indicator-chart";
import { hasAmounts, monthKpisQueryOptions } from "./indicator-queries";
import { RecommendationsSection } from "../recommendations/recommendations-page";
import { MonthNarrative } from "./month-narrative";
import { StatTile, StatTiles } from "../components/ui/stat-tile";

const tenths = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function IndicatorsPage({ readOnly = false }: { readOnly?: boolean }) {
  const latest = boliviaMonth();
  const [month, setMonth] = useState(latest);
  const series = [addMonths(month, -2), addMonths(month, -1), month];
  const queries = useQueries({
    queries: series.map((item) => monthKpisQueryOptions(item)),
  });
  const data = queries[2]?.data;
  const failed = queries.find((query) => query.isError);

  return (
    <article className="flex flex-col gap-6">
      <PageHeader
        title="El mes"
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
      ) : data === undefined ? (
        <LoadingNotice>Cargando los indicadores…</LoadingNotice>
      ) : (
        <StatTiles>
          <StatTile label="Ocupación" figure={`${data.occupancyPercent} %`} />
          <StatTile
            label="Clientas por clase"
            figure={tenths.format(data.averageStudentsTimes10 / 10)}
          />
          <StatTile
            label="Clientas activas"
            figure={String(data.activeClients)}
          />
          <StatTile label="Renovación" figure={`${data.renewalPercent} %`} />
        </StatTiles>
      )}
      {/* FIX-091 (W6 B): what to do comes right after the four figures. */}
      <RecommendationsSection month={month} readOnly={readOnly} />
      {failed !== undefined || data === undefined ? null : (
        <>
          {hasAmounts(data) ? (
            <StatTiles>
              <StatTile
                label="Cobrado"
                figure={formatBolivianos(data.cashCentavos)}
              />
              <StatTile
                label="Devengado"
                figure={formatBolivianos(data.accruedCentavos)}
              />
              <StatTile
                label="Diferido"
                figure={formatBolivianos(data.deferredCentavos)}
              />
            </StatTiles>
          ) : null}
          {data.sessionsHeld === 0 ? (
            <p className="rounded-marco border border-borde bg-lino px-6 py-10 text-center text-cuerpo text-texto-secundario">
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
          <MonthNarrative month={month} />
        </>
      )}
    </article>
  );
}
